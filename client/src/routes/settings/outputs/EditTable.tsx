import {
  Modal,
  TextInput,
  Group,
  Button,
  ColorInput,
  ColorPicker,
  ScrollArea,
  NumberInput,
  Select,
} from "@mantine/core";
import { Fragment, useState } from "react";
import {
  deleteOutputAsync,
  getSubcontrollerAsync,
  updateOutputAsync,
  getDeviceZonesAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useDisclosure } from "@mantine/hooks";
import { useForm } from "@mantine/form";
import EditablesTable from "@sproot/sproot-client/src/routes/common/EditablesTable";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import PCA9685Form from "@sproot/sproot-client/src/routes/settings/outputs/forms/PCA9685Form";
import { OutputFormValues } from "@sproot/sproot-client/src/routes/settings/outputs/OutputSettings";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRevalidator } from "react-router-dom";
import TPLinkSmartPlugForm from "./forms/TPLinkSmartPlugForm";
import { Models } from "@sproot/sproot-common/src/outputs/Models";
import ESP32_PCA9685Form from "./forms/ESP32_PCA9685Form";

interface EditTableProps {
  outputs: Record<string, IOutputBase>;
  supportedModels: Record<string, string>;
  setIsStale: (isStale: boolean) => void;
}

export default function EditTable({
  outputs,
  supportedModels,
  setIsStale,
}: EditTableProps) {
  const revalidator = useRevalidator();
  const [selectedOutput, setSelectedOutput] = useState({} as IOutputBase);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const subcontrollersQuery = useQuery({
    queryKey: ["get-subcontrollers"],
    queryFn: () => getSubcontrollerAsync(),
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  const groupQuery = useQuery({
    queryKey: ["get-device-zones"],
    queryFn: () => getDeviceZonesAsync(),
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  const updateOutputMutation = useMutation({
    mutationFn: async (newOutputValues: IOutputBase) => {
      if (newOutputValues.subcontrollerId != undefined) {
        newOutputValues.subcontrollerId = parseInt(
          String(newOutputValues.subcontrollerId),
        );
      }
      newOutputValues.pin = String(newOutputValues.pin);
      await updateOutputAsync(newOutputValues);
    },
    onSettled: () => {
      revalidator.revalidate();
      setIsStale(true);
    },
  });

  const deleteOutputMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteOutputAsync(id);
    },
    onSettled: () => {
      revalidator.revalidate();
      setIsStale(true);
    },
  });

  const updateOutputForm = useForm({
    initialValues: {
      id: selectedOutput.id,
      name: selectedOutput.name,
      color: selectedOutput.color,
      model: selectedOutput.model,
      subcontrollerId: selectedOutput.subcontrollerId,
      address: selectedOutput.address,
      pin: selectedOutput.pin,
      isPwm: selectedOutput.isPwm,
      isInvertedPwm: selectedOutput.isInvertedPwm,
      automationTimeout: selectedOutput.automationTimeout,
      deviceZoneId: selectedOutput.deviceZoneId,
    } as OutputFormValues,
    validate: {
      id: (value: number | undefined) =>
        value || value != selectedOutput.id
          ? null
          : "ID must match selected output",
      name: (value: string) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Name must be between 1 and 64 characters",
      color: (value: string) =>
        !value || (value.length > 0 && value.length <= 7)
          ? null
          : "Color must be a valid hex color",
      model: (value: string) =>
        value.length > 0 && value.length <= 64
          ? null
          : "Model must be between 1 and 64 characters",
      subcontrollerId: (value: number | undefined) => {
        if (updateOutputForm.values.model === Models.ESP32_PCA9685) {
          return subcontrollersQuery.data?.recognized.some(
            (dev) => dev.id === parseInt(String(value)),
          )
            ? null
            : "Must be a valid subcontroller";
        } else {
          return null;
        }
      },
      address: (value: string) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Address must be between 1 and 64 characters",
      pin: (value: string) =>
        value != null && value != undefined ? null : "Pin must be defined",
      isPwm: (value: boolean) =>
        value === true || value === false ? null : "Must be true or false",
      isInvertedPwm: (value: boolean) =>
        value === true || value === false ? null : "Must be true or false",
      automationTimeout: (value: number | undefined) =>
        value != null && value != undefined && value >= 0 && value <= 999999999
          ? null
          : "Must be between 0 and 99999999",
      deviceZoneId: (value: number | undefined) =>
        value == undefined || value > 0
          ? null
          : "Group must be a positive integer",
    },
  });

  const editTableOnClick = function (output: IOutputBase) {
    setSelectedOutput(output);
    updateOutputForm.setFieldValue("name", output.name ?? "");
    updateOutputForm.setFieldValue("color", output.color);
    updateOutputForm.setFieldValue("model", output.model);
    updateOutputForm.setFieldValue(
      "subcontrollerId",
      output.subcontrollerId ?? undefined,
    );
    updateOutputForm.setFieldValue("address", output.address);
    updateOutputForm.setFieldValue("id", output.id);
    updateOutputForm.setFieldValue("pin", output.pin);
    updateOutputForm.setFieldValue("isPwm", output.isPwm);
    updateOutputForm.setFieldValue("isInvertedPwm", output.isInvertedPwm);
    updateOutputForm.setFieldValue(
      "automationTimeout",
      output.automationTimeout,
    );
    updateOutputForm.setFieldValue(
      "deviceZoneId",
      output.deviceZoneId ?? undefined,
    );
    openModal();
  };

  return (
    <Fragment>
      <meta name="viewport" content="width=device-width, user-scalable=no" />
      <Modal
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
        scrollAreaComponent={ScrollArea.Autosize}
        centered
        size="xs"
        opened={modalOpened}
        onClose={() => {
          closeModal();
          updateOutputForm.reset();
        }}
        title="Edit"
      >
        <form
          onSubmit={updateOutputForm.onSubmit(async (values) => {
            setIsUpdating(true);
            await updateOutputMutation.mutateAsync(values as IOutputBase);
            setIsUpdating(false);
            setSelectedOutput({} as IOutputBase);
            closeModal();
            updateOutputForm.reset();
          })}
        >
          <TextInput
            type="hidden"
            required
            {...updateOutputForm.getInputProps("id")}
          />
          <TextInput
            maxLength={64}
            label="Name"
            placeholder={selectedOutput.name || ""}
            {...updateOutputForm.getInputProps("name")}
          />
          <ColorInput
            readOnly
            label="Color"
            required
            // closeOnColorSwatchClick
            defaultValue={selectedOutput.color}
            placeholder={selectedOutput.color}
            // swatches={[...DefaultColors]}
            {...updateOutputForm.getInputProps("color")}
          />
          <ColorPicker
            size="xs"
            fullWidth
            defaultValue={selectedOutput.color}
            swatches={[...DefaultColors]}
            {...updateOutputForm.getInputProps("color")}
          />
          <Select
            label="Model"
            data={Object.keys(supportedModels).map((key) => {
              return { value: key, label: supportedModels[key]! };
            })}
            required
            {...updateOutputForm.getInputProps("model")}
            disabled
          />
          <NumberInput
            min={0}
            max={999999999}
            step={1}
            label="Automation Timeout"
            suffix=" seconds"
            stepHoldDelay={500}
            stepHoldInterval={(t) => Math.max(1000 / t ** 2, 15)}
            required
            {...updateOutputForm.getInputProps("automationTimeout")}
          />
          <Select
            label="Group"
            placeholder="Default"
            data={Object.keys(groupQuery.data ?? {}).map((key) => {
              const group = groupQuery.data?.[parseInt(key)];
              return {
                value: String(group?.id) ?? "",
                label: group?.name ?? "",
              };
            })}
            searchable
            clearable
            allowDeselect={true}
            {...updateOutputForm.getInputProps("deviceZoneId")}
          />
          {selectedOutput.model === Models.PCA9685 ? (
            <PCA9685Form
              selectedOutput={selectedOutput}
              form={updateOutputForm}
            />
          ) : selectedOutput.model === Models.TPLINK_SMART_PLUG ? (
            <TPLinkSmartPlugForm
              selectedOutput={selectedOutput}
              form={updateOutputForm}
            />
          ) : selectedOutput.model === Models.ESP32_PCA9685 ? (
            subcontrollersQuery.isSuccess ? (
              <ESP32_PCA9685Form
                subcontrollers={subcontrollersQuery.data?.recognized}
                selectedOutput={selectedOutput}
                form={updateOutputForm}
              />
            ) : null
          ) : null}
          <Group justify="space-between" mt="md">
            <Button
              disabled={isUpdating}
              color="red"
              onClick={async () => {
                setIsUpdating(true);
                await deleteOutputMutation.mutateAsync(selectedOutput.id);
                delete outputs[selectedOutput.id];
                setIsUpdating(false);
                setSelectedOutput({} as IOutputBase);
                closeModal();
                updateOutputForm.reset();
              }}
            >
              Delete
            </Button>
            <Button type="submit" disabled={isUpdating}>
              Update Output
            </Button>
          </Group>
        </form>
      </Modal>
      <EditablesTable
        editables={Object.values(outputs)}
        onEditClick={(item) => {
          editTableOnClick(item as IOutputBase);
        }}
      />
    </Fragment>
  );
}
