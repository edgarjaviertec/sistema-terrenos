const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

const OPCIONES_POR_PAGINA = [10, 25, 50, 100];
const POR_PAGINA_DEFAULT = 10;

// Whitelist de columnas ordenables: clave del front → expresión SQL segura
const COLUMNAS_ORDEN = {
    folio: 'r.folio',
    comprador: 'c.nombre',
    concepto: 'r.concepto',
    cantidad: 'r.cantidad_pago',
    fecha: 'r.fecha_pago'
};
const ORDEN_DEFAULT = 'r.fecha_pago DESC, r.id DESC';

exports.handler = async (event) => {
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    const { pagina = '1', porPagina, texto, fechaInicio, fechaFin, ordenarPor, orden } = event.queryStringParameters || {};

    // Validamos el tamaño de página contra la lista permitida
    const porPaginaNum = OPCIONES_POR_PAGINA.includes(parseInt(porPagina))
        ? parseInt(porPagina)
        : POR_PAGINA_DEFAULT;

    // Construimos el ORDER BY validando columna (whitelist) y dirección
    let orderBy = ORDEN_DEFAULT;
    if (COLUMNAS_ORDEN[ordenarPor]) {
        const direccion = orden === 'desc' ? 'DESC' : 'ASC';
        orderBy = `${COLUMNAS_ORDEN[ordenarPor]} ${direccion}, r.id DESC`;
    }

    const paginaNum = Math.max(1, parseInt(pagina));
    const offset = (paginaNum - 1) * porPaginaNum;

    const condiciones = [];
    const valores = [];

    if (texto) {
        // Busca por nombre o por folio "pintado" (LPAD a 4 dígitos, igual que se muestra)
        condiciones.push('(c.nombre LIKE ? OR LPAD(r.folio, 4, \'0\') LIKE ?)');
        valores.push(`%${texto}%`, `%${texto}%`);
    }
    if (fechaInicio) {
        condiciones.push('r.fecha_pago >= ?');
        valores.push(fechaInicio);
    }
    if (fechaFin) {
        condiciones.push('r.fecha_pago <= ?');
        valores.push(fechaFin);
    }

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    try {
        const db = await obtenerConexion();

        const [conteo] = await db.execute(
            `SELECT COUNT(*) as total
             FROM recibos r
             JOIN terrenos t ON r.terreno_id = t.id
             JOIN compradores c ON t.comprador_id = c.id
             ${where}`,
            valores
        );

        const total = conteo[0].total;
        const totalPaginas = Math.max(1, Math.ceil(total / porPaginaNum));

        const [recibos] = await db.execute(
            `SELECT r.id, r.folio, r.cantidad_pago, r.tipo_concepto, r.concepto,
                    r.fecha_pago, c.nombre AS comprador, t.descripcion AS terreno
             FROM recibos r
             JOIN terrenos t ON r.terreno_id = t.id
             JOIN compradores c ON t.comprador_id = c.id
             ${where}
             ORDER BY ${orderBy}
             LIMIT ${porPaginaNum} OFFSET ${offset}`,
            valores
        );

        return {
            statusCode: 200,
            body: JSON.stringify({ items: recibos, totalPaginas, total })
        };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno del servidor' }) };
    }
};
