/** Fechas DD/MM/YYYY y semanas laborales (lunes–domingo, hora local). */

function claveFechaOrden(fechaStr) {
    if (!fechaStr || typeof fechaStr !== 'string') return '';
    const trimmed = fechaStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed.replace(/-/g, '');
    }
    const [dia, mes, año] = trimmed.split('/');
    return `${año || ''}${mes || ''}${dia || ''}`;
}

function fechasSeSolapan(inicioA, finA, inicioB, finB) {
    return claveFechaOrden(inicioA) <= claveFechaOrden(finB) && claveFechaOrden(inicioB) <= claveFechaOrden(finA);
}

function lunesDeLaSemana(hoy = new Date()) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function formatearFechaLocal(date) {
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function periodoSemanaActual(hoy = new Date()) {
    const lunes = lunesDeLaSemana(hoy);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return {
        fechaInicio: formatearFechaLocal(lunes),
        fechaFin: formatearFechaLocal(domingo),
        lunes,
        domingo
    };
}

function filtrarVacacionesSolapadas(rows, inicioPeriodo, finPeriodo) {
    return (rows || []).filter((v) =>
        fechasSeSolapan(v.fecha_inicio, v.fecha_fin, inicioPeriodo, finPeriodo)
    );
}

function fechaISOLocal(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

module.exports = {
    claveFechaOrden,
    fechasSeSolapan,
    lunesDeLaSemana,
    formatearFechaLocal,
    periodoSemanaActual,
    filtrarVacacionesSolapadas,
    fechaISOLocal
};
