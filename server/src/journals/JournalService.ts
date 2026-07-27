import { IJournalRepository } from "../database/repositories/journals/IJournalRepository";
import JournalManager from "./managers/JournalManager";
import JournalTagManager from "./managers/JournalTagManager";
import EntryManager from "./managers/EntryManager";
import EntryTagManager from "./managers/EntryTagManager";

export class JournalService {
  journalManager: JournalManager;
  journalTagManager: JournalTagManager;
  entryManager: EntryManager;
  entryTagManager: EntryTagManager;

  constructor(journalRepo: IJournalRepository) {
    this.journalManager = new JournalManager(journalRepo);
    this.entryManager = new EntryManager(journalRepo.entries);
    this.journalTagManager = new JournalTagManager(journalRepo.tags);
    this.entryTagManager = new EntryTagManager(journalRepo.entries.tags);
  }
}

export default JournalService;
