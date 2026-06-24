const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { obtenerConexion } = require('./db');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ mensaje: 'Método no permitido' }) };
    }

    let usuario, contrasena;
    try {
        ({ usuario, contrasena } = JSON.parse(event.body));
    } catch {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Datos inválidos' }) };
    }

    if (!usuario || !contrasena) {
        return { statusCode: 400, body: JSON.stringify({ mensaje: 'Usuario y contraseña requeridos' }) };
    }

    try {
        const db = await obtenerConexion();
        const [filas] = await db.execute(
            'SELECT id, nombre_usuario, nombre, hash_contrasena FROM usuarios WHERE nombre_usuario = ? AND esta_activo = 1',
            [usuario]
        );

        if (filas.length === 0) {
            return { statusCode: 401, body: JSON.stringify({ mensaje: 'Usuario o contraseña incorrectos' }) };
        }

        const user = filas[0];
        const valido = await bcrypt.compare(contrasena, user.hash_contrasena);

        if (!valido) {
            return { statusCode: 401, body: JSON.stringify({ mensaje: 'Usuario o contraseña incorrectos' }) };
        }

        const token = jwt.sign(
            { id: user.id, usuario: user.nombre_usuario, nombre: user.nombre },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        const cookie = `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`;

        return {
            statusCode: 200,
            headers: { 'Set-Cookie': cookie },
            body: JSON.stringify({ nombre: user.nombre })
        };

    } catch (e) {
        console.error(e);
        return { statusCode: 500, body: JSON.stringify({ mensaje: 'Error interno del servidor' }) };
    }
};
