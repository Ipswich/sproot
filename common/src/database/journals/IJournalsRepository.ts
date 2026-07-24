/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBJournal } from "@sproot/common/src/database/SDBJournal";
import { SDBJournalEntry } from "@sproot/common/src/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/common/src/database/SDBJournalEntryTag";
import { SDBJournalEntryTagLookup } from "@sproot/common/src/database/SDBJournalEntryTagLookup";
import { SDBJournalTag } from "@sproot/common/src/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/common/src/database/SDBJournalTagLookup";

export interface IJournalsRepository {
  getAllAsync(): Promise<SDBJournal[]>;
  getByIdAsync(id: number): Promise<SDBJournal[]>;
  addAsync(
    name: string,
    description: string | null,
    icon: string | null,
    color: string | null,
    startDate?: string | null,
  ): Promise<number>;
  updateAsync(journal: SDBJournal): Promise<void>;
  deleteAsync(id: number): Promise<void>;

  getJournalTagsAsync(): Promise<SDBJournalTag[]>;
  addJournalTagAsync(name: string, color: string | null): Promise<number>;
  updateJournalTagAsync(tag: SDBJournalTag): Promise<void>;
  deleteJournalTagAsync(id: number): Promise<void>;

  getJournalTagLookupsAsync(): Promise<SDBJournalTagLookup[]>;
  addJournalTagLookupAsync(journalId: number, tagId: number): Promise<number>;
  deleteJournalTagLookupAsync(journalId: number, tagId: number): Promise<void>;

  getJournalEntriesAsync(journalId: number, withContent?: boolean): Promise<SDBJournalEntry[]>;
  getJournalEntryAsync(entryId: number, withContent?: boolean): Promise<SDBJournalEntry[]>;
  addJournalEntryAsync(
    journalId: number,
    name: string | null,
    text: string,
    createdAt?: string | null,
  ): Promise<number>;
  updateJournalEntryAsync(entry: SDBJournalEntry): Promise<void>;
  deleteJournalEntryAsync(id: number): Promise<void>;

  getJournalEntryTagsAsync(): Promise<SDBJournalEntryTag[]>;
  addJournalEntryTagAsync(name: string, color: string | null): Promise<number>;
  updateJournalEntryTagAsync(tag: SDBJournalEntryTag): Promise<void>;
  deleteJournalEntryTagAsync(id: number): Promise<void>;

  getJournalEntryTagLookupsAsync(): Promise<SDBJournalEntryTagLookup[]>;
  addJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<number>;
  deleteJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<void>;
}

export class MockJournalsRepository implements IJournalsRepository {
  async getAllAsync(): Promise<SDBJournal[]> {
    return [];
  }
  async getByIdAsync(_id: number): Promise<SDBJournal[]> {
    return [];
  }
  async addAsync(
    _name: string,
    _description: string | null,
    _icon: string | null,
    _color: string | null,
    _startDate?: string | null,
  ): Promise<number> {
    return 0;
  }
  async updateAsync(_journal: SDBJournal): Promise<void> {
    return;
  }
  async deleteAsync(_id: number): Promise<void> {
    return;
  }

  async getJournalTagsAsync(): Promise<SDBJournalTag[]> {
    return [];
  }
  async addJournalTagAsync(_name: string, _color: string | null): Promise<number> {
    return 0;
  }
  async updateJournalTagAsync(_tag: SDBJournalTag): Promise<void> {
    return;
  }
  async deleteJournalTagAsync(_id: number): Promise<void> {
    return;
  }

  async getJournalTagLookupsAsync(): Promise<SDBJournalTagLookup[]> {
    return [];
  }
  async addJournalTagLookupAsync(_journalId: number, _tagId: number): Promise<number> {
    return 0;
  }
  async deleteJournalTagLookupAsync(_journalId: number, _tagId: number): Promise<void> {
    return;
  }

  async getJournalEntriesAsync(
    _journalId: number,
    _withContent?: boolean,
  ): Promise<SDBJournalEntry[]> {
    return [];
  }
  async getJournalEntryAsync(_entryId: number, _withContent?: boolean): Promise<SDBJournalEntry[]> {
    return [];
  }
  async addJournalEntryAsync(
    _journalId: number,
    _name: string | null,
    _text: string,
    _createdAt?: string | null,
  ): Promise<number> {
    return 0;
  }
  async updateJournalEntryAsync(_entry: SDBJournalEntry): Promise<void> {
    return;
  }
  async deleteJournalEntryAsync(_id: number): Promise<void> {
    return;
  }

  async getJournalEntryTagsAsync(): Promise<SDBJournalEntryTag[]> {
    return [];
  }
  async addJournalEntryTagAsync(_name: string, _color: string | null): Promise<number> {
    return 0;
  }
  async updateJournalEntryTagAsync(_tag: SDBJournalEntryTag): Promise<void> {
    return;
  }
  async deleteJournalEntryTagAsync(_id: number): Promise<void> {
    return;
  }

  async getJournalEntryTagLookupsAsync(): Promise<SDBJournalEntryTagLookup[]> {
    return [];
  }
  async addJournalEntryTagLookupAsync(_journalEntryId: number, _tagId: number): Promise<number> {
    return 0;
  }
  async deleteJournalEntryTagLookupAsync(_journalEntryId: number, _tagId: number): Promise<void> {
    return;
  }
}
