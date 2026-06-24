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

    const { compradorId, nombre, telefono, direccion } = body;
    if (!compradorId || !nombre || !nombre.trim()) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Faltan datos requeridos' }) };
    }

    try {
        const db = await obtenerConexion();
        await db.execute(
            'UPDATE compradores SET nombre = ?, telefono = ?, direccion = ? WHERE id = ?',
            [nombre.trim(), telefono || null, direccion || null, parseInt(compradorId)]
        );

        return { statusCode: 200, body: JSON.stringify({ ok: true }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error al actualizar el comprador' }) };
    }
};
