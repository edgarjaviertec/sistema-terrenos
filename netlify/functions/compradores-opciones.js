const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

// Lista ligera de compradores (id + nombre) para el select del formulario de terreno
exports.handler = async (event) => {
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    try {
        const db = await obtenerConexion();
        const [opciones] = await db.execute(
            'SELECT id, nombre FROM compradores ORDER BY nombre ASC'
        );
        return { statusCode: 200, body: JSON.stringify({ opciones }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno' }) };
    }
};
