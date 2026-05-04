import bcrypt from "bcrypt";

export interface FixtureUser {
  id: string;
  email: string;
  nome: string;
  senha: string;
  senhaHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function makeUser(
  overrides: Partial<Omit<FixtureUser, "senhaHash">> = {},
): Promise<FixtureUser> {
  const senha = overrides.senha ?? "correct-horse-battery-staple";
  const senhaHash = await bcrypt.hash(senha, 4); // low cost for tests
  const now = new Date("2025-01-01T00:00:00Z");
  return {
    id: overrides.id ?? "user_test_1",
    email: overrides.email ?? "test.user@example.com",
    nome: overrides.nome ?? "Test User",
    senha,
    senhaHash,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}
