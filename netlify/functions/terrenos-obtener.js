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
        const [[terreno]] = await db.execute(
            `SELECT t.id, t.comprador_id, t.descripcion, t.costo_total, t.abono_minimo,
                    t.saldo_actual, t.dia_pago, t.estado, c.nombre AS comprador_nombre,
                    (SELECT COUNT(*) FROM recibos r WHERE r.terreno_id = t.id) AS recibos_count
             FROM terrenos t JOIN compradores c ON t.comprador_id = c.id
             WHERE t.id = ?`,
            [parseInt(id)]
        );

        if (!terreno) {
            return { statusCode: 404, body: JSON.stringify({ mensaje: 'Terreno no encontrado' }) };
        }

        return { statusCode: 200, body: JSON.stringify({ terreno }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno' }) };
    }
};
