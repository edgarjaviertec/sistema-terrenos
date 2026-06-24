const { verificarToken } = require('./auth-verificar');

exports.handler = async (event) => {
    const usuario = verificarToken(event);
    if (!usuario) {
        return { statusCode: 401, body: JSON.stringify({ mensaje: 'No autorizado' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ nombre: usuario.nombre }) };
};
