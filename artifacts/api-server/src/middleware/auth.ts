import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { verifyToken, type JwtPayload } from "../utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Missing or malformed Authorization header." });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token." });
  }
}

export async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized", message: "Missing or malformed Authorization header." });
    return;
  }

  const token = authHeader.slice(7);
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
  } catch {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token." });
    return;
  }

  if (payload.role === "admin") {
    req.user = payload;
    next();
    return;
  }

  // JWT issued before the user was promoted in the DB — fall back to a DB lookup
  // so role changes take effect without forcing a re-login.
  try {
    const [row] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1);

    if (row?.role === "admin") {
      req.user = { ...payload, role: "admin" };
      next();
      return;
    }

    res.status(403).json({ error: "forbidden", message: "Administrator access required." });
  } catch (err) {
    req.log?.error?.({ err }, "adminMiddleware DB lookup failed");
    res.status(500).json({ error: "internal_error" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(authHeader.slice(7));
    } catch {
      // ignore — user stays undefined
    }
  }
  next();
}
