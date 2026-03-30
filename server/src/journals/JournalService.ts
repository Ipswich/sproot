import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import JournalManager from "./managers/JournalManager";
import JournalTagManager from "./managers/JournalTagManager";
import EntryManager from "./managers/EntryManager";
import EntryTagManager from "./managers/EntryTagManager";

export class JournalService {
  journalManager: JournalManager;
  journalTagManager: JournalTagManager;
  entryManager: EntryManager;
  entryTagManager: EntryTagManager;

  constructor(sprootDB: ISprootDB) {
    this.journalManager = new JournalManager(sprootDB);
    this.journalTagManager = new JournalTagManager(sprootDB);
    this.entryManager = new EntryManager(sprootDB);
    this.entryTagManager = new EntryTagManager(sprootDB);
  }
}

export default JournalService;
