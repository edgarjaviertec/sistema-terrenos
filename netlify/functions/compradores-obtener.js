const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

exports.handler = async (event) => {
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    const { id } = event.queryStringParameters || {};
    if (!id) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'ID requerido' }) };
    }

    try {
        const db = await obtenerConexion();
        const [[comprador]] = await db.execute(
            'SELECT id, nombre, telefono, direccion FROM compradores WHERE id = ?',
            [parseInt(id)]
        );

        if (!comprador) {
            return { statusCode: 404, body: JSON.stringify({ mensaje: 'Comprador no encontrado' }) };
        }

        return { statusCode: 200, body: JSON.stringify({ comprador }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno' }) };
    }
};
