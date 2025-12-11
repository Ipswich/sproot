import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import {
  getDirectorySizeAsync,
  getSortedFileAsync,
  getOldestFilePathAsync,
  createTimeStampSuffix,
} from "../Files";

describe("Files Utility", () => {
  // Base temp directory for all tests
  const testDir = path.join(os.tmpdir(), "sproot-files-test");

  beforeEach(async () => {
    // Create test directory
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
    await fs.promises.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory after each test
    if (fs.existsSync(testDir)) {
      await fs.promises.rm(testDir, { recursive: true, force: true });
    }
  });

  describe("getDirectorySizeAsync", () => {
    it("should return 0 if directory does not exist", async () => {
      const nonExistentDir = path.join(testDir, "does-not-exist");

      const size = await getDirectorySizeAsync(nonExistentDir);

      assert.strictEqual(size, 0);
    });

    it("should calculate size of a directory with only files", async () => {
      // Create test files with known sizes
      const file1 = path.join(testDir, "file1.txt");
      const file2 = path.join(testDir, "file2.txt");

      await fs.promises.writeFile(file1, "x".repeat(100));
      await fs.promises.writeFile(file2, "x".repeat(200));

      const size = await getDirectorySizeAsync(testDir);

      assert.strictEqual(size, 300);
    });

    it("should calculate size of a directory with subdirectories", async () => {
      // Create subdirectory and files
      const subdir = path.join(testDir, "subdir");
      await fs.promises.mkdir(subdir);

      const file1 = path.join(testDir, "file1.txt");
      const file2 = path.join(subdir, "file2.txt");

      await fs.promises.writeFile(file1, "x".repeat(100));
      await fs.promises.writeFile(file2, "x".repeat(200));

      const size = await getDirectorySizeAsync(testDir);

      assert.strictEqual(size, 300);
    });
  });

  describe("getSortedFileAsync", () => {
    it("should return null if directory does not exist", async () => {
      const nonExistentDir = path.join(testDir, "does-not-exist");

      const result = await getSortedFileAsync(nonExistentDir, () => 0);

      assert.strictEqual(result, null);
    });

    it("should return null if directory is empty", async () => {
      // Directory exists but is empty
      const result = await getSortedFileAsync(testDir, () => 0);

      assert.strictEqual(result, null);
    });

    it("should only consider files, not directories when sorting", async () => {
      // Create a subdirectory and files
      const subdir = path.join(testDir, "subdir");
      await fs.promises.mkdir(subdir);

      const file1 = path.join(testDir, "file1.txt");
      const file2 = path.join(testDir, "file2.txt");

      await fs.promises.writeFile(file1, "content1");
      await fs.promises.writeFile(file2, "content2");

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 172800000); // 2 days ago

      await fs.promises.utimes(file1, now, now);
      await fs.promises.utimes(file2, now, now);
      await fs.promises.utimes(subdir, twoDaysAgo, twoDaysAgo);

      // Sort by modification time (oldest first)
      const sortFunction = (a: { stats: fs.Stats }, b: { stats: fs.Stats }) =>
        a.stats.mtime.getTime() - b.stats.mtime.getTime();

      const result = await getSortedFileAsync(testDir, sortFunction);

      assert.notStrictEqual(result, subdir);
      assert(result === file1 || result === file2);

      const stats = await fs.promises.stat(result!);
      assert.strictEqual(stats.isFile(), true);
    });

    it("should sort files using the provided sort function", async () => {
      // Create files with different sizes
      const file1 = path.join(testDir, "file1.txt");
      const file2 = path.join(testDir, "file2.txt");
      const file3 = path.join(testDir, "file3.txt");

      await fs.promises.writeFile(file1, "x".repeat(300));
      await fs.promises.writeFile(file2, "x".repeat(100));
      await fs.promises.writeFile(file3, "x".repeat(200));

      // Sort by size (ascending)
      const sortFunction = (a: { stats: fs.Stats }, b: { stats: fs.Stats }) =>
        a.stats.size - b.stats.size;

      const result = await getSortedFileAsync(testDir, sortFunction);

      assert.strictEqual(result, file2); // file2 is smallest (100 bytes)
    });

    it("should handle errors and return null", async () => {
      // Create directory with no read permissions
      const noAccessDir = path.join(testDir, "no-access");
      await fs.promises.mkdir(noAccessDir);
      await fs.promises.chmod(noAccessDir, 0);

      const result = await getSortedFileAsync(noAccessDir, () => 0);

      assert.strictEqual(result, null);
    });
  });

  describe("getOldestFilePathAsync", () => {
    it("should return the oldest file based on modification time", async () => {
      // Some paths
      const newerFile = path.join(testDir, "newer.txt");
      const middleFile = path.join(testDir, "middle.txt");
      const oldestFile = path.join(testDir, "oldest.txt");

      await fs.promises.writeFile(newerFile, "newest");
      await fs.promises.writeFile(middleFile, "middle");
      await fs.promises.writeFile(oldestFile, "oldest");

      // Set modification times
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 86400000); // 1 day ago
      const twoDaysAgo = new Date(now.getTime() - 172800000); // 2 days ago

      await fs.promises.utimes(newerFile, now, now);
      await fs.promises.utimes(middleFile, oneDayAgo, oneDayAgo);
      await fs.promises.utimes(oldestFile, twoDaysAgo, twoDaysAgo);

      const result = await getOldestFilePathAsync(testDir);

      assert.strictEqual(result, oldestFile);
    });

    it("should return null if directory does not exist", async () => {
      const nonExistentDir = path.join(testDir, "does-not-exist");

      const result = await getOldestFilePathAsync(nonExistentDir);

      assert.strictEqual(result, null);
    });
  });

  describe("createTimeStampSuffix", () => {
    it("should create a timestamp suffix in the correct format", () => {
      const date = new Date(2024, 5, 15, 13, 45, 30);
      const expectedSuffix = "2024-06-1-13-45";

      const result = createTimeStampSuffix(date);
      assert.strictEqual(result, expectedSuffix);
    });
  });
});
