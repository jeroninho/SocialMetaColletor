import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  email: string;
  nome: string;
  role: string;
}

function getSecret(): string {
  const s = process.env["JWT_SECRET"];
  if (!s) throw new Error("JWT_SECRET env var is not set");
  return s;
}

export function signToken(payload: JwtPayload): string {
  const expiresIn = (process.env["JWT_EXPIRES_IN"] ?? "1h") as jwt.SignOptions["expiresIn"];
  return jwt.sign(payload, getSecret(), { expiresIn, algorithm: "HS256" });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
  return decoded as JwtPayload;
}
