import { DateClassHandler } from '../../../lib/sql-diagnostic-service/handlers/date-class';
import { FunctionHandler } from '../../../lib/sql-diagnostic-service/handlers/function';
import { IdentifierHandler } from '../../../lib/sql-diagnostic-service/handlers/identifier';
import { PrimitiveHandler } from '../../../lib/sql-diagnostic-service/handlers/primitive';
import { SlonikSqlArrayHandler } from '../../../lib/sql-diagnostic-service/handlers/slonik-sql/array';
import { SlonikSqlBinaryHandler } from '../../../lib/sql-diagnostic-service/handlers/slonik-sql/binary';
import { SlonikSqlIdentifierHandler } from '../../../lib/sql-diagnostic-service/handlers/slonik-sql/identifier';
import { SlonikSqlJoinHandler } from '../../../lib/sql-diagnostic-service/handlers/slonik-sql/join';
import { SlonikSqlJsonHandler } from '../../../lib/sql-diagnostic-service/handlers/slonik-sql/json';
import { SlonikSqlUnnestHandler } from '../../../lib/sql-diagnostic-service/handlers/slonik-sql/unnest';
import { SqlTemplteLiteralHandler } from '../../../lib/sql-diagnostic-service/handlers/sql-template-literal';
import { TemplateSpanChildHandler } from '../../../lib/sql-diagnostic-service/handlers/template-span-child';
import { TypeByFlagHandler } from '../../../lib/sql-diagnostic-service/handlers/type-by-flag';

describe('sql-template-literal handler', () => {
  describe('handler instances', () => {
    // simply just to keep up with test coverage,
    // since all handlers provide static methods only

    const slonikArrayHandler = new SlonikSqlArrayHandler();
    const slonikBinaryHandler = new SlonikSqlBinaryHandler();
    const slonikIdentifierHandler = new SlonikSqlIdentifierHandler();
    const slonikJoinHandler = new SlonikSqlJoinHandler();
    const slonikJsonHandler = new SlonikSqlJsonHandler();
    const slonikUnnestHandler = new SlonikSqlUnnestHandler();

    const dateClassHandler = new DateClassHandler();
    const functionHandler = new FunctionHandler();
    const identifierHandler = new IdentifierHandler();
    const primitiveHandler = new PrimitiveHandler();
    const sqlTemplteLiteralHandler = new SqlTemplteLiteralHandler();
    const templateSpanChildHandler = new TemplateSpanChildHandler();
    const typeByFlagHandler = new TypeByFlagHandler();

    it('handlers should be initiated', () => {
      expect(slonikArrayHandler).toBeInstanceOf(SlonikSqlArrayHandler);
      expect(slonikBinaryHandler).toBeInstanceOf(SlonikSqlBinaryHandler);
      expect(slonikIdentifierHandler).toBeInstanceOf(SlonikSqlIdentifierHandler);
      expect(slonikJoinHandler).toBeInstanceOf(SlonikSqlJoinHandler);
      expect(slonikJsonHandler).toBeInstanceOf(SlonikSqlJsonHandler);
      expect(slonikUnnestHandler).toBeInstanceOf(SlonikSqlUnnestHandler);

      expect(dateClassHandler).toBeInstanceOf(DateClassHandler);
      expect(functionHandler).toBeInstanceOf(FunctionHandler);
      expect(identifierHandler).toBeInstanceOf(IdentifierHandler);
      expect(primitiveHandler).toBeInstanceOf(PrimitiveHandler);
      expect(sqlTemplteLiteralHandler).toBeInstanceOf(SqlTemplteLiteralHandler);
      expect(templateSpanChildHandler).toBeInstanceOf(TemplateSpanChildHandler);
      expect(typeByFlagHandler).toBeInstanceOf(TypeByFlagHandler);
    });
  });
});
