/** Días festivos oficiales LFT, prima y vacaciones por antigüedad (reforma 2023). */

function parseFechaFlexible(valor) {
    if (!valor || typeof valor !== 'string') return null;
    const s = valor.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const [y, m, d] = s.slice(0, 10).split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return Number.isNaN(dt.getTime()) ? null : dt;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
        const [d, m, y] = s.split('/').map(Number);
        const dt = new Date(y, m - 1, d);
        return Number.isNaN(dt.getTime()) ? null : dt;
    }
    return null;
}

function formatearDdMmYyyy(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
}

function nEsimoLunes(year, monthIndex, n) {
    const first = new Date(year, monthIndex, 1);
    const dow = first.getDay();
    const firstMonday = 1 + ((1 - dow + 7) % 7);
    return new Date(year, monthIndex, firstMonday + (n - 1) * 7);
}

function festivosDelAño(year) {
    const items = [
        { date: new Date(year, 0, 1), nombre: 'Año Nuevo' },
        { date: nEsimoLunes(year, 1, 1), nombre: 'Día de la Constitución' },
        { date: nEsimoLunes(year, 2, 3), nombre: 'Natalicio de Benito Juárez' },
        { date: new Date(year, 4, 1), nombre: 'Día del Trabajo' },
        { date: new Date(year, 8, 16), nombre: 'Independencia' },
        { date: nEsimoLunes(year, 10, 3), nombre: 'Revolución Mexicana' },
        { date: new Date(year, 11, 25), nombre: 'Navidad' }
    ];
    if ((year - 2018) % 6 === 0) {
        items.push({ date: new Date(year, 11, 1), nombre: 'Transmisión del Poder Ejecutivo' });
    }
    const map = new Map();
    items.forEach((item) => {
        map.set(formatearDdMmYyyy(item.date), item.nombre);
    });
    return map;
}

const cacheFestivos = new Map();

function mapaFestivosAño(year) {
    if (!cacheFestivos.has(year)) {
        cacheFestivos.set(year, festivosDelAño(year));
    }
    return cacheFestivos.get(year);
}

function esFestivoOficial(fechaStr) {
    const dt = parseFechaFlexible(fechaStr);
    if (!dt) return false;
    return mapaFestivosAño(dt.getFullYear()).has(formatearDdMmYyyy(dt));
}

function nombreFestivo(fechaStr) {
    const dt = parseFechaFlexible(fechaStr);
    if (!dt) return '';
    return mapaFestivosAño(dt.getFullYear()).get(formatearDdMmYyyy(dt)) || '';
}

function aniosCumplidos(ingreso, ref) {
    let n = ref.getFullYear() - ingreso.getFullYear();
    const aniv = new Date(ref.getFullYear(), ingreso.getMonth(), ingreso.getDate());
    if (ref < aniv) n -= 1;
    return Math.max(0, n);
}

/** Art. 76 LFT: 12, 14, 16, 18, 20 y luego +2 cada 5 años. */
function diasVacacionesLFT(fechaIngreso, ref = new Date()) {
    const ingreso = parseFechaFlexible(fechaIngreso);
    if (!ingreso) return 12;
    const años = aniosCumplidos(ingreso, ref);
    if (años <= 1) return 12;
    if (años === 2) return 14;
    if (años === 3) return 16;
    if (años === 4) return 18;
    if (años === 5) return 20;
    return 22 + Math.floor((años - 6) / 5) * 2;
}

function diasVacacionesAnuales(fechaIngreso, diasManual, ref = new Date()) {
    const legal = diasVacacionesLFT(fechaIngreso, ref);
    const manual = parseInt(diasManual, 10);
    if (!Number.isNaN(manual) && manual >= 0) {
        return Math.max(manual, legal);
    }
    return legal;
}

function normalizarFechaIngreso(valor) {
    if (valor === undefined) return undefined;
    if (valor === null || String(valor).trim() === '') return null;
    const dt = parseFechaFlexible(String(valor).trim());
    if (!dt) return false;
    return formatearDdMmYyyy(dt);
}

module.exports = {
    parseFechaFlexible,
    formatearDdMmYyyy,
    esFestivoOficial,
    nombreFestivo,
    diasVacacionesLFT,
    diasVacacionesAnuales,
    normalizarFechaIngreso,
    aniosCumplidos
};
