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

    const { terrenoId, recibiDe, tipoConcepto, cantidad, concepto, fechaPago } = body;

    if (!terrenoId || !cantidad || !fechaPago) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Faltan datos requeridos' }) };
    }

    const db = await obtenerConexion();

    try {
        await db.execute('START TRANSACTION');

        // Obtener y actualizar folio
        await db.execute(
            'UPDATE folios_terrenos SET ultimo_folio = ultimo_folio + 1 WHERE terreno_id = ?',
            [terrenoId]
        );
        const [[{ ultimo_folio: nuevoFolio }]] = await db.execute(
            'SELECT ultimo_folio FROM folios_terrenos WHERE terreno_id = ?',
            [terrenoId]
        );

        // Crear recibo nuevo
        const cantidadNum = parseFloat(cantidad);
        const [res] = await db.execute(
            `INSERT INTO recibos (terreno_id, recibi_de, folio, cantidad_pago, tipo_concepto, concepto, fecha_pago, usuario_id_creador)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [terrenoId, recibiDe || null, nuevoFolio, cantidadNum, tipoConcepto || 'abono', concepto || null, fechaPago, usuario.id]
        );

        // Actualizar saldo
        if (tipoConcepto === 'abono') {
            await db.execute('UPDATE terrenos SET saldo_actual = saldo_actual - ? WHERE id = ?', [cantidadNum, terrenoId]);
        } else if (tipoConcepto === 'cargo') {
            await db.execute('UPDATE terrenos SET saldo_actual = saldo_actual + ? WHERE id = ?', [cantidadNum, terrenoId]);
        }

        await db.execute('COMMIT');

        return { statusCode: 200, body: JSON.stringify({ reciboId: res.insertId }) };

    } catch (e) {
        await db.execute('ROLLBACK');
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error al duplicar el recibo' }) };
    }
};
