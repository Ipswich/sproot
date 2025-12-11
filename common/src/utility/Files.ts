import fs from "fs";
import path from "path";

/**
 * Gets the total size of a directory's contents in bytes
 */
export async function getDirectorySizeAsync(directoryPath: string): Promise<number> {
  // Ensure the directory exists
  if (!fs.existsSync(directoryPath)) {
    return 0;
  }

  let totalSize = 0;
  const items = await fs.promises.readdir(directoryPath);

  // Process each item (file or subdirectory)
  for (const item of items) {
    const itemPath = path.join(directoryPath, item);
    const stats = await fs.promises.stat(itemPath);

    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      totalSize += await getDirectorySizeAsync(itemPath);
    }
  }

  return totalSize;
}

export async function sortDirectoryByStatsAsync(
  directoryPath: string,
  sort: (
    a: {
      file: string;
      stats: fs.Stats;
    },
    b: {
      file: string;
      stats: fs.Stats;
    },
  ) => number,
) {
  try {
    // Ensure the directory exists
    if (!fs.existsSync(directoryPath)) {
      return null;
    }

    // Get all files in the directory
    const files = await fs.promises.readdir(directoryPath);

    if (files.length === 0) {
      return null;
    }

    // Sort files
    let fileStats = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(directoryPath, file);
        const stats = await fs.promises.stat(filePath);
        return { file, stats };
      }),
    );
    fileStats = fileStats.filter((file) => file.stats.isFile()).sort(sort);

    return fileStats.map((f) => path.join(directoryPath, f.file));
  } catch (error) {
    return null;
  }
}

export async function getSortedFileAsync(
  directoryPath: string,
  sort: (
    a: {
      file: string;
      stats: fs.Stats;
    },
    b: {
      file: string;
      stats: fs.Stats;
    },
  ) => number,
) {
  const sortedFiles = await sortDirectoryByStatsAsync(directoryPath, sort);
  return sortedFiles && sortedFiles[0] ? sortedFiles[0] : null;
}

export async function getOldestFilePathAsync(directoryPath: string): Promise<string | null> {
  return await getSortedFileAsync(
    directoryPath,
    (a, b) => a.stats.mtime.getTime() - b.stats.mtime.getTime(),
  );
}

export function createTimeStampSuffix(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}-${hours}-${minutes}`;
}
