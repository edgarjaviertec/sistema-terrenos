const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

exports.handler = async (event) => {
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    try {
        const db = await obtenerConexion();
        const [filas] = await db.execute(
            'SELECT clave, valor, descripcion FROM configuracion_sistema ORDER BY clave'
        );

        const config = {};
        filas.forEach(({ clave, valor }) => { config[clave] = valor || ''; });

        return { statusCode: 200, body: JSON.stringify({ config }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno' }) };
    }
};
