import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const generatorPath = path.join(repoRoot, "scripts", "generate-api-contracts.mjs");
const generatedRoot = path.join(repoRoot, "common", "src", "api", "generated");
const generatedHashPath = path.join(repoRoot, "common", "src", "api", "generated.sha256");

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const baselineHash = (await fs.readFile(generatedHashPath, "utf8")).trim();

  if (baselineHash.length === 0) {
    throw new Error("common/src/api/generated.sha256 is empty.");
  }

  await runGeneration();
  const firstHash = await hashDirectory(generatedRoot);

  await runGeneration();
  const secondHash = await hashDirectory(generatedRoot);

  if (firstHash !== secondHash) {
    throw new Error(
      [
        "Generated API contracts are nondeterministic.",
        `First hash: ${firstHash}`,
        `Second hash: ${secondHash}`,
      ].join("\n"),
    );
  }

  if (baselineHash !== secondHash) {
    throw new Error(
      [
        "Generated API contract drift detected.",
        "Run npm run generate:api-contracts and commit the updated generated files plus common/src/api/generated.sha256.",
        `Expected hash: ${baselineHash}`,
        `Actual hash: ${secondHash}`,
      ].join("\n"),
    );
  }

  console.log(`Verified API contract generation. Deterministic hash: ${firstHash}`);
}

async function hashDirectory(rootDir) {
  const filePaths = await listFiles(rootDir);
  const hash = createHash("sha256");

  for (const filePath of filePaths) {
    const relativePath = path.relative(rootDir, filePath).replaceAll(path.sep, "/");
    const fileContent = await fs.readFile(filePath);
    hash.update(relativePath);
    hash.update("\0");
    hash.update(fileContent);
    hash.update("\0");
  }

  return hash.digest("hex");
}

async function listFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const nestedEntries = await Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const fullPath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
          return listFiles(fullPath);
        }

        return [fullPath];
      }),
  );

  return nestedEntries.flat();
}

async function runGeneration() {
  const result = spawnSync(process.execPath, [generatorPath], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(stderr || stdout || "API contract generation failed.");
  }
}