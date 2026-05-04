process.env["TOKEN_SECRET"] =
  process.env["TOKEN_SECRET"] ??
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env["DATABASE_URL"] =
  process.env["DATABASE_URL"] ?? "postgres://test:test@localhost:5432/test";
process.env["JWT_SECRET"] = process.env["JWT_SECRET"] ?? "test-jwt-secret";
process.env["NODE_ENV"] = process.env["NODE_ENV"] ?? "test";
delete process.env["REDIS_URL"];
delete process.env["YOUTUBE_API_KEY"];
