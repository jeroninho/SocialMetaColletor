import { encryptToken } from "../../src/utils/crypto.js";

export interface FixtureToken {
  id: number;
  platform: string;
  accountName: string;
  accessToken: string;
  refreshToken: string | null;
  scope: string | null;
  connected: boolean;
  connectedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function makeToken(overrides: Partial<FixtureToken> = {}): FixtureToken {
  const now = new Date("2025-01-01T00:00:00Z");
  return {
    id: overrides.id ?? 1,
    platform: overrides.platform ?? "youtube",
    accountName: overrides.accountName ?? "Demo Channel",
    accessToken: overrides.accessToken ?? encryptToken("provider-access-token"),
    refreshToken: overrides.refreshToken ?? null,
    scope: overrides.scope ?? null,
    connected: overrides.connected ?? true,
    connectedAt: overrides.connectedAt ?? now,
    expiresAt: overrides.expiresAt ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}
