import { IJournalsRepository } from "@sproot/common/database/journals/IJournalsRepository";
import JournalManager from "./managers/JournalManager";
import JournalTagManager from "./managers/JournalTagManager";
import EntryManager from "./managers/EntryManager";
import EntryTagManager from "./managers/EntryTagManager";

export class JournalService {
  journalManager: JournalManager;
  journalTagManager: JournalTagManager;
  entryManager: EntryManager;
  entryTagManager: EntryTagManager;

  constructor(journalsRepository: IJournalsRepository) {
    this.journalManager = new JournalManager(journalsRepository);
    this.journalTagManager = new JournalTagManager(journalsRepository);
    this.entryManager = new EntryManager(journalsRepository);
    this.entryTagManager = new EntryTagManager(journalsRepository);
  }
}

export default JournalService;
