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

    const { terrenoId } = body;
    if (!terrenoId) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Falta terrenoId' }) };
    }

    try {
        const db = await obtenerConexion();
        // El FK ON DELETE CASCADE borra los recibos y el folio del terreno
        const [resultado] = await db.execute(
            'DELETE FROM terrenos WHERE id = ?',
            [parseInt(terrenoId)]
        );

        if (resultado.affectedRows === 0) {
            return { statusCode: 404, body: JSON.stringify({ mensaje: 'Terreno no encontrado' }) };
        }

        return { statusCode: 200, body: JSON.stringify({ ok: true }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error al eliminar el terreno' }) };
    }
};
