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

    const { reciboId, recibiDe, cantidad, tipoConcepto, concepto, fechaPago } = body;

    if (!reciboId || !cantidad || !fechaPago) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Faltan datos requeridos' }) };
    }

    if (!recibiDe || !recibiDe.trim()) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'El campo "Recibí de" es obligatorio' }) };
    }

    if (!concepto || !concepto.trim()) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'El concepto es obligatorio' }) };
    }

    try {
        const db = await obtenerConexion();

        // Obtener recibo actual para ajustar saldo
        const [[reciboActual]] = await db.execute(
            'SELECT cantidad_pago, tipo_concepto, terreno_id FROM recibos WHERE id = ?',
            [parseInt(reciboId)]
        );

        if (!reciboActual) {
            return { statusCode: 404, body: JSON.stringify({ mensaje: 'Recibo no encontrado' }) };
        }

        await db.execute('START TRANSACTION');

        // Revertir efecto del recibo anterior en el saldo
        if (reciboActual.tipo_concepto === 'abono') {
            await db.execute(
                'UPDATE terrenos SET saldo_actual = saldo_actual + ? WHERE id = ?',
                [parseFloat(reciboActual.cantidad_pago), reciboActual.terreno_id]
            );
        } else if (reciboActual.tipo_concepto === 'cargo') {
            await db.execute(
                'UPDATE terrenos SET saldo_actual = saldo_actual - ? WHERE id = ?',
                [parseFloat(reciboActual.cantidad_pago), reciboActual.terreno_id]
            );
        }

        // Actualizar recibo
        await db.execute(
            `UPDATE recibos SET recibi_de = ?, cantidad_pago = ?, tipo_concepto = ?,
             concepto = ?, fecha_pago = ? WHERE id = ?`,
            [
                recibiDe.trim(),
                parseFloat(cantidad),
                tipoConcepto || 'abono',
                concepto.trim(),
                fechaPago,
                parseInt(reciboId)
            ]
        );

        // Aplicar nuevo efecto en el saldo
        const cantidadNum = parseFloat(cantidad);
        if (tipoConcepto === 'abono') {
            await db.execute(
                'UPDATE terrenos SET saldo_actual = saldo_actual - ? WHERE id = ?',
                [cantidadNum, reciboActual.terreno_id]
            );
        } else if (tipoConcepto === 'cargo') {
            await db.execute(
                'UPDATE terrenos SET saldo_actual = saldo_actual + ? WHERE id = ?',
                [cantidadNum, reciboActual.terreno_id]
            );
        }

        await db.execute('COMMIT');

        return { statusCode: 200, body: JSON.stringify({ ok: true }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error al actualizar el recibo' }) };
    }
};
