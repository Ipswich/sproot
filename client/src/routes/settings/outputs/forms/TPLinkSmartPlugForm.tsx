import { Select } from "@mantine/core";
import { UseFormReturnType } from "@mantine/form";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Fragment } from "react";
import { FormValues } from "../OutputSettings";
import { useQuery } from "@tanstack/react-query";
import { getAvailableDevicesAsync } from "../../../../requests/requests_v2";

interface TPLinkSmartPlugProps {
  selectedOutput?: IOutputBase;
  form: UseFormReturnType<FormValues>;
  address?: string;
}

export default function TPLinkSmartPlugForm({
  selectedOutput,
  form,
}: TPLinkSmartPlugProps) {
  const filterUsed = selectedOutput === undefined ? true : false;
  const getDevices = useQuery({
    queryKey: ["tplinksmartplug-output-pins", selectedOutput?.model],
    queryFn: () =>
      getAvailableDevicesAsync("tplink-smart-plug", undefined, filterUsed),
  });

  return (
    <Fragment>
      <Select
        required
        searchable
        defaultValue={
          (getDevices?.data ?? []).filter(
            (device) => device.externalId == selectedOutput?.pin,
          )[0]?.alias ?? ""
        }
        label="Plug ID"
        data={(getDevices.data ?? []).map((data) => ({
          label: data.alias,
          value: data.externalId,
        }))}
        {...form.getInputProps("pin")}
        onChange={(event) => {
          const details = getDevices.data?.filter(
            (d) => d.externalId === event,
          )[0];
          form.setFieldValue("pin", details!.externalId);
          form.setFieldValue("address", details!.address);
        }}
      />
    </Fragment>
  );
}
