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

        const [[recibo]] = await db.execute(
            `SELECT r.id, r.folio, r.recibi_de, r.cantidad_pago, r.tipo_concepto,
                    r.concepto, r.fecha_pago,
                    t.id AS terreno_id, t.descripcion AS terreno_descripcion,
                    t.costo_total, t.abono_minimo, t.saldo_actual,
                    t.frecuencia_pago, t.dia_pago,
                    c.id AS comprador_id, c.nombre AS comprador_nombre,
                    c.telefono AS comprador_telefono, c.direccion AS comprador_direccion
             FROM recibos r
             JOIN terrenos t ON r.terreno_id = t.id
             JOIN compradores c ON t.comprador_id = c.id
             WHERE r.id = ?`,
            [parseInt(id)]
        );

        if (!recibo) {
            return { statusCode: 404, body: JSON.stringify({ mensaje: 'Recibo no encontrado' }) };
        }

        // Datos del vendedor desde configuracion_sistema
        const [config] = await db.execute(
            `SELECT clave, valor FROM configuracion_sistema
             WHERE clave IN ('vendedor.nombre','vendedor.telefono','vendedor.direccion')`
        );

        const vendedor = {};
        config.forEach(({ clave, valor }) => {
            vendedor[clave.replace('vendedor.', '')] = valor;
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ recibo, vendedor })
        };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno' }) };
    }
};
