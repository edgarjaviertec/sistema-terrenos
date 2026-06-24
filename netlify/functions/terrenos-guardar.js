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

    const { compradorId, descripcion, costoTotal, abonoMinimo, diaPago } = body;
    if (!compradorId || !descripcion || !descripcion.trim() || costoTotal == null || abonoMinimo == null) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Faltan datos requeridos' }) };
    }

    const costo = parseFloat(costoTotal);
    const abono = parseFloat(abonoMinimo);
    const dia = diaPago ? parseInt(diaPago) : null;

    // dia_pago es obligatorio solo para frecuencia mensual (default). Para
    // frecuencias futuras puede ir nulo, por eso la columna sigue siendo nullable.
    const frecuencia = body.frecuenciaPago || 'mensual';
    if (frecuencia === 'mensual' && (dia == null || dia < 1 || dia > 31)) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'El día de pago es obligatorio (1-31) para pagos mensuales' }) };
    }

    try {
        const db = await obtenerConexion();
        // saldo_actual arranca = costo_total; estado y frecuencia_pago usan sus defaults
        const [resultado] = await db.execute(
            `INSERT INTO terrenos (comprador_id, descripcion, costo_total, abono_minimo, dia_pago, saldo_actual, usuario_id_creador)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [parseInt(compradorId), descripcion.trim(), costo, abono, dia, costo, usuario.id]
        );

        return { statusCode: 200, body: JSON.stringify({ ok: true, terrenoId: resultado.insertId }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error al guardar el terreno' }) };
    }
};
