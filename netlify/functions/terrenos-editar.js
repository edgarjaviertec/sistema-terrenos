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

    const { terrenoId, descripcion, costoTotal, abonoMinimo, diaPago } = body;
    if (!terrenoId || !descripcion || !descripcion.trim() || costoTotal == null || abonoMinimo == null) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Faltan datos requeridos' }) };
    }

    const nuevoCosto = parseFloat(costoTotal);
    const abono = parseFloat(abonoMinimo);
    const dia = diaPago ? parseInt(diaPago) : null;

    try {
        const db = await obtenerConexion();

        const [[terreno]] = await db.execute(
            'SELECT costo_total, saldo_actual FROM terrenos WHERE id = ?',
            [parseInt(terrenoId)]
        );
        if (!terreno) {
            return { statusCode: 404, body: JSON.stringify({ mensaje: 'Terreno no encontrado' }) };
        }

        // Opción C: ajustar el saldo por la diferencia del costo (no se toca el comprador)
        const delta = nuevoCosto - parseFloat(terreno.costo_total);
        const nuevoSaldo = parseFloat(terreno.saldo_actual) + delta;

        await db.execute(
            `UPDATE terrenos SET descripcion = ?, costo_total = ?, abono_minimo = ?, dia_pago = ?, saldo_actual = ?
             WHERE id = ?`,
            [descripcion.trim(), nuevoCosto, abono, dia, nuevoSaldo, parseInt(terrenoId)]
        );

        return { statusCode: 200, body: JSON.stringify({ ok: true }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error al actualizar el terreno' }) };
    }
};
