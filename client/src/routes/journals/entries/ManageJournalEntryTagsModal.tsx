import ManageTagsModal from "../ManageTagsModal";
import {
  getJournalEntryTagsAsync,
  addJournalEntryTagAsync,
  updateJournalEntryTagAsync,
  deleteJournalEntryTagAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { SDBJournalEntryTag } from "@sproot/database/SDBJournalEntryTag";

interface ManageJournalEntryTagsModalProps {
  modalOpened: boolean;
  closeModal: () => void;
}

export default function ManageJournalEntryTagsModal({
  modalOpened,
  closeModal,
}: ManageJournalEntryTagsModalProps) {
  return (
    <ManageTagsModal
      modalOpened={modalOpened}
      closeModal={closeModal}
      title="Manage Entry Tags"
      queryKey={["journal-entry-tags"]}
      fetchFn={getJournalEntryTagsAsync}
      addFn={async (name: string, color?: string | null) =>
        addJournalEntryTagAsync(name, color)
      }
      updateFn={async (tag: SDBJournalEntryTag) =>
        updateJournalEntryTagAsync(tag)
      }
      deleteFn={async (id: number) => deleteJournalEntryTagAsync(id)}
    />
  );
}
