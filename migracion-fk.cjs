const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '4000'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: true }
  });

  const consultarRegla = async () => {
    const [rows] = await conn.query(
      `SELECT DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = ? AND CONSTRAINT_NAME = 'fk_terrenos_comprador_id'`,
      [process.env.DB_NAME]
    );
    return rows[0] ? rows[0].DELETE_RULE : '(no encontrada)';
  };

  try {
    console.log('Regla DELETE antes:', await consultarRegla());

    await conn.query('ALTER TABLE terrenos DROP FOREIGN KEY fk_terrenos_comprador_id');
    await conn.query(
      `ALTER TABLE terrenos ADD CONSTRAINT fk_terrenos_comprador_id
       FOREIGN KEY (comprador_id) REFERENCES compradores(id)
       ON DELETE CASCADE ON UPDATE CASCADE`
    );

    console.log('Regla DELETE después:', await consultarRegla());
    console.log('OK: fk_terrenos_comprador_id ahora es ON DELETE CASCADE');
  } catch (e) {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
})();
