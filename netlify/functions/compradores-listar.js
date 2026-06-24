const { obtenerConexion } = require('./db');
const { verificarToken } = require('./auth-verificar');

const OPCIONES_POR_PAGINA = [10, 25, 50, 100];
const POR_PAGINA_DEFAULT = 10;

const COLUMNAS_ORDEN = {
    nombre: 'c.nombre',
    telefono: 'c.telefono',
    terrenos: 'terrenos_count'
};
const ORDEN_DEFAULT = 'c.nombre ASC';

exports.handler = async (event) => {
    if (!verificarToken(event)) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }

    const { pagina = '1', porPagina, texto, ordenarPor, orden } = event.queryStringParameters || {};

    const porPaginaNum = OPCIONES_POR_PAGINA.includes(parseInt(porPagina))
        ? parseInt(porPagina)
        : POR_PAGINA_DEFAULT;

    let orderBy = ORDEN_DEFAULT;
    if (COLUMNAS_ORDEN[ordenarPor]) {
        const direccion = orden === 'desc' ? 'DESC' : 'ASC';
        orderBy = `${COLUMNAS_ORDEN[ordenarPor]} ${direccion}, c.id DESC`;
    }

    const paginaNum = Math.max(1, parseInt(pagina));
    const offset = (paginaNum - 1) * porPaginaNum;

    const condiciones = [];
    const valores = [];
    if (texto) {
        condiciones.push('(c.nombre LIKE ? OR c.telefono LIKE ?)');
        valores.push(`%${texto}%`, `%${texto}%`);
    }
    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    try {
        const db = await obtenerConexion();

        const [conteo] = await db.execute(
            `SELECT COUNT(*) AS total FROM compradores c ${where}`,
            valores
        );
        const total = conteo[0].total;
        const totalPaginas = Math.max(1, Math.ceil(total / porPaginaNum));

        const [items] = await db.execute(
            `SELECT c.id, c.nombre, c.telefono, c.direccion,
                    (SELECT COUNT(*) FROM terrenos t WHERE t.comprador_id = c.id) AS terrenos_count,
                    (SELECT COUNT(*) FROM recibos r JOIN terrenos t ON r.terreno_id = t.id WHERE t.comprador_id = c.id) AS recibos_count
             FROM compradores c
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
