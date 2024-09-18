import {
  TextInput,
  Button,
  ScrollArea,
  Group,
  Modal,
  NativeSelect,
} from "@mantine/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addAutomationAsync, deleteAutomationAsync, updateAutomationAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { IAutomation } from "@sproot/automation/IAutomation";
import { Fragment } from "react/jsx-runtime";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import ConditionsTable from "./Conditions/ConditionsTable";

interface EditAutomationModalProps {
  existingAutomation: IAutomation | null;
  modalOpened: boolean;
  closeModal: () => void;
  setAutomationsAsStale: (isStale: boolean) => void;
}

export default function EditAutomationModal({
  existingAutomation: existingAutomation,
  modalOpened: modalOpened,
  closeModal: closeModal,
  setAutomationsAsStale: setAutomationsAsStale,
}: EditAutomationModalProps) {
  const queryClient = useQueryClient();
  const editAutomationForm = useForm({
    initialValues: {
      name: "",
      operator: "or",
    },

    validate: {
      name: (value) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Name must be between 1 and 64 characters",
      operator: (value) =>
        value === "or" || value === "and"
          ? null
          : "Operator must be either 'or' or 'and'",
    },
  });

  const [automation, setAutomation] = useState<IAutomation | null>(existingAutomation);
  useEffect(() => {
    setAutomation(existingAutomation);
    editAutomationForm.setFieldValue("name", existingAutomation?.name ?? "");
    editAutomationForm.setFieldValue("operator", existingAutomation?.operator ?? "or");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAutomation]);

  const addAutomationMutation = useMutation({
    mutationFn: async (newAutomationValues: IAutomation) => {
      const newAutomation = await addAutomationAsync(newAutomationValues.name, newAutomationValues.operator);
      setAutomation(newAutomation)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conditions"] });
      setAutomationsAsStale(true);
    },
  });

  const updateAutomationMutation = useMutation({
    mutationFn: async (updatedAutomationValues: IAutomation) => {
      await updateAutomationAsync(updatedAutomationValues.id, updatedAutomationValues.name, updatedAutomationValues.operator);
      setAutomation(updatedAutomationValues);
    },
    onSettled: () => {
      setAutomationsAsStale(true);
    },
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteAutomationAsync(id);
    },
    onSettled: () => {
      setAutomationsAsStale(true);
    },
  });

  return (
    <Fragment>
      <meta name="viewport" content="width=device-width, user-scalable=no" />
      <Modal
        radius="md"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        opened={modalOpened}
        onClose={closeModal}
        title={automation ? "Edit Automation" : "Add Automation"}
      >
        <form
          onSubmit={editAutomationForm.onSubmit(async (values) => {
            if (automation) {
              updateAutomationMutation.mutate({ id: automation.id, ...values } as IAutomation);
              return;
            }
            addAutomationMutation.mutate(values as IAutomation);
          })}
        >
          <TextInput
            maxLength={64}
            label="Name"
            required
            {...editAutomationForm.getInputProps("name")}
          />
          <NativeSelect
            data={[
              { value: "or", label: "Or" },
              { value: "and", label: "And" },
            ]}
            label="Condition Group Interaction"
            required
            {...editAutomationForm.getInputProps("operator")}
          />
          {automation != null ?
            <Fragment>
              <ConditionsTable automationId={automation.id}/>
              <Group justify="space-between" mt="md">
                <Button
                  color="red"
                  onClick={() => {
                    deleteAutomationMutation.mutate(automation.id);
                    closeModal();
                  }}
                >
                  Delete
                </Button>
                <Button type="submit">Update</Button>
              </Group>
            </Fragment>
            : <Group justify="flex-end" mt="md">
              <Button type="submit">Add</Button>
            </Group>
          }
        </form>

      </Modal>
    </Fragment>
  )
}