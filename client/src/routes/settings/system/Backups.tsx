import { useMutation, useQuery } from "@tanstack/react-query";
import {
  getBackupsListAsync,
  downloadBackupAsync,
  createBackupAsync,
  getBackupCreationStatusAsync,
  uploadAndRestoreBackupAsync,
} from "../../../requests/requests_v2";

import {
  Text,
  Button,
  Paper,
  ScrollArea,
  Stack,
  Title,
  Table,
  FileInput,
  Accordion,
  Group,
  Modal,
} from "@mantine/core";
import { useState, Fragment, useEffect } from "react";
import { IconDatabaseExport } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

export default function Backups() {
  const [downloadFile, setDownloadFile] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [
    uploadWarning,
    { open: openUploadWarning, close: closeUploadWarning },
  ] = useDisclosure(false);

  const backupsListQuery = useQuery({
    queryKey: ["backupsList"],
    queryFn: () => {
      return getBackupsListAsync();
    },
  });

  const [isBackupPollingEnabled, setIsBackupPollingEnabled] = useState(false);

  const backupsCreationStatusQuery = useQuery({
    queryKey: ["backupCreationStatus"],
    queryFn: async () => {
      return await getBackupCreationStatusAsync();
    },
    // run once on first mount, and enable repeating polls only when flag is true
    enabled: true,
    refetchInterval: isBackupPollingEnabled ? 2000 : false,
  });

  // stop polling automatically when generation finished
  useEffect(() => {
    if (!backupsCreationStatusQuery.data?.isGeneratingBackup) {
      setIsBackupPollingEnabled(false);
      backupsListQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backupsCreationStatusQuery.data?.isGeneratingBackup]);

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      return await createBackupAsync();
    },
  });

  return (
    <Fragment>
      <Modal
        radius="md"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        title="Restore from backup?"
        opened={uploadWarning}
        onClose={closeUploadWarning}
      >
        <Group mt="md" justify="space-between">
          <Button color="red" onClick={closeUploadWarning}>
            Cancel
          </Button>
          <Button
            color="grape"
            onClick={async () => {
              if (!uploadFile) return;
              try {
                await uploadAndRestoreBackupAsync(uploadFile);
                await backupsListQuery.refetch();
                setUploadFile(null);
                const input = document.getElementById(
                  "backup-upload-input",
                ) as HTMLInputElement | null;
                if (input) input.value = "";
              } catch (err) {
                console.error("Upload failed:", err);
              }
              closeUploadWarning();
            }}
          >
            Confirm
          </Button>
        </Group>
      </Modal>
      <Accordion w={"100%"}>
        <Accordion.Item value="backups">
          <Accordion.Control>
            <Group pl="xl">
              <IconDatabaseExport />
              <Title order={3} fw={450}>
                Backups
              </Title>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Group justify="center">
              {backupsListQuery.isLoading && <p>Loading...</p>}
              {backupsListQuery.isError && <p>Error loading backups list.</p>}
              <Paper
                radius="sm"
                withBorder
                p="sm"
                w={"90%"}
                style={{ marginTop: 16 }}
              >
                <Stack justify="space-evenly">
                  <ScrollArea.Autosize mah={"240px"}>
                    {backupsListQuery.data &&
                    backupsListQuery.data.length > 0 ? (
                      <Table
                        verticalSpacing="sm"
                        style={{ width: "100%", fontSize: "0.9rem" }}
                        highlightOnHover
                      >
                        <Table.Tbody>
                          {backupsListQuery.data.map((name: string) => (
                            <Table.Tr
                              key={name}
                              onClick={() => setDownloadFile(name)}
                              style={{
                                cursor: "pointer",
                                background:
                                  downloadFile === name
                                    ? "rgba(34,139,230,0.08)"
                                    : undefined,
                              }}
                            >
                              <Table.Td
                                p={8}
                                maw={"100%"}
                                align="center"
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={name}
                              >
                                <Text size="sm">{name}</Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    ) : (
                      <Text size="sm">No backups found.</Text>
                    )}
                  </ScrollArea.Autosize>
                  <Button
                    disabled={!downloadFile}
                    mt="md"
                    onClick={async () => {
                      if (downloadFile) {
                        try {
                          await downloadBackupAsync(downloadFile);
                        } catch (error) {
                          console.error("Failed to download backup:", error);
                        }
                      }
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    color="green"
                    disabled={
                      backupsCreationStatusQuery.data?.isGeneratingBackup ===
                      true
                    }
                    loading={
                      backupsCreationStatusQuery.data?.isGeneratingBackup ===
                      true
                    }
                    onClick={async () => {
                      createBackupMutation.mutate();
                      await backupsCreationStatusQuery.refetch();
                      setIsBackupPollingEnabled(true);
                    }}
                  >
                    Create
                  </Button>
                  <input
                    id="backup-upload-input"
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      setUploadFile(file ? file : null);
                    }}
                  />
                  <Stack>
                    <FileInput
                      placeholder="Select restore file"
                      label="Restore"
                      onChange={(file: File | null) => setUploadFile(file)}
                      clearable
                      accept="*/*"
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        color="grape"
                        disabled={!uploadFile}
                        w={"100%"}
                        onClick={async () => {
                          openUploadWarning();
                        }}
                      >
                        Upload
                      </Button>
                    </div>
                  </Stack>
                </Stack>
              </Paper>
            </Group>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Fragment>
  );
}
