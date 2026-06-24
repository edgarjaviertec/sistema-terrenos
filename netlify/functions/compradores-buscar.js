const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

exports.handler = async (event) => {
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    const { nombre = '' } = event.queryStringParameters || {};

    try {
        const db = await obtenerConexion();
        const [compradores] = await db.execute(
            'SELECT id, nombre, telefono, direccion FROM compradores WHERE nombre LIKE ? ORDER BY nombre LIMIT 10',
            [`%${nombre}%`]
        );

        return { statusCode: 200, body: JSON.stringify({ compradores }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno' }) };
    }
};
