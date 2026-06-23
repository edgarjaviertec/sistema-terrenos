const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

// Solo lectura: devuelve el siguiente folio de un terreno (ultimo_folio + 1, o 1 si no tiene).
// Es indicativo para el preview; el folio definitivo se asigna atómicamente al guardar.
exports.handler = async (event) => {
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    const { terrenoId } = event.queryStringParameters || {};
    if (!terrenoId) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'terrenoId requerido' }) };
    }

    try {
        const db = await obtenerConexion();
        const [[fila]] = await db.execute(
            'SELECT ultimo_folio FROM folios_terrenos WHERE terreno_id = ?',
            [parseInt(terrenoId)]
        );
        const proximo = fila ? fila.ultimo_folio + 1 : 1;
        return { statusCode: 200, body: JSON.stringify({ proximo }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno' }) };
    }
};
