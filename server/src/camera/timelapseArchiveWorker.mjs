import fs from "fs";
import path from "path";
import { create } from "tar";
import { parentPort, workerData } from "worker_threads";

async function generateTimelapseArchive() {
  try {
    // Use the directories passed from the main thread
    const { archiveDirectory, timelapseDirectory } = workerData;

    await fs.promises.mkdir(archiveDirectory, { recursive: true });
    const archiveFile = path.join(archiveDirectory, "timelapse.tar");

    // Report starting
    parentPort?.postMessage({
      type: "log",
      level: "info",
      message: `Creating timelapse archive: ${archiveFile}`,
    });
    parentPort?.postMessage({ type: "progress", value: 0 });

    if (!fs.existsSync(timelapseDirectory)) {
      parentPort?.postMessage({
        type: "log",
        level: "warn",
        message: `Timelapse directory ${timelapseDirectory} does not exist`,
      });
      parentPort?.postMessage({ type: "complete", success: true });
      return;
    }

    const files = await fs.promises.readdir(timelapseDirectory);
    const imageFiles = files.filter(
      (file) => file.endsWith(".jpg") && fs.statSync(path.join(timelapseDirectory, file)).isFile(),
    );

    if (imageFiles.length === 0) {
      parentPort?.postMessage({
        type: "log",
        level: "info",
        message: "No timelapse images found to archive",
      });
      parentPort?.postMessage({ type: "complete", success: true });
      return;
    }

    let processedFiles = 0;
    const totalFiles = imageFiles.length;
    const startTime = Date.now();

    await create(
      {
        gzip: false,
        file: archiveFile,
        cwd: timelapseDirectory,
        filter: (_path, _stat) => {
          processedFiles++;
          const progressPercentage = Math.round((processedFiles / totalFiles) * 100);
          parentPort?.postMessage({ type: "progress", value: progressPercentage });

          if (processedFiles % 100 === 0 || processedFiles === totalFiles) {
            parentPort?.postMessage({
              type: "log",
              level: "info",
              message: `Processed ${processedFiles} of ${totalFiles} files (${progressPercentage}%)`,
            });
          }
          return true;
        },
      },
      imageFiles,
    );

    const elapsedTime = (Date.now() - startTime) / 1000;

    parentPort?.postMessage({
      type: "log",
      level: "debug",
      message: `Timelapse archive created in ${archiveFile} in ${elapsedTime.toFixed(2)}s`,
    });

    parentPort?.postMessage({
      type: "log",
      level: "info",
      message: `Successfully created timelapse archive with ${imageFiles.length} images`,
    });

    parentPort?.postMessage({ type: "complete", success: true });
  } catch (error) {
    parentPort?.postMessage({
      type: "log",
      level: "error",
      message: `Failed to create timelapse archive: ${error instanceof Error ? error.message : String(error)}`,
    });

    parentPort?.postMessage({ type: "progress", value: -1 });
    parentPort?.postMessage({ type: "complete", success: false });
  }
}

// Start the archive generation when worker is loaded
generateTimelapseArchive();
