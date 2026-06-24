const jwt = require('jsonwebtoken');

function verificarToken(event) {
    const cookie = event.headers.cookie || '';
    const match = cookie.match(/token=([^;]+)/);

    if (!match) return null;

    try {
        return jwt.verify(match[1], process.env.JWT_SECRET);
    } catch {
        return null;
    }
}

module.exports = { verificarToken };
