const crypto = require('crypto');

function obtenerKioskTokenEsperado() {
    const t = process.env.KIOSK_TOKEN;
    return t && String(t).trim() ? String(t).trim() : null;
}

function tokenKioskEnRequest(req) {
    const header = req.headers['x-kiosk-token'];
    if (header && String(header).trim()) return String(header).trim();
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Kiosk ')) return auth.slice(6).trim();
    return null;
}

function tokensIguales(a, b) {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) {
        if (ba.length) crypto.timingSafeEqual(ba, ba);
        return false;
    }
    return crypto.timingSafeEqual(ba, bb);
}

/**
 * Protege POST /registrar en tablets.
 * - Si KIOSK_TOKEN está definido: header obligatorio X-Kiosk-Token (o Authorization: Kiosk <token>).
 * - Si no está definido: solo permite en no-producción (desarrollo local).
 */
function requireKiosk(req, res, next) {
    const esperado = obtenerKioskTokenEsperado();
    const enviado = tokenKioskEnRequest(req);

    if (esperado) {
        if (!enviado || !tokensIguales(enviado, esperado)) {
            return res.status(401).json({
                success: false,
                message:
                    'Token de kiosk inválido o faltante. Configura KIOSK_TOKEN en el servidor y el mismo valor en la tablet (ver README).'
            });
        }
        return next();
    }

    if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({
            success: false,
            message:
                'KIOSK_TOKEN no está configurado en el servidor. Define la variable de entorno antes de exponer el registro de asistencia.'
        });
    }

    console.warn(
        '⚠️ KIOSK_TOKEN no definido: /api/asistencia/registrar acepta peticiones sin token (solo desarrollo).'
    );
    return next();
}

module.exports = {
    requireKiosk,
    obtenerKioskTokenEsperado,
    tokenKioskEnRequest
};
