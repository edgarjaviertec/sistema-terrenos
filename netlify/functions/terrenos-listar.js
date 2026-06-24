const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

const OPCIONES_POR_PAGINA = [10, 25, 50, 100];
const POR_PAGINA_DEFAULT = 10;

const COLUMNAS_ORDEN = {
    descripcion: 't.descripcion',
    comprador: 'c.nombre',
    costo: 't.costo_total',
    saldo: 't.saldo_actual',
    estado: 't.estado'
};
const ORDEN_DEFAULT = 't.id DESC';
const ESTADOS = ['pendiente', 'pagado'];

exports.handler = async (event) => {
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    const { pagina = '1', porPagina, texto, estado, ordenarPor, orden } = event.queryStringParameters || {};

    const porPaginaNum = OPCIONES_POR_PAGINA.includes(parseInt(porPagina))
        ? parseInt(porPagina)
        : POR_PAGINA_DEFAULT;

    let orderBy = ORDEN_DEFAULT;
    if (COLUMNAS_ORDEN[ordenarPor]) {
        const direccion = orden === 'desc' ? 'DESC' : 'ASC';
        orderBy = `${COLUMNAS_ORDEN[ordenarPor]} ${direccion}, t.id DESC`;
    }

    const paginaNum = Math.max(1, parseInt(pagina));
    const offset = (paginaNum - 1) * porPaginaNum;

    const condiciones = [];
    const valores = [];
    if (texto) {
        condiciones.push('(t.descripcion LIKE ? OR c.nombre LIKE ?)');
        valores.push(`%${texto}%`, `%${texto}%`);
    }
    if (estado && ESTADOS.includes(estado)) {
        condiciones.push('t.estado = ?');
        valores.push(estado);
    }
    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    try {
        const db = await obtenerConexion();

        const [conteo] = await db.execute(
            `SELECT COUNT(*) AS total
             FROM terrenos t JOIN compradores c ON t.comprador_id = c.id
             ${where}`,
            valores
        );
        const total = conteo[0].total;
        const totalPaginas = Math.max(1, Math.ceil(total / porPaginaNum));

        const [items] = await db.execute(
            `SELECT t.id, t.descripcion, t.costo_total, t.abono_minimo, t.saldo_actual,
                    t.dia_pago, t.estado, c.nombre AS comprador_nombre,
                    (SELECT COUNT(*) FROM recibos r WHERE r.terreno_id = t.id) AS recibos_count
             FROM terrenos t JOIN compradores c ON t.comprador_id = c.id
             ${where}
             ORDER BY ${orderBy}
             LIMIT ${porPaginaNum} OFFSET ${offset}`,
            valores
        );

        return { statusCode: 200, body: JSON.stringify({ items, total, totalPaginas }) };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno del servidor' }) };
    }
};
