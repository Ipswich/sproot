process.env["NODE_ENV"] = "test";
process.env["DATABASE_CLIENT"] = "pg";
process.env["DATABASE_HOST"] =
  process.env["TEST_DATABASE_HOST"] ?? process.env["TARGET_DATABASE_HOST"] ?? "127.0.0.1";
process.env["DATABASE_PORT"] =
  process.env["TEST_DATABASE_PORT"] ?? process.env["TARGET_DATABASE_PORT"] ?? "5432";
process.env["DATABASE_USER"] =
  process.env["TEST_DATABASE_USER"] ?? process.env["TARGET_DATABASE_USER"] ?? "postgres";
process.env["DATABASE_PASSWORD"] =
  process.env["TEST_DATABASE_PASSWORD"] ?? process.env["TARGET_DATABASE_PASSWORD"] ?? "root";

if (process.env["TEST_DATABASE_NAME"] != null) {
  process.env["DATABASE_NAME"] = process.env["TEST_DATABASE_NAME"];
}

process.env["INTERSERVICE_AUTHENTICATION_KEY"] ??= "test";
