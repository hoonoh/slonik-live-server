const { Pool } = require('pg');

(async () => {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:secretpassword@localhost:54321/postgres',
  });
  let waitCount = 0;
  await new Promise(res => {
    const retry = () => {
      pool
        .connect()
        .then(client => {
          process.stdout.write(`${waitCount > 0 ? '\n' : ''}test db instance ready.\n`);
          client.release();
          pool.end();
          res();
        })
        .catch(() => {
          process.stdout.write(!waitCount ? 'waiting for test db instance readiness..' : '.');
          waitCount += 1;
          setTimeout(retry, 100);
        });
    };
    retry();
  });
})();
