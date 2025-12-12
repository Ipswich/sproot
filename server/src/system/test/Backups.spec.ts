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

  describe("getCompletedFileNamesAsync", () => {
    it("should return an array of file names with the suffix `sproot.gz`", async () => {
      const tempDir = await mkdtemp(path.join(tmpdir(), "test-backup-"));
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      fs.writeFileSync(tempDir + "/backup1.sproot.gz", "data1");
      fs.writeFileSync(tempDir + "/backup2.sproot.gz", "data2");
      fs.writeFileSync(tempDir + "/backup3.gz", "data3");
      fs.writeFileSync(tempDir + "/backup4.sql.gz", "data4");

      const result = await Backups.getCompletedFileNamesAsync(tempDir);
      assert.isArray(result);
      assert.lengthOf(result, 2);
      assert.includeMembers(result, ["backup1", "backup2"]);
    });

    // it('should not include files created during an ongoing backup', async () => {
    //   const tempDir = await mkdtemp(path.join(tmpdir(), "test-backup-"));
    //   if (!fs.existsSync(tempDir)) {
    //     fs.mkdirSync(tempDir);
    //   }
    //   const sprootDBMock = new MockSprootDB();
    //   function deferred<T>() {
    //     let resolve!: (value: T | PromiseLike<T>) => void;
    //     let reject!: (reason?: any) => void;

    //     const promise = new Promise<T>((res, rej) => {
    //       resolve = res;
    //       reject = rej;
    //     })

    //     return { promise, resolve, reject };
    //   }
    //   const backupDeferred = deferred<void>();

    //   sinon
    //     .stub(sprootDBMock, "backupDatabaseAsync")
    //     .callsFake(async () => {
    //       await Promise.resolve();
    //       fs.writeFileSync(tempDir + "/new-file.sproot.gz", "test data");

    //       return backupDeferred.promise;
    //     });

    //   const existingFile = tempDir + "/started-here.sproot.gz";
    //   fs.writeFileSync(existingFile, "test data");

    //   // Start the backup process
    //   assert.isFalse(Backups.isGeneratingBackup)
    //   const createPromise = Backups.createAsync(sprootDBMock, logger);

    //   // Allow the backup to start (and grab files)
    //   await Promise.resolve();
    //   assert.isTrue(Backups.isGeneratingBackup)
    //   const result = await Backups.getCompletedFileNamesAsync(tempDir);
    //   backupDeferred.resolve();

    //   // Wait for the backup to finish
    //   await createPromise;
    //   assert.isFalse(Backups.isGeneratingBackup)
    //   assert.isArray(result);
    //   assert.lengthOf(result, 1);
    //   assert.includeMembers(result, ["started-here"]);
    // });

    it("should return file names sorted by modification time descending", async () => {
      const tempDir = await mkdtemp(path.join(tmpdir(), "test-backup-"));
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      const file1 = tempDir + "/backup1.sproot.gz";
      const file2 = tempDir + "/backup2.sproot.gz";
      const file3 = tempDir + "/backup3.sproot.gz";

      fs.writeFileSync(file1, "data1");
      await new Promise((r) => setTimeout(r, 10)); // Ensure different mtime
      fs.writeFileSync(file2, "data2");
      await new Promise((r) => setTimeout(r, 10)); // Ensure different mtime
      fs.writeFileSync(file3, "data3");

      const result = await Backups.getCompletedFileNamesAsync(tempDir);
      assert.isArray(result);
      assert.lengthOf(result, 3);
      assert.deepEqual(result, ["backup3", "backup2", "backup1"]);
    });

    it("should return an empty array if no backup files exist", async () => {
      const tempDir = await mkdtemp(path.join(tmpdir(), "test-backup-"));
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      const result = await Backups.getCompletedFileNamesAsync(tempDir);
      assert.isArray(result);
      assert.lengthOf(result, 0);
    });

    it("should return an empty array for non-existing directory", async () => {
      const result = await Backups.getCompletedFileNamesAsync("/non/existing/directory");
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
