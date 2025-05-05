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
  ActionIcon,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  addAutomationAsync,
  deleteAutomationAsync,
  getAutomationsAsync,
  getOutputsAsync,
  updateAutomationAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import {
  AutomationOperator,
  IAutomation,
} from "@sproot/automation/IAutomation";
import { Fragment } from "react/jsx-runtime";
import { useForm } from "@mantine/form";
import ConditionsTable from "./Conditions/ConditionsTable";
import OutputActionsTable from "./Actions/OutputActionsTable";
import { useEffect } from "react";
import { IconDeviceFloppy } from "@tabler/icons-react";

interface EditAutomationModalProps {
  editAutomation: IAutomation | null;
  setTargetAutomation: (automation: IAutomation | null) => void;
  modalOpened: boolean;
  closeModal: () => void;
  readOnly?: boolean;
}

export default function EditAutomationModal({
  editAutomation: targetAutomation,
  setTargetAutomation: setTargetAutomation,
  modalOpened: modalOpened,
  closeModal: closeModal,
  readOnly = false,
}: EditAutomationModalProps) {
  const mutateAutomationForm = useForm({
    initialValues: {
      name: targetAutomation?.name ?? "",
      operator: targetAutomation?.operator ?? "or",
    },
    validate: {
      name: (value: string) =>
        value.length > 0 && value.length <= 64
          ? null
          : "Name must be between 1 and 64 characters",
      operator: (value: string) =>
        value === "or" || value === "and"
          ? null
          : "Operator must be either 'or' or 'and'",
    },
  });

  useEffect(() => {
    setTargetAutomation(targetAutomation);
    mutateAutomationForm.setValues({
      name: targetAutomation?.name ?? "",
      operator: targetAutomation?.operator ?? "or",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAutomation]);

  const addAutomationMutation = useMutation({
    mutationFn: (newAutomationValues: IAutomation) => {
      return addAutomationAsync(
        newAutomationValues.name,
        newAutomationValues.operator,
      );
    },
    onSuccess: (data) => {
      getAutomationsQuery.refetch();
      setTargetAutomation(data);
    },
  });

  const updateAutomationMutation = useMutation({
    mutationFn: (updatedAutomationValues: IAutomation) => {
      return updateAutomationAsync(
        updatedAutomationValues.id,
        updatedAutomationValues.name,
        updatedAutomationValues.operator,
      );
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
      setTargetAutomation(null);
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
          closeModal();
          mutateAutomationForm.setValues({
            name: targetAutomation?.name ?? "",
            operator: targetAutomation?.operator ?? "or",
          });
        }}
        title={
          readOnly ? (
            <Title order={4}>{targetAutomation?.name}</Title>
          ) : targetAutomation ? (
            "Edit"
          ) : (
            "Add New"
          )
        }
      >
        <form
          id="add-automation-form"
          onSubmit={mutateAutomationForm.onSubmit((values) => {
            addAutomationMutation.mutate(values as IAutomation);
          })}
        >
          {readOnly ? null : (
            <Fragment>
              <Title order={4}>Name</Title>
              <TextInput
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                rightSection={
                  targetAutomation == null ? null : (
                    <ActionIcon
                      onClick={() => {
                        updateAutomationMutation.mutate({
                          id: targetAutomation.id,
                          operator: targetAutomation.operator,
                          name: mutateAutomationForm.values.name,
                          lastRunTime: null,
                        });
                      }}
                    >
                      <IconDeviceFloppy />
                    </ActionIcon>
                  )
                }
                maxLength={64}
                required
                {...mutateAutomationForm.getInputProps("name")}
              />
            </Fragment>
          )}
        </form>
        {targetAutomation != null ? (
          <Fragment>
            <Group justify="space-around">
              <Accordion
                defaultValue={readOnly ? ["Conditions", "Actions"] : []}
                multiple={true}
                w={"100%"}
              >
                <Accordion.Item key={"Conditions"} value="Conditions">
                  <Accordion.Control pl={"0px"}>
                    <Title order={4}>
                      Conditions{" "}
                      {readOnly
                        ? `(${targetAutomation.operator == "or" ? "match any group" : "match all groups"})`
                        : null}
                    </Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {targetAutomation.id == null ? null : (
                      <Fragment>
                        {readOnly ? null : (
                          <Fragment>
                            <SegmentedControl
                              size="xs"
                              readOnly={readOnly}
                              color={"blue"}
                              w={"100%"}
                              radius="md"
                              data={[
                                { value: "or", label: "Match Any Group" },
                                { value: "and", label: "Match All Groups" },
                              ]}
                              {...mutateAutomationForm.getInputProps(
                                "operator",
                              )}
                              onChange={(value) => {
                                updateAutomationMutation.mutate({
                                  id: targetAutomation.id,
                                  operator: value as AutomationOperator,
                                  name: targetAutomation.name,
                                  lastRunTime: null,
                                });
                                mutateAutomationForm.setFieldValue(
                                  "operator",
                                  value as AutomationOperator,
                                );
                              }}
                            />
                            <Space h={12} />
                          </Fragment>
                        )}
                        <ConditionsTable
                          automationId={targetAutomation.id}
                          readOnly={readOnly}
                        />
                      </Fragment>
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item key={"Actions"} value="Actions">
                  <Accordion.Control pl={"0px"}>
                    <Title order={4}>Actions</Title>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {getOutputsQuery.data == null ||
                    Object.keys(getOutputsQuery.data).length === 0 ? null : (
                      <OutputActionsTable
                        automationId={targetAutomation.id}
                        outputs={Object.values(getOutputsQuery.data ?? {})}
                        readOnly={readOnly}
                      />
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Group>
            {readOnly ? null : (
              <Group justify="space-between" mt="md">
                <Button
                  color="red"
                  onClick={() => {
                    deleteAutomationMutation.mutate(targetAutomation.id);
                    closeModal();
                  }}
                >
                  Delete
                </Button>
              </Group>
            )}
          </Fragment>
        ) : (
          <Fragment>
            {readOnly ? null : (
              <Group justify="flex-end" mt="md">
                <Button type="submit" form="add-automation-form">
                  Next
                </Button>
              </Group>
            )}
          </Fragment>
        )}
      </Modal>
    </Fragment>
  );
}
