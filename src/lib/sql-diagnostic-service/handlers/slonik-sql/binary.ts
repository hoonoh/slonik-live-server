import { Value } from '../../types';

export class SlonikSqlBinaryHandler {
  static handle = (values: Value[]) => {
    values.push({ value: `''::bytea` });
  };
}
