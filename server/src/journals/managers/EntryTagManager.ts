import { SDBJournalEntryTag } from "@sproot/common/database/SDBJournalEntryTag";
import { IEntryTagsRepository } from "../../database/repositories/journals/tags/IEntryTagsRepository";

export default class EntryTagManager {
  #entriesRepository: IEntryTagsRepository;
  constructor(entriesRepository: IEntryTagsRepository) {
    this.#entriesRepository = entriesRepository;
  }

  getTagsAsync(): Promise<SDBJournalEntryTag[]> {
    return this.#entriesRepository.getTagsAsync();
  }

  createTagAsync(name: string, color: string | null = null): Promise<number> {
    return this.#entriesRepository.addTagAsync(name, color);
  }

  updateTagAsync(tag: SDBJournalEntryTag): Promise<void> {
    return this.#entriesRepository.updateTagAsync(tag);
  }

  deleteTagAsync(id: number): Promise<void> {
    return this.#entriesRepository.deleteTagAsync(id);
  }
}
