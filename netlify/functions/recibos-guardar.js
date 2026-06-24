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

    const {
        nombreComprador, telefonoComprador, direccionComprador, compradorId,
        descripcionTerreno, costoTotal, abonoMinimo, frecuenciaPago, diaPago, terrenoId,
        tipoConcepto, cantidad, concepto, fechaPago
    } = body;

    if (!nombreComprador || !descripcionTerreno || !cantidad || !fechaPago) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Faltan datos requeridos' }) };
    }

    const db = await obtenerConexion();

    try {
        await db.execute('START TRANSACTION');

        // 1. Obtener o crear comprador
        let idComprador = compradorId;
        if (!idComprador) {
            const [res] = await db.execute(
                'INSERT INTO compradores (nombre, telefono, direccion) VALUES (?, ?, ?)',
                [nombreComprador.trim(), telefonoComprador || null, direccionComprador || null]
            );
            idComprador = res.insertId;
        }

        // 2. Obtener o crear terreno
        let idTerreno = terrenoId;
        if (!idTerreno) {
            if (!costoTotal || !abonoMinimo) {
                await db.execute('ROLLBACK');
                return { statusCode: 400, body: JSON.stringify({ mensaje: 'El costo total y abono mínimo son requeridos para un terreno nuevo' }) };
            }
            const [res] = await db.execute(
                `INSERT INTO terrenos (comprador_id, descripcion, costo_total, abono_minimo,
                 frecuencia_pago, dia_pago, saldo_actual, usuario_id_creador)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    idComprador,
                    descripcionTerreno.trim(),
                    parseFloat(costoTotal),
                    parseFloat(abonoMinimo),
                    frecuenciaPago || 'mensual',
                    diaPago ? parseInt(diaPago) : null,
                    parseFloat(costoTotal),
                    usuario.id
                ]
            );
            idTerreno = res.insertId;

            // Inicializar folio para el terreno nuevo
            await db.execute(
                'INSERT INTO folios_terrenos (terreno_id, ultimo_folio) VALUES (?, 0)',
                [idTerreno]
            );
        }

        // 3. Obtener y actualizar el folio
        await db.execute(
            'UPDATE folios_terrenos SET ultimo_folio = ultimo_folio + 1 WHERE terreno_id = ?',
            [idTerreno]
        );
        const [[{ ultimo_folio: nuevoFolio }]] = await db.execute(
            'SELECT ultimo_folio FROM folios_terrenos WHERE terreno_id = ?',
            [idTerreno]
        );

        // 4. Crear el recibo
        const cantidadNum = parseFloat(cantidad);
        const [resRecibo] = await db.execute(
            `INSERT INTO recibos (terreno_id, recibi_de, folio, cantidad_pago, tipo_concepto, concepto, fecha_pago, usuario_id_creador)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idTerreno,
                nombreComprador.trim(),
                nuevoFolio,
                cantidadNum,
                tipoConcepto || 'abono',
                concepto || null,
                fechaPago,
                usuario.id
            ]
        );

        // 5. Actualizar saldo del terreno
        if (tipoConcepto === 'abono') {
            await db.execute(
                'UPDATE terrenos SET saldo_actual = saldo_actual - ? WHERE id = ?',
                [cantidadNum, idTerreno]
            );
        } else if (tipoConcepto === 'cargo') {
            await db.execute(
                'UPDATE terrenos SET saldo_actual = saldo_actual + ? WHERE id = ?',
                [cantidadNum, idTerreno]
            );
        }

        await db.execute('COMMIT');

        return {
            statusCode: 200,
            body: JSON.stringify({ reciboId: resRecibo.insertId })
        };

    } catch (e) {
        await db.execute('ROLLBACK');
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error al guardar el recibo' }) };
    }
};
