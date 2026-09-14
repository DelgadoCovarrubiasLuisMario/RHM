const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { getDB } = require('../database/db');

const TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12 horas
const SECRET_FILE = path.join(__dirname, '../../database/.admin-secret');

function obtenerSecretAdmin() {
    const envSecret = process.env.ADMIN_AUTH_SECRET;
    if (envSecret && envSecret.trim() && envSecret !== 'rhm-dev-secret-change-me') {
        return envSecret.trim();
    }
    try {
        if (fs.existsSync(SECRET_FILE)) {
            const stored = fs.readFileSync(SECRET_FILE, 'utf8').trim();
            if (stored) return stored;
        }
    } catch (err) {
        console.error('No se pudo leer secret admin:', err.message);
    }
    const generated = crypto.randomBytes(32).toString('hex');
    try {
        fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
        fs.writeFileSync(SECRET_FILE, generated, { encoding: 'utf8', mode: 0o600 });
        console.log('🔐 Secret admin persistido en database/.admin-secret');
    } catch (err) {
        console.error('No se pudo guardar secret admin:', err.message);
    }
    return generated;
}

const ADMIN_AUTH_SECRET = obtenerSecretAdmin();

function firmasIguales(a, b) {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) {
        crypto.timingSafeEqual(ba, ba);
        return false;
    }
    return crypto.timingSafeEqual(ba, bb);
}

function b64url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function signToken(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + TOKEN_TTL_SECONDS
    };

    const encodedHeader = b64url(JSON.stringify(header));
    const encodedPayload = b64url(JSON.stringify(fullPayload));
    const body = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
        .createHmac('sha256', ADMIN_AUTH_SECRET)
        .update(body)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${body}.${signature}`;
}

function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const body = `${header}.${payload}`;
    const expected = crypto
        .createHmac('sha256', ADMIN_AUTH_SECRET)
        .update(body)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    if (!firmasIguales(signature, expected)) return null;

    try {
        const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(Buffer.from(normalizedPayload, 'base64').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);
        if (!decoded.exp || decoded.exp < now) return null;
        return decoded;
    } catch (error) {
        return null;
    }
}

function getTokenFromRequest(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim();
    }
    return req.headers['x-admin-token'] || null;
}

router.post('/admin/login', (req, res) => {
    const { usuario, password } = req.body || {};
    if (!usuario || !password) {
        return res.status(400).json({
            success: false,
            message: 'Usuario y contraseña son requeridos'
        });
    }

    const db = getDB();
    db.get(
        'SELECT id, usuario, password, nombre FROM administradores WHERE usuario = ?',
        [usuario],
        (err, admin) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al validar credenciales'
                });
            }
            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario o contraseña incorrectos'
                });
            }

            // El proyecto actual guarda password en texto plano.
            // Se compara de forma exacta para bloquear accesos inválidos.
            if (String(password) !== String(admin.password)) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario o contraseña incorrectos'
                });
            }

            const token = signToken({
                sub: admin.id,
                usuario: admin.usuario,
                rol: 'admin'
            });

            return res.json({
                success: true,
                message: 'Acceso concedido',
                token,
                admin: {
                    id: admin.id,
                    usuario: admin.usuario,
                    nombre: admin.nombre
                }
            });
        }
    );
});

router.get('/admin/verify', (req, res) => {
    const token = getTokenFromRequest(req);
    const decoded = verifyToken(token);
    if (!decoded || decoded.rol !== 'admin') {
        return res.status(401).json({
            success: false,
            message: 'Sesión inválida o expirada'
        });
    }
    return res.json({
        success: true,
        admin: {
            id: decoded.sub,
            usuario: decoded.usuario
        }
    });
});

function requestEsAdmin(req) {
    const decoded = verifyToken(getTokenFromRequest(req));
    return Boolean(decoded && decoded.rol === 'admin');
}

module.exports = router;
module.exports.verifyToken = verifyToken;
module.exports.getTokenFromRequest = getTokenFromRequest;
module.exports.requestEsAdmin = requestEsAdmin;
module.exports.requireAdmin = function requireAdmin(req, res, next) {
    const decoded = verifyToken(getTokenFromRequest(req));
    if (!decoded || decoded.rol !== 'admin') {
        return res.status(401).json({
            success: false,
            message: 'Sesión inválida o expirada'
        });
    }
    req.admin = decoded;
    return next();
};
