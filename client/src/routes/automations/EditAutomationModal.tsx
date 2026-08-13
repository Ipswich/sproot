import {
  Badge,
  TextInput,
  Button,
  Collapse,
  ScrollArea,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Space,
  Switch,
  Text,
  Title,
  Accordion,
  ActionIcon,
  Divider,
  Box,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import AddActionWidget from "./Actions/AddActionWidget";
import OutputActionsTable from "./Actions/OutputActionsTable";
import NotificationActionsTable from "./Actions/NotificationActionsTable";
import { useEffect } from "react";
import {
  IconBolt,
  IconDeviceFloppy,
  IconPlus,
  IconSparkles,
  IconVectorBezier2,
  IconWaveSine,
  IconX,
} from "@tabler/icons-react";
import ConfirmDeleteButton from "../../components/ConfirmDeleteButton";

interface EditAutomationModalProps {
  editAutomation: IAutomation | null;
  setTargetAutomation: (automation: IAutomation | null) => void;
  modalOpened: boolean;
  closeModal: () => void;
  readOnly?: boolean;
  onClose?: () => void;
}

export default function EditAutomationModal({
  editAutomation: targetAutomation,
  setTargetAutomation: setTargetAutomation,
  modalOpened: modalOpened,
  closeModal: closeModal,
  readOnly = false,
  onClose,
}: EditAutomationModalProps) {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const [addActionOpened, { toggle: toggleAddAction, close: closeAddAction }] =
    useDisclosure(false);
  const [enabled, setEnabled] = useState(targetAutomation?.enabled ?? true);
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
    closeAddAction();
    setEnabled(targetAutomation?.enabled ?? true);
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
    onSuccess: (_data, variables) => {
      setTargetAutomation({
        ...(targetAutomation ?? ({} as IAutomation)),
        ...variables,
      });
    },
    onSettled: () => {
      getAutomationsQuery.refetch();
    },
  });

  const updateAutomationEnabledMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) => {
      return updateAutomationAsync(id, undefined, undefined, enabled);
    },
    onSettled: () => {
      getAutomationsQuery.refetch();
      getOutputsQuery.refetch();
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
      <Modal
        fullScreen={isMobile}
        size="xl"
        radius="md"
        padding={isMobile ? "md" : "lg"}
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        opened={modalOpened}
        onClose={() => {
          closeModal();
          closeAddAction();
          mutateAutomationForm.setValues({
            name: targetAutomation?.name ?? "",
            operator: targetAutomation?.operator ?? "or",
          });
          onClose?.();
        }}
        title={
          readOnly ? (
            <Title order={4}>Automation Details</Title>
          ) : targetAutomation ? (
            "Edit Automation"
          ) : (
            "Create Automation"
          )
        }
      >
        <Stack gap="md">
          <Paper withBorder radius="lg" p={isMobile ? "md" : "lg"}>
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs" align="center" wrap="wrap">
                    <Title order={3} lineClamp={2}>
                      {targetAutomation?.name ?? "New automation"}
                    </Title>
                    {targetAutomation ? null : (
                      <Badge variant="light" radius="sm">
                        Draft
                      </Badge>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed" mt={4}>
                    {readOnly
                      ? "Review the automation's current status, conditions, and actions."
                      : targetAutomation
                        ? "Adjust the trigger logic and actions below."
                        : "Start with a name. Once created, you can add conditions and actions."}
                  </Text>
                </Box>
                {targetAutomation && !readOnly ? (
                  <Stack>
                    <Paper withBorder radius="md" px="sm" py="xs">
                      <Group gap="sm" wrap="nowrap">
                        <Text fw={600} size="sm">
                          Active
                        </Text>
                        <Switch
                          size="md"
                          checked={enabled}
                          onLabel="On"
                          offLabel="Off"
                          withThumbIndicator={false}
                          onChange={(
                            event: React.ChangeEvent<HTMLInputElement>,
                          ) => {
                            const newEnabled = event.currentTarget.checked;
                            setEnabled(newEnabled);
                            updateAutomationEnabledMutation.mutate({
                              id: targetAutomation.id,
                              enabled: newEnabled,
                            });
                          }}
                        />
                      </Group>
                    </Paper>

                    {/* <Badge
                      color={enabled ? "green" : "gray"}
                      variant="light"
                      radius="sm"
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </Badge> */}
                  </Stack>
                ) : null}
              </Group>

              {readOnly ? null : (
                <form
                  id="add-automation-form"
                  onSubmit={mutateAutomationForm.onSubmit((values) => {
                    addAutomationMutation.mutate(values as IAutomation);
                  })}
                >
                  <Stack gap="xs">
                    <Text fw={600} size="sm">
                      Automation name
                    </Text>
                    <TextInput
                      size="md"
                      onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                      rightSection={
                        targetAutomation == null ? null : (
                          <ActionIcon
                            variant="light"
                            radius="xl"
                            onClick={() => {
                              updateAutomationMutation.mutate({
                                id: targetAutomation.id,
                                operator: targetAutomation.operator,
                                name: mutateAutomationForm.values.name,
                                enabled: targetAutomation.enabled,
                              });
                            }}
                          >
                            <IconDeviceFloppy size={18} />
                          </ActionIcon>
                        )
                      }
                      maxLength={64}
                      placeholder="Example: Vent fan on hot afternoons"
                      required
                      {...mutateAutomationForm.getInputProps("name")}
                    />
                    {targetAutomation == null ? (
                      <Group justify="flex-end" mt="xs">
                        <Button type="submit" form="add-automation-form">
                          Next
                        </Button>
                      </Group>
                    ) : null}
                  </Stack>
                </form>
              )}
            </Stack>
          </Paper>

          {targetAutomation != null ? (
            <Fragment>
              <Accordion
                defaultValue={
                  readOnly ? ["Conditions", "Actions"] : ["Conditions"]
                }
                multiple={true}
                variant="separated"
                radius="lg"
              >
                <Accordion.Item key={"Conditions"} value="Conditions">
                  <Accordion.Control>
                    <Group gap="sm" wrap="nowrap">
                      <ThemeIcon variant="light" radius="xl" size="lg">
                        <IconWaveSine size={18} />
                      </ThemeIcon>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600}>Conditions</Text>
                        <Text size="sm" c="dimmed">
                          {readOnly
                            ? targetAutomation.operator == "or"
                              ? "Triggers when any condition group matches."
                              : "Triggers when all condition groups match."
                            : "Manage the logic that decides when this automation runs."}
                        </Text>
                      </Box>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="md">
                      {readOnly ? null : (
                        <Paper withBorder radius="md" p="sm">
                          <Stack gap="xs">
                            <Text fw={600} size="sm">
                              Condition groups
                            </Text>
                            <Text size="sm" c="dimmed">
                              Choose whether this automation runs when any group
                              matches or when all groups match.
                            </Text>
                            <SegmentedControl
                              size="sm"
                              fullWidth
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
                                  enabled: targetAutomation.enabled,
                                });
                                mutateAutomationForm.setFieldValue(
                                  "operator",
                                  value as AutomationOperator,
                                );
                              }}
                            />
                          </Stack>
                        </Paper>
                      )}
                      <ConditionsTable
                        automationId={targetAutomation.id}
                        readOnly={readOnly}
                      />
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item key={"Actions"} value="Actions">
                  <Accordion.Control>
                    <Group gap="sm" wrap="nowrap">
                      <ThemeIcon variant="light" radius="xl" size="lg">
                        <IconVectorBezier2 size={18} />
                      </ThemeIcon>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600}>Actions</Text>
                        <Text size="sm" c="dimmed">
                          Pick what happens when this automation runs.
                        </Text>
                      </Box>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap="md">
                      <Paper withBorder radius="md" p="md">
                        <Stack gap="sm">
                          <Group
                            justify="space-between"
                            align="center"
                            wrap="wrap"
                          >
                            <Group gap="xs">
                              <ThemeIcon variant="light" radius="xl">
                                <IconBolt size={16} />
                              </ThemeIcon>
                              <div>
                                <Title order={5}>Output actions</Title>
                                <Text size="sm" c="dimmed">
                                  Control switches, relays, and PWM outputs.
                                </Text>
                              </div>
                            </Group>
                          </Group>
                          <Divider />
                          {getOutputsQuery.data == null ? (
                            <div>Loading...</div>
                          ) : (
                            <OutputActionsTable
                              automationId={targetAutomation.id}
                              outputs={Object.values(
                                getOutputsQuery.data ?? {},
                              )}
                              readOnly={readOnly}
                            />
                          )}
                        </Stack>
                      </Paper>
                      <Paper withBorder radius="md" p="md">
                        <Stack gap="sm">
                          <Group gap="xs">
                            <ThemeIcon variant="light" radius="xl">
                              <IconSparkles size={16} />
                            </ThemeIcon>
                            <div>
                              <Title order={5}>Notification actions</Title>
                              <Text size="sm" c="dimmed">
                                Trigger an in-app notification.
                              </Text>
                            </div>
                          </Group>
                          <Divider />
                          <NotificationActionsTable
                            automationId={targetAutomation.id}
                            readOnly={readOnly}
                          />
                        </Stack>
                      </Paper>
                      {readOnly ? null : (
                        <Paper withBorder radius="md" p="md">
                          <Stack gap="sm">
                            <Button
                              color="green"
                              onClick={toggleAddAction}
                              fullWidth
                              leftSection={
                                <BuilderToggleIcon opened={addActionOpened} />
                              }
                            >
                              {addActionOpened
                                ? "Hide Action Builder"
                                : "Show Action Builder"}
                            </Button>
                            <Collapse
                              expanded={addActionOpened}
                              transitionDuration={300}
                            >
                              <Space h={12} />
                              <AddActionWidget
                                automationId={targetAutomation.id}
                                outputs={Object.values(
                                  getOutputsQuery.data ?? {},
                                ).map((output) => ({
                                  id: output.id,
                                  parentOutputId: output.parentOutputId,
                                  isPwm: output.isPwm,
                                  name: output.name ?? "",
                                  actionWarnings: output.actionWarnings,
                                }))}
                                onSaved={closeAddAction}
                              />
                            </Collapse>
                          </Stack>
                        </Paper>
                      )}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>

              {readOnly ? null : (
                <Group justify="space-between" mt="sm">
                  <ConfirmDeleteButton
                    onConfirm={() => {
                      deleteAutomationMutation.mutate(targetAutomation.id);
                      closeModal();
                    }}
                    buttonProps={{ variant: "light" }}
                  />
                </Group>
              )}
            </Fragment>
          ) : null}
        </Stack>
      </Modal>
    </Fragment>
  );
}

function BuilderToggleIcon({ opened }: { opened: boolean }) {
  return (
    <Box style={{ position: "relative", width: 16, height: 16 }}>
      <IconPlus
        size={16}
        style={{
          position: "absolute",
          inset: 0,
          opacity: opened ? 0 : 1,
          transform: `rotate(${opened ? 90 : 0}deg) scale(${opened ? 0.7 : 1})`,
          transition: "opacity 150ms ease, transform 150ms ease",
        }}
      />
      <IconX
        size={16}
        style={{
          position: "absolute",
          inset: 0,
          opacity: opened ? 1 : 0,
          transform: `rotate(${opened ? 0 : -90}deg) scale(${opened ? 1 : 0.7})`,
          transition: "opacity 150ms ease, transform 150ms ease",
        }}
      />
    </Box>
  );
}
