import { SDBJournal } from "@sproot/common/database/SDBJournal";
import { IEntriesRepository } from "./entries/IEntriesRepository";
import { IJournalTagsRepository } from "./tags/IJournalTagsRepository";

export interface IJournalRepository {
  getAllAsync(): Promise<SDBJournal[]>;
  getByIdAsync(id: number): Promise<SDBJournal[]>;
  addAsync(
    title: string,
    description: string | null,
    icon: string | null,
    color: string | null,
    startDate?: string | null,
  ): Promise<number>;
  updateAsync(journal: SDBJournal): Promise<void>;
  deleteAsync(id: number): Promise<void>;

  entries: IEntriesRepository;
  tags: IJournalTagsRepository;
}
