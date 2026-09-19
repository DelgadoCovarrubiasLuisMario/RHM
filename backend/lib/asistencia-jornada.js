/**
 * Lógica compartida de jornadas: parseo es-MX, emparejamiento FIFO y horas (nómina = checadas).
 * Zona horaria efectiva: America/Mexico_City.
 */

const ZONA_MX = 'America/Mexico_City';

function esEntrada(movimiento) {
    return movimiento === 'ENTRADA' || movimiento === 'INGRESO';
}

/** Parsea DD/MM/YYYY + hora 12h (es-MX / AM-PM) a Date (instante UTC interno). */
function parsearFechaHora(fecha, hora) {
    try {
        if (!fecha || !hora) return null;
        const [dia, mes, año] = String(fecha).split('/');
        const horaUpper = String(hora).toUpperCase();
        const esPM = horaUpper.includes('P.M.') || horaUpper.includes('PM') || horaUpper.includes('P. M.');
        const esAM = horaUpper.includes('A.M.') || horaUpper.includes('AM') || horaUpper.includes('A. M.');

        const partesHora = String(hora).match(/(\d+):(\d+):(\d+)/);
        if (!partesHora) return null;

        let horas = parseInt(partesHora[1], 10);
        const minutos = parseInt(partesHora[2], 10);
        const segundos = parseInt(partesHora[3], 10);

        if (esPM && horas !== 12) {
            horas += 12;
        } else if (esAM && horas === 12) {
            horas = 0;
        }

        return new Date(parseInt(año, 10), parseInt(mes, 10) - 1, parseInt(dia, 10), horas, minutos, segundos);
    } catch (error) {
        return null;
    }
}

function timestampRegistro(reg) {
    const parsed = parsearFechaHora(reg.fecha, reg.hora);
    if (parsed && !Number.isNaN(parsed.getTime())) {
        return parsed.getTime();
    }
    if (reg.creado_en) {
        const c = new Date(reg.creado_en);
        if (!Number.isNaN(c.getTime())) return c.getTime();
    }
    return Number(reg.id) || 0;
}

function compararRegistrosCronologicos(a, b) {
    const ta = timestampRegistro(a);
    const tb = timestampRegistro(b);
    if (ta !== tb) return ta - tb;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
}

/**
 * Emparejamiento FIFO: la primera entrada abierta se cierra con la siguiente salida.
 */
function emparejarEntradaSalida(registros) {
    const sorted = [...(registros || [])].sort(compararRegistrosCronologicos);
    const abiertas = [];
    const pares = [];
    for (const r of sorted) {
        if (registroAnulado(r)) continue;
        if (esEntrada(r.movimiento)) {
            abiertas.push(r);
        } else if (r.movimiento === 'SALIDA' && abiertas.length > 0) {
            pares.push({ entrada: abiertas.shift(), salida: r });
        }
    }
    return pares;
}

function registroAnulado(reg) {
    return reg && (reg.anulado === 1 || reg.anulado === true);
}

/** Entradas sin salida emparejada (FIFO). */
function encontrarEntradasAbiertas(registros) {
    const sorted = [...(registros || [])]
        .filter((r) => !registroAnulado(r))
        .sort(compararRegistrosCronologicos);
    const abiertas = [];
    for (const r of sorted) {
        if (esEntrada(r.movimiento)) {
            abiertas.push(r);
        } else if (r.movimiento === 'SALIDA' && abiertas.length > 0) {
            abiertas.shift();
        }
    }
    return abiertas;
}

function entradaParaSalida(registrosEmpleado, salida) {
    const pares = emparejarEntradaSalida(registrosEmpleado);
    const par = pares.find((p) => p.salida.id === salida.id);
    return par ? par.entrada : null;
}

/**
 * IDs a borrar en DELETE admin: el registro objetivo y, si es ENTRADA con SALIDA FIFO emparejada, también esa SALIDA.
 */
function resolverIdsEliminacionAsistencia(registros, registroObjetivo) {
    const ids = [registroObjetivo.id];
    if (esEntrada(registroObjetivo.movimiento)) {
        const par = emparejarEntradaSalida(registros).find((p) => p.entrada.id === registroObjetivo.id);
        if (par && par.salida) {
            ids.push(par.salida.id);
        }
    }
    return [...new Set(ids)];
}

function redondearABloques15Minutos(horasDecimales) {
    if (horasDecimales <= 0) return 0;
    const minutosTotales = horasDecimales * 60;
    const bloques15Min = Math.round(minutosTotales / 15);
    if (bloques15Min === 0 && horasDecimales > 0) {
        return 0.25;
    }
    return (bloques15Min * 15) / 60;
}

function formatearHorasDecimales(horasDecimales) {
    if (horasDecimales <= 0) return null;
    const minutosTotales = Math.round(horasDecimales * 60);
    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;
    if (horas > 0 && minutos > 0) return `${horas}h ${minutos}m`;
    if (horas > 0) return `${horas}h`;
    return `${minutos}m`;
}

function calcularHorasTrabajadasDecimales(fechaEntrada, horaEntrada, fechaSalida, horaSalida) {
    const fechaHoraEntrada = parsearFechaHora(fechaEntrada, horaEntrada);
    const fechaHoraSalida = parsearFechaHora(fechaSalida, horaSalida);
    if (!fechaHoraEntrada || !fechaHoraSalida) return 0;
    const diferenciaMs = fechaHoraSalida - fechaHoraEntrada;
    if (diferenciaMs < 0) return 0;
    const horasExactas = diferenciaMs / (1000 * 60 * 60);
    return redondearABloques15Minutos(horasExactas);
}

function calcularTiempoTrabajado(fechaEntrada, horaEntrada, fechaSalida, horaSalida) {
    const horas = calcularHorasTrabajadasDecimales(fechaEntrada, horaEntrada, fechaSalida, horaSalida);
    return formatearHorasDecimales(horas);
}

function partesEnZonaMexico(date = new Date()) {
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: ZONA_MX,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    const parts = fmt.formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return {
        day: get('day'),
        month: get('month'),
        year: get('year'),
        hour: get('hour'),
        minute: get('minute'),
        second: get('second'),
        dayPeriod: get('dayPeriod')
    };
}

/** Fecha/hora de checada autoritativa del servidor (America/Mexico_City, formato pantalla es-MX). */
function fechaHoraServidorMexico(date = new Date()) {
    const p = partesEnZonaMexico(date);
    const fecha = `${p.day}/${p.month}/${p.year}`;
    const periodo =
        p.dayPeriod === 'PM' || p.dayPeriod === 'pm' ? 'p.m.' : 'a.m.';
    const hora = `${p.hour}:${p.minute}:${p.second} ${periodo}`;
    return { fecha, hora };
}

module.exports = {
    ZONA_MX,
    esEntrada,
    parsearFechaHora,
    timestampRegistro,
    compararRegistrosCronologicos,
    emparejarEntradaSalida,
    encontrarEntradasAbiertas,
    entradaParaSalida,
    resolverIdsEliminacionAsistencia,
    redondearABloques15Minutos,
    formatearHorasDecimales,
    calcularHorasTrabajadasDecimales,
    calcularTiempoTrabajado,
    fechaHoraServidorMexico,
    registroAnulado
};
