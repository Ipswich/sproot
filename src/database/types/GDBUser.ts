import { RowDataPacket } from 'mysql2/promise';

interface GDBUser extends RowDataPacket {
  username: string;
  hash: string;
  email: string;
}

export { GDBUser };