const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ mensaje: 'Método no permitido' }) };
    }
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Datos inválidos' }) };
    }

    const { nombre, telefono, direccion } = body;
    if (!nombre || !nombre.trim()) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'El nombre es requerido' }) };
    }

    try {
        const db = await obtenerConexion();
        const [resultado] = await db.execute(
            'INSERT INTO compradores (nombre, telefono, direccion) VALUES (?, ?, ?)',
            [nombre.trim(), telefono || null, direccion || null]
        );

        return { statusCode: 200, body: JSON.stringify({ ok: true, compradorId: resultado.insertId }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error al guardar el comprador' }) };
    }
};
