const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

exports.handler = async (event) => {
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    const { descripcion = '', compradorId, nombreComprador } = event.queryStringParameters || {};

    try {
        const db = await obtenerConexion();

        const condiciones = ['t.descripcion LIKE ?'];
        const valores = [`%${descripcion}%`];

        if (compradorId) {
            condiciones.push('t.comprador_id = ?');
            valores.push(compradorId);
        } else if (nombreComprador) {
            condiciones.push('c.nombre LIKE ?');
            valores.push(`%${nombreComprador}%`);
        }

        const [terrenos] = await db.execute(
            `SELECT t.id, t.descripcion, t.costo_total, t.abono_minimo, t.saldo_actual,
                    t.frecuencia_pago, t.dia_pago, c.nombre AS comprador
             FROM terrenos t
             JOIN compradores c ON t.comprador_id = c.id
             WHERE ${condiciones.join(' AND ')}
             ORDER BY t.descripcion LIMIT 10`,
            valores
        );

        return { statusCode: 200, body: JSON.stringify({ terrenos }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno' }) };
    }
};
