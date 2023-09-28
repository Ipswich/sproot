import { RowDataPacket } from 'mysql2/promise';

interface SDBUser extends RowDataPacket {
  username: string;
  hash: string;
  email: string;
}

export { SDBUser };