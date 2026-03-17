import ManageTagsModal from "./ManageTagsModal";
import {
  getJournalTagsAsync,
  addJournalTagAsync,
  updateJournalTagAsync,
  deleteJournalTagAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { SDBJournalTag } from "@sproot/database/SDBJournalTag";

interface ManageJournalTagsModalProps {
  modalOpened: boolean;
  closeModal: () => void;
}

export default function ManageJournalTagsModal({ modalOpened, closeModal }: ManageJournalTagsModalProps) {
  return (
    <ManageTagsModal
      modalOpened={modalOpened}
      closeModal={closeModal}
      title="Manage Journal Tags"
      queryKey={["journal-tags"]}
      fetchFn={getJournalTagsAsync}
      addFn={async (name: string, color?: string | null) => addJournalTagAsync(name, color)}
      updateFn={async (tag: SDBJournalTag) => updateJournalTagAsync(tag)}
      deleteFn={async (id: number) => deleteJournalTagAsync(id)}
    />
  );
}
