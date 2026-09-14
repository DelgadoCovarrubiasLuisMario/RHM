// Configuración de la API
// Detecta automáticamente si está en desarrollo o producción

const API_CONFIG = {
    getBaseURL: function() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3000';
        }
        return window.location.origin;
    }
};

window.API_CONFIG = API_CONFIG;

window.fechaISOLocal = function fechaISOLocal(date) {
    const d = date instanceof Date ? date : new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

window.lunesDeLaSemana = function lunesDeLaSemana(hoy) {
    const d = new Date((hoy || new Date()).getFullYear(), (hoy || new Date()).getMonth(), (hoy || new Date()).getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
};

window.periodoSemanaISO = function periodoSemanaISO(hoy) {
    const lunes = window.lunesDeLaSemana(hoy);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return {
        inicio: window.fechaISOLocal(lunes),
        fin: window.fechaISOLocal(domingo)
    };
};


