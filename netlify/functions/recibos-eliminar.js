const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ mensaje: 'Método no permitido' }) };
    }

    const usuario = verificarToken(event);
    if (!usuario) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Datos inválidos' }) };
    }

    const { reciboId } = body;
    if (!reciboId) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Falta reciboId' }) };
    }

    try {
        const db = await obtenerConexion();

        const [[recibo]] = await db.execute(
            'SELECT cantidad_pago, tipo_concepto, terreno_id FROM recibos WHERE id = ?',
            [parseInt(reciboId)]
        );

        if (!recibo) {
            return { statusCode: 404, body: JSON.stringify({ mensaje: 'Recibo no encontrado' }) };
        }

        await db.execute('START TRANSACTION');

        try {
            // Revertir el efecto del recibo en el saldo del terreno
            const cantidad = parseFloat(recibo.cantidad_pago);
            if (recibo.tipo_concepto === 'abono') {
                await db.execute(
                    'UPDATE terrenos SET saldo_actual = saldo_actual + ? WHERE id = ?',
                    [cantidad, recibo.terreno_id]
                );
            } else if (recibo.tipo_concepto === 'cargo') {
                await db.execute(
                    'UPDATE terrenos SET saldo_actual = saldo_actual - ? WHERE id = ?',
                    [cantidad, recibo.terreno_id]
                );
            }

            await db.execute('DELETE FROM recibos WHERE id = ?', [parseInt(reciboId)]);

            await db.execute('COMMIT');
        } catch (e) {
            await db.execute('ROLLBACK');
            throw e;
        }

        return { statusCode: 200, body: JSON.stringify({ ok: true }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error al eliminar el recibo' }) };
    }
};
