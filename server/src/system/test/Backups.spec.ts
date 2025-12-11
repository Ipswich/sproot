import { Backups } from "../../system/Backups";
import winston from "winston";
import { assert } from "chai";
import { tmpdir } from "os";
import { mkdtemp } from "fs/promises";
import path from "path";
import fs from "fs";

describe("Backups.ts", () => {
  let logger: winston.Logger;

  before(() => {
    logger = winston.createLogger({
      transports: [new winston.transports.Console({ silent: true })],
    });
  });

  describe("getByFileNameAsync", () => {
    it("should return null for non-existing file", async () => {
      const result = await Backups.getByFileNameAsync("non-existing-file", logger);
      assert.isNull(result);
    });

    it("should return file stream and size for existing file", async () => {
      const tempDir = await mkdtemp(path.join(tmpdir(), "test-backup-"));
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const tempFile = tempDir + "/test-backup-file.sproot.gz";
      fs.writeFileSync(tempFile, "test data");

      const result = await Backups.getByFileNameAsync("test-backup-file", logger, tempDir);
      assert.isNotNull(result);
      assert.equal(result!.name, "test-backup-file.sproot.gz");
      assert.equal(result!.size, fs.statSync(tempFile).size);
    });
  });

  describe("getFileNamesAsync", () => {
    it("should return an array of file names with the suffix `sproot.gz`", async () => {
      const tempDir = await mkdtemp(path.join(tmpdir(), "test-backup-"));
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      fs.writeFileSync(tempDir + "/backup1.sproot.gz", "data1");
      fs.writeFileSync(tempDir + "/backup2.sproot.gz", "data2");
      fs.writeFileSync(tempDir + "/backup3.gz", "data3");
      fs.writeFileSync(tempDir + "/backup4.sql.gz", "data4");

      const result = await Backups.getFileNamesAsync(tempDir);
      assert.isArray(result);
      assert.lengthOf(result, 2);
      assert.includeMembers(result, ["backup1", "backup2"]);
    });

    it("should return an empty array if no backup files exist", async () => {
      const tempDir = await mkdtemp(path.join(tmpdir(), "test-backup-"));
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      const result = await Backups.getFileNamesAsync(tempDir);
      assert.isArray(result);
      assert.lengthOf(result, 0);
    });

    it("should return an empty array for non-existing directory", async () => {
      const result = await Backups.getFileNamesAsync("/non/existing/directory");
      assert.isArray(result);
      assert.lengthOf(result, 0);
    });
  });

  describe("runRetentionPolicyAsync", () => {
    it("should delete files older than retention days", async () => {
      const tempDir = await mkdtemp(path.join(tmpdir(), "test-backup-"));
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const oldFile = tempDir + "/old-backup.sproot.gz";
      const newFile = tempDir + "/new-backup.sproot.gz";
      fs.writeFileSync(oldFile, "old data");
      fs.writeFileSync(newFile, "new data");

      // Set the mtime of the old file to 31 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      fs.utimesSync(oldFile, oldDate, oldDate);

      await Backups.runRetentionPolicyAsync(logger, tempDir, "30");

      assert.isFalse(fs.existsSync(oldFile), "Old backup file should be deleted");
      assert.isTrue(fs.existsSync(newFile), "New backup file should not be deleted");
    });
  });
});
