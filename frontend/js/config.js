// Configuración de la API
// Detecta automáticamente si está en desarrollo o producción

const API_CONFIG = {
    // Si estamos en localhost, usar localhost:3000
    // Si estamos en producción (Railway/Render), usar la URL actual
    getBaseURL: function() {
        // Si estamos en localhost, usar servidor local
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        // Si estamos en producción, usar la URL actual (sin puerto)
        return window.location.origin;
    }
};

// Exportar para usar en otros archivos
window.API_CONFIG = API_CONFIG;


