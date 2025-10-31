type SDBExternalDevice = {
  id: number;
  name: string;
  type: string;
  externalAddress: string;
  secureToken: string | null;
};

export type { SDBExternalDevice };
