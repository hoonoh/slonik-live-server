const { Client } = require('pg');

(async () => {
  try {
    const client = new Client({
      connectionString: process.argv[2],
    });
    await client.connect();
    const res = await client.query(process.argv[3]);
    console.log(JSON.stringify(res));
    await client.end();
  } catch (error) {
    console.log(
      JSON.stringify({
        error: error.message,
        length: error.length,
        severity: error.severity,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: parseInt(error.position),
        internalPosition: parseInt(error.internalPosition),
        internalQuery: error.internalQuery,
        where: error.where,
        schema: error.schema,
        table: error.table,
        column: error.column,
        dataType: error.dataType,
        constraint: error.constraint,
        file: error.file,
        line: parseInt(error.line),
        routine: error.routine,
      }),
    );
    process.exit(0);
  }
})();
