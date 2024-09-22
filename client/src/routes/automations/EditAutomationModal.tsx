import {
  TextInput,
  Button,
  ScrollArea,
  Group,
  Modal,
  SegmentedControl,
  Space,
  Title,
  Accordion,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { addAutomationAsync, deleteAutomationAsync, getAutomationsAsync, getOutputsAsync, updateAutomationAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { IAutomation } from "@sproot/automation/IAutomation";
import { Fragment } from "react/jsx-runtime";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
import ConditionsTable from "./Conditions/ConditionsTable";
import OutputActionsTable from "./Actions/OutputActionsTable";

interface EditAutomationModalProps {
  existingAutomation: IAutomation | null;
  modalOpened: boolean;
  closeModal: () => void;
}

export default function EditAutomationModal({
  existingAutomation: existingAutomation,
  modalOpened: modalOpened,
  closeModal: closeModal,
}: EditAutomationModalProps) {
  const [automation, setAutomation] = useState<IAutomation | null>(existingAutomation);

  const mutateAutomationForm = useForm({
    mode: "uncontrolled",
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

  if (existingAutomation) {
    mutateAutomationForm.setInitialValues({name: existingAutomation.name, operator: existingAutomation.operator});
    mutateAutomationForm.setFieldValue("name", existingAutomation.name);
    mutateAutomationForm.setFieldValue("operator", existingAutomation.operator);
  } else {
    mutateAutomationForm.setInitialValues({name: "", operator: "or"});
    mutateAutomationForm.setFieldValue("name", "");
    mutateAutomationForm.setFieldValue("operator", "or");
  }

  useEffect(() => {
    setAutomation(existingAutomation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAutomation]);

  const addAutomationMutation = useMutation({
    mutationFn: (newAutomationValues: IAutomation) => {
      console.log(newAutomationValues);
      return addAutomationAsync(newAutomationValues.name, newAutomationValues.operator);
    },
    onSuccess: (data) => {
      getAutomationsQuery.refetch();
      setAutomation(data);
    }
  });

  const updateAutomationMutation = useMutation({
    mutationFn: (updatedAutomationValues: IAutomation) => {
      console.log(updatedAutomationValues);
      return updateAutomationAsync(updatedAutomationValues.id, updatedAutomationValues.name, updatedAutomationValues.operator);
      // setAutomation(updatedAutomationValues);
    },
    onSettled: () => {
      getAutomationsQuery.refetch();
    },
  });

  const deleteAutomationMutation = useMutation({
    mutationFn: (id: number) => {
      return deleteAutomationAsync(id);
    },
    onSettled: () => {
      setAutomation(null);
      getAutomationsQuery.refetch();
      closeModal();
    },
  });

  const getAutomationsQuery = useQuery({
    queryKey: ["automations"],
    queryFn: () => getAutomationsAsync(),
  });

  const getOutputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: () => getOutputsAsync(),
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
        onClose={() => {
          closeModal()
        }}
        title={automation ? "Edit Automation" : "Add Automation"}
      >
        <form
          id="add-automation-form"
          onSubmit={mutateAutomationForm.onSubmit((values) => {
            console.log("new")
            console.log(values)
            addAutomationMutation.mutate(values as IAutomation);
          })}
        >
          <Title order={4}>Name</Title>
          <TextInput
            maxLength={64}
            required
            {...mutateAutomationForm.getInputProps("name")}
          />
        </form>
        {automation != null ?
          <Fragment>
            <form
              id="edit-automation-form"
              onSubmit={mutateAutomationForm.onSubmit((values) => {
                updateAutomationMutation.mutate({ id: automation.id, ...values } as IAutomation);
              })}
            >
              <Space h="xs" />
              <Group>
                <SegmentedControl
                  color={"blue"}
                  w={"100%"}
                  radius="md"
                  data={[
                    { value: "or", label: "Or" },
                    { value: "and", label: "And" },
                  ]}
                  {...mutateAutomationForm.getInputProps("operator")}
                  onChange={(value) => { mutateAutomationForm.setFieldValue("operator", value) }}
                />
              </Group>
            </form>
            <Group justify="space-around">
              <Accordion defaultValue={["Conditions"]} multiple={true} w={"100%"}>
                <Accordion.Item key={"Conditions"} value="Conditions">
                  <Accordion.Control pl={"0px"}>
                    <Title order={4}>Conditions</Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <ConditionsTable automationId={automation.id} />
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item key={"Jobs"} value="Jobs">
                  <Accordion.Control pl={"0px"}>
                    <Title order={4}>Actions</Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {getOutputsQuery.data == null || Object.keys(getOutputsQuery.data).length === 0 ?
                      null :
                      (<OutputActionsTable automationId={automation.id} outputs={Object.values(getOutputsQuery.data ?? {})} />)
                    }
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Group>
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
              <Button type="submit" form="edit-automation-form">Update</Button>
            </Group>
          </Fragment>
          : <Group justify="flex-end" mt="md">
            <Button type="submit" form="add-automation-form">Add</Button>
          </Group>
        }
      </Modal>
    </Fragment>
  )
}