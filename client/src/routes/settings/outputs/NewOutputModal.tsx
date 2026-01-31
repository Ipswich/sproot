import {
  Modal,
  TextInput,
  Group,
  Button,
  Select,
  ColorInput,
  ScrollArea,
  ColorPicker,
  NumberInput,
} from "@mantine/core";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import {
  addOutputAsync,
  getDeviceZonesAsync,
  getSubcontrollerAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useForm } from "@mantine/form";
import PCA9685Form from "@sproot/sproot-client/src/routes/settings/outputs/forms/PCA9685Form";
import { OutputFormValues } from "@sproot/sproot-client/src/routes/settings/outputs/OutputSettings";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DefaultColors } from "@sproot/sproot-common/src/utility/ChartData";
import { Fragment } from "react";

import { useRevalidator } from "react-router-dom";
import TPLinkSmartPlugForm from "./forms/TPLinkSmartPlugForm";
import { Models } from "@sproot/sproot-common/src/outputs/Models";
import ESP32_PCA9685Form from "./forms/ESP32_PCA9685Form";

interface NewOutputModalProps {
  supportedModels: Record<string, string>;
  modalOpened: boolean;
  closeModal: () => void;
  setIsStale: (isStale: boolean) => void;
}

export default function NewOutputModal({
  supportedModels,
  modalOpened,
  closeModal,
  setIsStale,
}: NewOutputModalProps) {
  const revalidator = useRevalidator();
  const addOutputMutation = useMutation({
    mutationFn: async (newOutputValues: IOutputBase) => {
      if (newOutputValues.subcontrollerId != undefined) {
        newOutputValues.subcontrollerId = parseInt(
          String(newOutputValues.subcontrollerId),
        );
      }
      if (newOutputValues.model !== Models.ESP32_PCA9685) {
        newOutputValues.subcontrollerId = null;
      }
      newOutputValues.pin = String(newOutputValues.pin);
      await addOutputAsync(newOutputValues);
    },
    onSettled: () => {
      setIsStale(true);
      revalidator.revalidate();
    },
  });
  const subcontrollersQuery = useQuery({
    queryKey: ["get-subcontrollers"],
    queryFn: () => getSubcontrollerAsync(),
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  const groupQuery = useQuery({
    queryKey: ["device-zones"],
    queryFn: () => getDeviceZonesAsync(),
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  const newOutputForm = useForm({
    // Note - `mode: "uncontrolled"` prevents the form from rerendering every time a value in the form changes.
    // If and when we get around to adding other output types (besides PCA9685), we'll probably want to set this
    // and use some individual refs or states to keep track of things.
    // https://mantine.dev/form/uncontrolled/

    // mode: "uncontrolled",
    initialValues: {
      name: "",
      color: DefaultColors[Math.floor(Math.random() * DefaultColors.length)],
      model: supportedModels[0] ?? "",
      subcontrollerId: subcontrollersQuery.data?.recognized?.[0]?.id,
      address: "",
      // deviceZoneId: undefined,
      pin: "0",
      isPwm: false,
      isInvertedPwm: false,
    } as OutputFormValues,

    validate: {
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
        if (newOutputForm.values.model === Models.ESP32_PCA9685) {
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
      deviceZoneId: (value: number | undefined) =>
        value == undefined || value > 0
          ? null
          : "Group must be a positive integer",
      pin: (value: string) =>
        value != null && value != undefined ? null : "Must have a value",
      isPwm: (value: boolean) =>
        value === true || value === false ? null : "Must be true or false",
      isInvertedPwm: (value: boolean) =>
        value === true || value === false ? null : "Must be true or false",
      automationTimeout: (value: number | undefined) =>
        value != null && value != undefined && value >= 0 && value <= 999999999
          ? null
          : "Must be between 0 and 999999999",
    },
  });

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
          newOutputForm.reset();
        }}
        title="Add New"
      >
        <form
          onSubmit={newOutputForm.onSubmit(async (values) => {
            await addOutputMutation.mutateAsync(values as IOutputBase);
            closeModal();
            newOutputForm.reset();
          })}
        >
          <TextInput
            maxLength={64}
            label="Name"
            placeholder="Output #1"
            {...newOutputForm.getInputProps("name")}
          />
          <ColorInput
            readOnly
            label="Color"
            required
            // closeOnColorSwatchClick
            placeholder={newOutputForm.values.color}
            defaultValue={newOutputForm.values.color}
            // swatches={[...DefaultColors]}
            {...newOutputForm.getInputProps("color")}
          />
          <ColorPicker
            size="xs"
            fullWidth
            defaultValue={newOutputForm.values.color}
            swatches={[...DefaultColors]}
            {...newOutputForm.getInputProps("color")}
          />
          <Select
            label="Model"
            data={Object.keys(supportedModels).map((key) => {
              return { value: key, label: supportedModels[key]! };
            })}
            allowDeselect={false}
            placeholder="Model Name"
            required
            {...newOutputForm.getInputProps("model")}
          />
          <NumberInput
            min={0}
            max={999999999}
            step={1}
            label="Automation Timeout"
            suffix=" seconds"
            placeholder="60 seconds"
            stepHoldDelay={500}
            stepHoldInterval={(t) => Math.max(1000 / t ** 2, 15)}
            required
            {...newOutputForm.getInputProps("automationTimeout")}
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
            {...newOutputForm.getInputProps("deviceZoneId")}
          />
          {newOutputForm.values.model === Models.PCA9685 ? (
            <PCA9685Form form={newOutputForm} />
          ) : newOutputForm.values.model === Models.TPLINK_SMART_PLUG ? (
            <TPLinkSmartPlugForm form={newOutputForm} />
          ) : newOutputForm.values.model === Models.ESP32_PCA9685 ? (
            subcontrollersQuery.isSuccess ? (
              <ESP32_PCA9685Form
                subcontrollers={subcontrollersQuery.data?.recognized}
                form={newOutputForm}
              />
            ) : null
          ) : null}
          <Group justify="flex-end" mt="md">
            <Button type="submit">Add Output</Button>
          </Group>
        </form>
      </Modal>
    </Fragment>
  );
}
