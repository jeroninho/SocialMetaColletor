import { signToken, type JwtPayload } from "../../src/utils/jwt.js";

export function bearerForUser(payload: Partial<JwtPayload> & { sub: string }): string {
  const full: JwtPayload = {
    sub: payload.sub,
    email: payload.email ?? "user@example.com",
    nome: payload.nome ?? "Test User",
  };
  return `Bearer ${signToken(full)}`;
}
