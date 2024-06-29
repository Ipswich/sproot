import { RowDataPacket } from "mysql2/promise";

type SDBUser = RowDataPacket & {
  username: string;
  hash: string;
  email: string;
};

export type { SDBUser };
