import { SDBJournalEntry } from "@sproot/sproot-common/dist/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import { SDBJournalEntryDeviceData } from "@sproot/sproot-common/dist/database/SDBJournalEntryDeviceData";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";

export default class EntryManager {
  #sprootDB: ISprootDB;
  constructor(sprootDB: ISprootDB) {
    this.#sprootDB = sprootDB;
  }

  async getAsync(
    journalId?: number,
    entryId?: number,
  ): Promise<Array<{ entry: SDBJournalEntry; tags: SDBJournalEntryTag[] }>> {
    let entries: SDBJournalEntry[] = [];
    if (journalId != null) {
      entries = await this.#sprootDB.getJournalEntriesAsync(journalId);
    } else if (entryId != null) {
      entries = await this.#sprootDB.getJournalEntryAsync(entryId);
    } else {
      return [];
    }

    const entryTagLookups = await this.#sprootDB.getJournalEntryTagLookupsAsync();
    const allEntryTags = await this.#sprootDB.getJournalEntryTagsAsync();

    const results: Array<{ entry: SDBJournalEntry; tags: SDBJournalEntryTag[] }> = [];
    for (const e of entries) {
      const entryTags = entryTagLookups
        .filter((l) => l.journalEntryId === e.id)
        .map((l) => allEntryTags.find((t) => t.id === l.tagId))
        .filter(Boolean) as SDBJournalEntryTag[];

      results.push({
        entry: e,
        tags: entryTags,
      });
    }

    return results;
  }

  createAsync(
    journalId: number,
    text: string,
    name?: string | null,
    createdAt?: Date | null,
  ): Promise<number> {
    return this.#sprootDB.addJournalEntryAsync(
      journalId,
      name ?? null,
      text,
      createdAt?.toISOString().slice(0, 19).replace("T", " ") ?? null,
    );
  }

  updateAsync(entry: SDBJournalEntry): Promise<void> {
    return this.#sprootDB.updateJournalEntryAsync(entry);
  }

  deleteAsync(entryId: number) {
    return this.#sprootDB.deleteJournalEntryAsync(entryId);
  }

  addTagAsync(entryId: number, tagId: number): Promise<number> {
    return this.#sprootDB.addJournalEntryTagLookupAsync(entryId, tagId);
  }

  removeTagAsync(entryId: number, tagId: number): Promise<void> {
    return this.#sprootDB.deleteJournalEntryTagLookupAsync(entryId, tagId);
  }

  getDeviceDataAsync(
    entryId: number,
    type?: "Sensor" | "Output",
  ): Promise<SDBJournalEntryDeviceData[]> {
    return this.#sprootDB.getJournalEntryDeviceDataAsync(entryId, type);
  }

  async attachSensorDataAsync(entryId: number, sensorId: number, start: Date, end: Date) {
    const sensor = await this.#sprootDB.getSensorAsync(sensorId);
    if (!sensor || sensor.length === 0) {
      throw new Error(`Sensor ${sensorId} not found`);
    }
    const since = ((end.getTime() - start.getTime()) / 1000) * 60;
    const readings = await this.#sprootDB.getSensorReadingsAsync(
      { id: sensorId },
      start,
      since,
      false,
    );

    const promises = readings.map((r) => {
      return this.#sprootDB.addJournalEntryDeviceDataAsync(
        entryId,
        sensor[0]!.name,
        "Sensor",
        r.data,
        r.units,
        r.logTime,
      );
    });

    return Promise.all(promises);
  }

  async detachSensorDataAsync(entryId: number, sensorId: number) {
    const sensor = await this.#sprootDB.getSensorAsync(sensorId);
    if (!sensor || sensor.length === 0) {
      throw new Error(`Sensor ${sensorId} not found`);
    }
    return this.#sprootDB.deleteJournalEntryDeviceDataAsync(entryId, sensor[0]!.name, "Sensor");
  }

  async attachOutputDataAsync(entryId: number, outputId: number, start: Date, end: Date) {
    const output = await this.#sprootDB.getOutputAsync(outputId);
    if (!output || output.length === 0) {
      throw new Error(`Output ${outputId} not found`);
    }
    const since = ((end.getTime() - start.getTime()) / 1000) * 60;
    const data = await this.#sprootDB.getOutputStatesAsync({ id: outputId }, start, since, false);

    const promises = data.map((d) => {
      return this.#sprootDB.addJournalEntryDeviceDataAsync(
        entryId,
        output[0]!.name,
        "Output",
        String(d.value),
        "%",
        d.logTime,
      );
    });

    return Promise.all(promises);
  }

  async detachOutputDataAsync(entryId: number, outputId: number) {
    const output = await this.#sprootDB.getOutputAsync(outputId);
    if (!output || output.length === 0) {
      throw new Error(`Output ${outputId} not found`);
    }
    return this.#sprootDB.deleteJournalEntryDeviceDataAsync(entryId, output[0]!.name, "Output");
  }
}
