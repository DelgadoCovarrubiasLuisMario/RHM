/**
 * Certificado HTTPS autofirmado para LAN (sin dominio).
 * Los navegadores lo marcan como "no seguro", pero tras aceptar el aviso
 * la página es contexto seguro y la cámara sí puede usarse.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const selfsigned = require('selfsigned');

const CERTS_DIR = path.join(__dirname, '../certs');
const KEY_PATH = path.join(CERTS_DIR, 'server-key.pem');
const CERT_PATH = path.join(CERTS_DIR, 'server-cert.pem');

function listarIpsLan() {
    const ips = new Set(['127.0.0.1']);
    const ifaces = os.networkInterfaces();
    for (const name of Object.keys(ifaces)) {
        for (const iface of ifaces[name] || []) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.add(iface.address);
            }
        }
    }
    return [...ips];
}

function generarCertificado() {
    const ips = listarIpsLan();
    const altNames = [
        { type: 2, value: 'localhost' },
        ...ips.map((ip) => ({ type: 7, ip }))
    ];

    const pems = selfsigned.generate(
        [{ name: 'commonName', value: 'RHM-LAN' }],
        {
            days: 3650,
            keySize: 2048,
            algorithm: 'sha256',
            extensions: [
                { name: 'basicConstraints', cA: false },
                { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
                { name: 'extKeyUsage', serverAuth: true },
                { name: 'subjectAltName', altNames }
            ]
        }
    );

    if (!fs.existsSync(CERTS_DIR)) {
        fs.mkdirSync(CERTS_DIR, { recursive: true });
    }
    fs.writeFileSync(KEY_PATH, pems.private, 'utf8');
    fs.writeFileSync(CERT_PATH, pems.cert, 'utf8');
    console.log(`🔐 Certificado autofirmado creado (${ips.join(', ')})`);
    return { key: pems.private, cert: pems.cert };
}

function obtenerCredencialesHttps() {
    if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
        return {
            key: fs.readFileSync(KEY_PATH, 'utf8'),
            cert: fs.readFileSync(CERT_PATH, 'utf8')
        };
    }
    return generarCertificado();
}

module.exports = {
    obtenerCredencialesHttps,
    listarIpsLan,
    KEY_PATH,
    CERT_PATH
};
