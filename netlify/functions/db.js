const mysql = require('mysql2/promise');

let conexion = null;

async function obtenerConexion() {
    if (conexion) {
        try {
            await conexion.ping();
            return conexion;
        } catch {
            conexion = null;
        }
    }

    conexion = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '4000'),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: true }
    });

    return conexion;
}

module.exports = { obtenerConexion };
