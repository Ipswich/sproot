export type AvailableDevice = {
  alias: string | null;
  address: string;
  pins: string[] | null;
  subcontrollerId: number | null;
  externalId: string | null;
};
