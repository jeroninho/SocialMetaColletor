import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db, usersTable, verificationCodesTable } from "@workspace/db";
import { signToken } from "../utils/jwt.js";
import { z } from "zod";

const router = Router();

const SALT_ROUNDS = 12;
const CODE_EXPIRY_MINUTES = 10;

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

async function createAndLogCode(email: string, userId: string | null, type: "register" | "login"): Promise<string> {
  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  await db
    .update(verificationCodesTable)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(verificationCodesTable.email, email.toLowerCase()),
        eq(verificationCodesTable.type, type),
        isNull(verificationCodesTable.usedAt),
      ),
    );

  await db.insert(verificationCodesTable).values({
    userId,
    email: email.toLowerCase(),
    code,
    type,
    expiresAt,
  });

  console.log(`\n========================================`);
  console.log(`VERIFICATION CODE for ${email.toLowerCase()}`);
  console.log(`Code: ${code}`);
  console.log(`Type: ${type}`);
  console.log(`Expires at: ${expiresAt.toISOString()}`);
  console.log(`========================================\n`);

  return code;
}

const RegisterBody = z.object({
  email: z.string().email("E-mail inválido").max(254),
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  senha: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(128),
});

const LoginBody = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1),
});

const SendCodeBody = z.object({
  email: z.string().email("E-mail inválido"),
  type: z.enum(["register", "login"]),
});

const VerifyCodeBody = z.object({
  email: z.string().email("E-mail inválido"),
  code: z.string().length(6, "Código deve ter 6 dígitos"),
  type: z.enum(["register", "login"]),
});

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", issues: parsed.error.issues });
    return;
  }

  const { email, nome, senha } = parsed.data;

  try {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "conflict", message: "Este e-mail já está cadastrado." });
      return;
    }

    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const id = uuidv4();

    await db.insert(usersTable).values({ id, email: email.toLowerCase(), nome, senhaHash, emailVerificado: false });

    await createAndLogCode(email, id, "register");

    res.status(201).json({
      message: "Conta criada. Verifique seu e-mail para ativar sua conta.",
      requiresVerification: true,
      email: email.toLowerCase(),
    });
  } catch (err) {
    req.log.error({ err }, "Error registering user");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", issues: parsed.error.issues });
    return;
  }

  const { email, senha } = parsed.data;

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      await bcrypt.hash("dummy_to_prevent_timing_attack", SALT_ROUNDS);
      res.status(401).json({ error: "invalid_credentials", message: "E-mail ou senha incorretos." });
      return;
    }

    const valid = await bcrypt.compare(senha, user.senhaHash);
    if (!valid) {
      res.status(401).json({ error: "invalid_credentials", message: "E-mail ou senha incorretos." });
      return;
    }

    if (!user.emailVerificado) {
      await createAndLogCode(email, user.id, "register");
      res.status(403).json({
        error: "email_not_verified",
        message: "Seu e-mail ainda não foi verificado. Enviamos um novo código de verificação.",
        requiresVerification: true,
        email: user.email,
      });
      return;
    }

    const token = signToken({ sub: user.id, email: user.email, nome: user.nome });

    res.json({
      message: "Login realizado com sucesso.",
      token,
      user: { id: user.id, email: user.email, nome: user.nome },
    });
  } catch (err) {
    req.log.error({ err }, "Error during login");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/auth/send-code", async (req, res) => {
  const parsed = SendCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", issues: parsed.error.issues });
    return;
  }

  const { email, type } = parsed.data;

  try {
    if (!checkRateLimit(`send-code:${email.toLowerCase()}`)) {
      res.status(429).json({ error: "rate_limit", message: "Muitas tentativas. Aguarde um momento antes de tentar novamente." });
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id, emailVerificado: usersTable.emailVerificado })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      res.json({ message: "Se o e-mail estiver cadastrado, você receberá um código." });
      return;
    }

    if (type === "register" && user.emailVerificado) {
      res.json({ message: "Se o e-mail estiver cadastrado, você receberá um código." });
      return;
    }

    await createAndLogCode(email, user.id, type);

    res.json({ message: "Código enviado para seu e-mail." });
  } catch (err) {
    req.log.error({ err }, "Error sending verification code");
    res.status(500).json({ error: "internal_error" });
  }
});

router.post("/auth/verify-code", async (req, res) => {
  const parsed = VerifyCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", issues: parsed.error.issues });
    return;
  }

  const { email, code, type } = parsed.data;

  try {
    if (!checkRateLimit(`verify-code:${email.toLowerCase()}`)) {
      res.status(429).json({ error: "rate_limit", message: "Muitas tentativas. Aguarde um momento antes de tentar novamente." });
      return;
    }

    const [record] = await db
      .select()
      .from(verificationCodesTable)
      .where(
        and(
          eq(verificationCodesTable.email, email.toLowerCase()),
          eq(verificationCodesTable.code, code),
          eq(verificationCodesTable.type, type),
          isNull(verificationCodesTable.usedAt),
          gt(verificationCodesTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!record) {
      res.status(400).json({ error: "invalid_code", message: "Código inválido ou expirado." });
      return;
    }

    await db
      .update(verificationCodesTable)
      .set({ usedAt: new Date() })
      .where(eq(verificationCodesTable.id, record.id));

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "not_found", message: "Usuário não encontrado." });
      return;
    }

    if (!user.emailVerificado) {
      await db
        .update(usersTable)
        .set({ emailVerificado: true, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
    }

    const token = signToken({ sub: user.id, email: user.email, nome: user.nome });

    res.json({
      message: "Verificação realizada com sucesso.",
      token,
      user: { id: user.id, email: user.email, nome: user.nome },
    });
  } catch (err) {
    req.log.error({ err }, "Error verifying code");
    res.status(500).json({ error: "internal_error" });
  }
});

router.get("/auth/me", async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, nome: usersTable.nome, createdAt: usersTable.createdAt })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.sub))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    res.json(user);
  } catch (err) {
    req.log.error({ err }, "Error fetching user");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
