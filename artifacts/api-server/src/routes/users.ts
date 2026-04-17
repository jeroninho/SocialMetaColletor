import { Router } from "express";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken } from "../utils/jwt.js";
import { z } from "zod";

const router = Router();

const SALT_ROUNDS = 12;

const RegisterBody = z.object({
  email: z.string().email("E-mail inválido").max(254),
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  senha: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(128),
});

const LoginBody = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1),
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

    await db.insert(usersTable).values({ id, email: email.toLowerCase(), nome, senhaHash });

    const token = signToken({ sub: id, email: email.toLowerCase(), nome });

    res.status(201).json({ message: "Conta criada com sucesso.", token, user: { id, email: email.toLowerCase(), nome } });
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
