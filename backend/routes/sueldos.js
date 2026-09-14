const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');
const {
    claveFechaOrden,
    periodoSemanaActual,
    filtrarVacacionesSolapadas,
    formatearFechaLocal
} = require('../lib/fechas');
const { esFestivoOficial, nombreFestivo } = require('../lib/laboral');

// Función para redondear a bloques de 15 minutos (al bloque más cercano)
function redondearABloques15Minutos(horasDecimales) {
    if (horasDecimales <= 0) return 0;
    
    // Convertir horas a minutos
    const minutosTotales = horasDecimales * 60;
    
    // Redondear al bloque de 15 minutos más cercano
    const bloques15Min = Math.round(minutosTotales / 15);
    
    // Si el resultado es 0 pero había horas trabajadas, usar al menos 0.25 (15 minutos)
    if (bloques15Min === 0 && horasDecimales > 0) {
        return 0.25; // Mínimo 15 minutos
    }
    
    // Convertir de vuelta a horas
    return bloques15Min * 15 / 60;
}

// Función para calcular horas trabajadas entre entrada y salida
function calcularHorasTrabajadas(fechaEntrada, horaEntrada, fechaSalida, horaSalida) {
    try {
        const parsearFechaHora = (fecha, hora) => {
            const [dia, mes, año] = fecha.split('/');
            const horaUpper = hora.toUpperCase();
            const esPM = horaUpper.includes('P.M.') || horaUpper.includes('PM') || horaUpper.includes('P. M.');
            const esAM = horaUpper.includes('A.M.') || horaUpper.includes('AM') || horaUpper.includes('A. M.');
            
            const partesHora = hora.match(/(\d+):(\d+):(\d+)/);
            
            if (partesHora) {
                let horas = parseInt(partesHora[1]);
                const minutos = parseInt(partesHora[2]);
                const segundos = parseInt(partesHora[3]);
                
                if (esPM && horas !== 12) {
                    horas += 12;
                } else if (esAM && horas === 12) {
                    horas = 0;
                }
                
                return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), horas, minutos, segundos);
            }
            return null;
        };

        const fechaHoraEntrada = parsearFechaHora(fechaEntrada, horaEntrada);
        const fechaHoraSalida = parsearFechaHora(fechaSalida, horaSalida);

        if (!fechaHoraEntrada || !fechaHoraSalida) {
            return 0;
        }

        const diferenciaMs = fechaHoraSalida - fechaHoraEntrada;
        if (diferenciaMs < 0) {
            return 0;
        }

        // Convertir a horas (con decimales)
        const horasDecimales = diferenciaMs / (1000 * 60 * 60);
        
        // Redondear a bloques de 15 minutos (hacia arriba)
        return redondearABloques15Minutos(horasDecimales);
    } catch (error) {
        console.error('Error al calcular horas:', error);
        return 0;
    }
}

// Función para obtener el día de la semana (0=domingo, 1=lunes, etc.)
function obtenerDiaSemana(fecha) {
    const [dia, mes, año] = fecha.split('/');
    const fechaObj = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
    return fechaObj.getDay();
}

// Función para verificar si es domingo
function esDomingo(fecha) {
    return obtenerDiaSemana(fecha) === 0;
}

// Función para generar todas las fechas entre fechaInicio y fechaFin (formato DD/MM/YYYY)
function generarFechasEntre(fechaInicio, fechaFin) {
    const fechas = [];
    const [diaInicio, mesInicio, añoInicio] = fechaInicio.split('/').map(Number);
    const [diaFin, mesFin, añoFin] = fechaFin.split('/').map(Number);
    
    const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
    const fin = new Date(añoFin, mesFin - 1, diaFin);
    
    const fechaActual = new Date(inicio);
    while (fechaActual <= fin) {
        const dia = String(fechaActual.getDate()).padStart(2, '0');
        const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
        const año = fechaActual.getFullYear();
        fechas.push(`${dia}/${mes}/${año}`);
        fechaActual.setDate(fechaActual.getDate() + 1);
    }
    
    return fechas;
}

// Función para generar fechas en rango (alias para compatibilidad)
function generarFechasEnRango(fechaInicio, fechaFin) {
    return generarFechasEntre(fechaInicio, fechaFin);
}

function desplazarFechaDdMmYyyy(fechaStr, dias) {
    const [dia, mes, año] = String(fechaStr || '').split('/').map(Number);
    const dt = new Date(año, mes - 1, dia);
    dt.setDate(dt.getDate() + dias);
    return formatearFechaLocal(dt);
}

/** Incluye un día extra a cada lado para emparejar turnos que cruzan medianoche. */
function fechasConsultaAsistencia(fechaInicio, fechaFin) {
    const nucleo = generarFechasEnRango(fechaInicio, fechaFin);
    if (!nucleo.length) {
        return [fechaInicio, fechaFin].filter(Boolean);
    }
    return [...new Set([
        desplazarFechaDdMmYyyy(fechaInicio, -1),
        ...nucleo,
        desplazarFechaDdMmYyyy(fechaFin, 1)
    ])];
}

function fechaDentroDePeriodo(fecha, fechaInicio, fechaFin) {
    const k = claveFechaOrden(fecha);
    return k >= claveFechaOrden(fechaInicio) && k <= claveFechaOrden(fechaFin);
}

function timestampAsistenciaSueldo(reg) {
    try {
        const [dia, mes, año] = String(reg.fecha || '').split('/');
        const horaUpper = String(reg.hora || '').toUpperCase();
        const esPM = horaUpper.includes('P.M.') || horaUpper.includes('PM') || horaUpper.includes('P. M.');
        const esAM = horaUpper.includes('A.M.') || horaUpper.includes('AM') || horaUpper.includes('A. M.');
        const partesHora = String(reg.hora || '').match(/(\d+):(\d+):(\d+)/);
        if (!partesHora) return Number(reg.id) || 0;
        let horas = parseInt(partesHora[1], 10);
        const minutos = parseInt(partesHora[2], 10);
        const segundos = parseInt(partesHora[3], 10);
        if (esPM && horas !== 12) horas += 12;
        else if (esAM && horas === 12) horas = 0;
        return new Date(parseInt(año, 10), parseInt(mes, 10) - 1, parseInt(dia, 10), horas, minutos, segundos).getTime();
    } catch {
        return Number(reg.id) || 0;
    }
}

/** Empareja ENTRADA→SALIDA en orden real (incluye turno nocturno que cruza medianoche). */
function emparejarEntradaSalida(registros) {
    const sorted = [...(registros || [])].sort((a, b) => {
        const ta = timestampAsistenciaSueldo(a);
        const tb = timestampAsistenciaSueldo(b);
        if (ta !== tb) return ta - tb;
        return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
    const abiertas = [];
    const pares = [];
    for (const r of sorted) {
        if (r.movimiento === 'ENTRADA' || r.movimiento === 'INGRESO') {
            abiertas.push(r);
        } else if (r.movimiento === 'SALIDA' && abiertas.length > 0) {
            pares.push({ entrada: abiertas.shift(), salida: r });
        }
    }
    return pares;
}

function agruparRegistrosPorDiaEntrada(registros) {
    const registrosPorDia = {};
    emparejarEntradaSalida(registros).forEach(({ entrada, salida }) => {
        const fecha = entrada.fecha;
        if (!registrosPorDia[fecha]) registrosPorDia[fecha] = [];
        registrosPorDia[fecha].push(entrada, salida);
    });
    return registrosPorDia;
}

/** Suma cada par del día (no de la primera entrada a la última salida). */
function resumenJornadaDelDia(registrosDia) {
    const pares = emparejarEntradaSalida(registrosDia);
    if (pares.length === 0) return null;
    let horasTrabajadas = 0;
    pares.forEach(({ entrada, salida }) => {
        horasTrabajadas += calcularHorasTrabajadas(
            entrada.fecha, entrada.hora,
            salida.fecha, salida.hora
        );
    });
    if (horasTrabajadas <= 0) return null;
    return {
        entrada: pares[0].entrada,
        salida: pares[pares.length - 1].salida,
        horasTrabajadas
    };
}

function fechasOrdenadasDeRegistros(registrosPorDia) {
    return Object.keys(registrosPorDia).sort((a, b) => claveFechaOrden(a).localeCompare(claveFechaOrden(b)));
}

// Función para verificar si una fecha está dentro de un rango de vacaciones
function fechaEnVacaciones(fecha, vacaciones) {
    const [dia, mes, año] = fecha.split('/').map(Number);
    const fechaObj = new Date(año, mes - 1, dia);
    
    for (const vac of vacaciones) {
        const [diaInicio, mesInicio, añoInicio] = vac.fecha_inicio.split('/').map(Number);
        const [diaFin, mesFin, añoFin] = vac.fecha_fin.split('/').map(Number);
        const inicio = new Date(añoInicio, mesInicio - 1, diaInicio);
        const fin = new Date(añoFin, mesFin - 1, diaFin);
        
        if (fechaObj >= inicio && fechaObj <= fin) {
            return true;
        }
    }
    
    return false;
}

// Calcular sueldo semanal de un empleado
router.get('/calcular/:empleado_id', (req, res) => {
    const { empleado_id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;
    const db = getDB();

    // Si no hay fechas, usar la semana actual
    let fechaInicio, fechaFin;
    if (fecha_inicio && fecha_fin) {
        fechaInicio = fecha_inicio; // Formato DD/MM/YYYY
        fechaFin = fecha_fin;
    } else {
        const semana = periodoSemanaActual();
        fechaInicio = semana.fechaInicio;
        fechaFin = semana.fechaFin;
    }

    // Obtener empleado
    db.get('SELECT id, nombre, apellido, sueldo_base FROM empleados WHERE id = ?', 
        [empleado_id], 
        (err, empleado) => {
            if (err || !empleado) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Empleado no encontrado' 
                });
            }

            const sueldoBase = empleado.sueldo_base || 2000;
            const pagoPorHora = sueldoBase / 48; // Sueldo base / 48 horas semanales (6 días × 8 horas)

            const fechasEnRango = fechasConsultaAsistencia(fechaInicio, fechaFin);
            
            // Obtener todos los registros de asistencia de la semana
            db.all(
                `SELECT fecha, hora, movimiento, turno 
                 FROM asistencia 
                 WHERE empleado_id = ? 
                 AND fecha IN (${fechasEnRango.map(() => '?').join(',')})
                 ORDER BY fecha ASC, hora ASC`,
                [empleado_id, ...fechasEnRango],
                (err, registros) => {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error al obtener asistencia: ' + err.message 
                        });
                    }

                        // Obtener descuentos varios y vacaciones para este período
                        db.all(
                            `SELECT COALESCE(SUM(monto), 0) as total_descuentos
                             FROM descuentos_varios 
                             WHERE empleado_id = ? 
                             AND fecha_inicio = ? 
                             AND fecha_fin = ?`,
                            [empleado_id, fechaInicio, fechaFin],
                            (err, descuentos) => {
                                if (err) {
                                    return res.status(500).json({ 
                                        success: false, 
                                        message: 'Error al obtener descuentos: ' + err.message 
                                    });
                                }

                                const descuentosVarios = descuentos[0]?.total_descuentos || 0;

                                // Obtener vacaciones que se solapan con el período
                                db.all(
                                    `SELECT fecha_inicio, fecha_fin, dias, año
                                     FROM vacaciones
                                     WHERE empleado_id = ?`,
                                    [empleado_id],
                                    (err, vacaciones) => {
                                        if (err) {
                                            console.error(`Error al obtener vacaciones para empleado ${empleado_id}:`, err);
                                        }

                                        const vacacionesArray = filtrarVacacionesSolapadas(vacaciones, fechaInicio, fechaFin);

                                        // Procesar registros para calcular sueldo
                                        const calculo = calcularSueldoSemanal(registros, sueldoBase, pagoPorHora, fechaInicio, fechaFin, descuentosVarios, vacacionesArray, empleado.nombre, empleado.apellido);
                            
                                        res.json({
                                            success: true,
                                            empleado: `${empleado.nombre} ${empleado.apellido}`,
                                            periodo: {
                                                fecha_inicio: fechaInicio,
                                                fecha_fin: fechaFin
                                            },
                                            sueldo_base: sueldoBase,
                                            pago_por_hora: pagoPorHora,
                                            ...calculo
                                        });
                                    }
                                );
                            }
                        );
                }
            );
        }
    );
});

// Función para verificar si un empleado es patron
function esPatron(nombre, apellido) {
    const nombreCompleto = `${nombre} ${apellido}`.toUpperCase();
    return nombreCompleto.includes('MARTINEZ HUERTA') && 
           (nombreCompleto.includes('JOSÉ FRANCISCO') || nombreCompleto.includes('AMELIA'));
}

// Función principal de cálculo
function calcularSueldoSemanal(registros, sueldoBase, pagoPorHora, fechaInicio, fechaFin, descuentosVarios = 0, vacaciones = [], nombreEmpleado = '', apellidoEmpleado = '') {
    // Si es patron, retornar $6000 fijos (sin descuentos de faltas, solo descuentos varios)
    if (esPatron(nombreEmpleado, apellidoEmpleado)) {
        return {
            desglose_diario: [],
            resumen: {
                dias_trabajados: 0,
                dias_faltados: 0,
                dias_vacaciones: 0,
                dias_festivos: 0,
                horas_dobles: '0.00',
                horas_triples: '0.00',
                horas_turno: '0.00',
                horas_festivo_trabajadas: '0.00'
            },
            calculos: {
                sueldo_base: '6000.00',
                descuento_faltas: '0.00',
                monto_horas_dobles: '0.00',
                monto_horas_triples: '0.00',
                monto_horas_turno: '0.00',
                monto_prima_dominical: '0.00',
                monto_prima_vacacional: '0.00',
                monto_festivo_trabajado: '0.00',
                descuentos_varios: descuentosVarios.toFixed(2)
            },
            total: (6000 - descuentosVarios).toFixed(2),
            es_patron: true
        };
    }
    
    const desgloseDiario = [];
    
    // Variables para acumular horas trabajadas
    let horasNormalesTotales = 0; // Horas normales (hasta 8 por día, excepto domingo)
    let horasExtrasSemanales = 0; // Horas extras acumuladas
    let horasTurnoSemana = 0; // Horas turno acumuladas (máximo 6 por semana)
    /** Turno 4 (Planta): salida entre 16:30 y 18:00 → +1.5 h al sueldo (tarifa normal) */
    let horasPlantaExtraSemana = 0;
    const horasExtrasPorDia = []; // Para distribuir dobles/triples
    let diasTrabajados = 0; // Días con asistencia registrada (para calcular faltas)
    let horasFestivoTrabajadas = 0;
    let trabajoDomingo = false;

    // Agrupar registros por día para procesar entrada/salida
    const registrosPorDia = agruparRegistrosPorDiaEntrada(registros);
    Object.keys(registrosPorDia).forEach((fecha) => {
        if (!fechaDentroDePeriodo(fecha, fechaInicio, fechaFin)) {
            delete registrosPorDia[fecha];
        }
    });

    // Función auxiliar para convertir hora a minutos desde medianoche (para ordenar)
    const horaAMinutos = (hora) => {
        try {
            const horaUpper = hora.toUpperCase();
            const esPM = horaUpper.includes('P.M.') || horaUpper.includes('PM') || horaUpper.includes('P. M.');
            const esAM = horaUpper.includes('A.M.') || horaUpper.includes('AM') || horaUpper.includes('A. M.');
            const partesHora = hora.match(/(\d+):(\d+):(\d+)/);
            
            if (partesHora) {
                let horas = parseInt(partesHora[1]);
                const minutos = parseInt(partesHora[2]);
                
                if (esPM && horas !== 12) {
                    horas += 12;
                } else if (esAM && horas === 12) {
                    horas = 0;
                }
                
                return horas * 60 + minutos;
            }
            return 0;
        } catch {
            return 0;
        }
    };

    // Primera pasada: calcular horas extras y determinar turnos trabajados
    fechasOrdenadasDeRegistros(registrosPorDia).forEach(fecha => {
        const registrosDia = registrosPorDia[fecha];
        const esDomingoDia = esDomingo(fecha);
        const jornada = resumenJornadaDelDia(registrosDia);
        if (!jornada) return;

        const { entrada, salida, horasTrabajadas } = jornada;
        const festivo = esFestivoOficial(fecha);

        if (esDomingoDia) {
            trabajoDomingo = true;
        }
        if (festivo && !esDomingoDia) {
            horasFestivoTrabajadas += horasTrabajadas;
            diasTrabajados++;
        } else if (!esDomingoDia && entrada.turno === 4) {
            const minSalida = horaAMinutos(salida.hora);
            const min1630 = 16 * 60 + 30;
            const min1800 = 18 * 60;
            if (minSalida >= min1630 && minSalida <= min1800) {
                horasPlantaExtraSemana += 1.5;
            }
        }
        if (festivo && !esDomingoDia) {
            // Festivo laboral: el descanso se paga aparte; las horas van a doble, no a extra semanal.
        } else if (!esDomingoDia) {
            diasTrabajados++;
            let horasNormalesDia = Math.min(horasTrabajadas, 8);
            let horasExtrasDia = Math.max(0, horasTrabajadas - 8);
            horasNormalesTotales += horasNormalesDia;
            if (horasExtrasDia > 0) {
                horasExtrasSemanales += horasExtrasDia;
                horasExtrasPorDia.push({
                    fecha,
                    horas_extras: horasExtrasDia,
                    es_domingo: false
                });
            }
            let horasTurnoDia = 0;
            if (entrada.turno === 1) {
                horasTurnoDia = 1;
            } else if (entrada.turno === 3) {
                horasTurnoDia = 0.5;
            }
            horasTurnoSemana += horasTurnoDia;
            if (horasTurnoSemana > 6) {
                horasTurnoSemana = 6;
            }
        } else {
            horasExtrasSemanales += horasTrabajadas;
            horasExtrasPorDia.push({
                fecha,
                horas_extras: horasTrabajadas,
                es_domingo: true
            });
        }
    });

    // Las horas turno ya se calcularon por día arriba

    // Segunda pasada: distribuir horas dobles y triples según acumulación semanal
    let horasDobles = 0;
    let horasTriples = 0;
    let horasExtrasAcumuladas = 0;

    horasExtrasPorDia.forEach(dia => {
        const horasExtrasDia = dia.horas_extras;
        const acumAntes = horasExtrasAcumuladas;
        horasExtrasAcumuladas += horasExtrasDia;
        
        let horasDoblesDia = 0;
        let horasTriplesDia = 0;
        
        if (horasExtrasAcumuladas <= 9) {
            // Todas son dobles
            horasDoblesDia = horasExtrasDia;
            horasDobles += horasDoblesDia;
        } else {
            // Algunas son dobles, otras triples
            if (acumAntes < 9) {
                horasDoblesDia = 9 - acumAntes;
                horasTriplesDia = horasExtrasDia - horasDoblesDia;
            } else {
                // Todas son triples
                horasTriplesDia = horasExtrasDia;
            }
            horasDobles += horasDoblesDia;
            horasTriples += horasTriplesDia;
        }
        
        // Guardar en el objeto para usar después
        dia.horas_dobles = horasDoblesDia;
        dia.horas_triples = horasTriplesDia;
    });

    // Tercera pasada: crear desglose diario completo
    fechasOrdenadasDeRegistros(registrosPorDia).forEach(fecha => {
        const esDomingoDia = esDomingo(fecha);
        const jornada = resumenJornadaDelDia(registrosPorDia[fecha]);
        if (!jornada) return;

        const { entrada, salida, horasTrabajadas } = jornada;
        const festivo = esFestivoOficial(fecha);
        let horasDoblesDia = 0;
        let horasTriplesDia = 0;
        let horasNormalesDia = 0;
        let horasFestivoDia = 0;

        if (festivo && !esDomingoDia) {
            horasFestivoDia = horasTrabajadas;
        } else {
            const diaExtras = horasExtrasPorDia.find(d => d.fecha === fecha);
            if (diaExtras) {
                if (esDomingoDia) {
                    horasDoblesDia = diaExtras.horas_dobles || 0;
                    horasTriplesDia = diaExtras.horas_triples || 0;
                    horasNormalesDia = 0;
                } else {
                    horasNormalesDia = Math.min(horasTrabajadas, 8);
                    if (horasTrabajadas > 8) {
                        horasDoblesDia = diaExtras.horas_dobles || 0;
                        horasTriplesDia = diaExtras.horas_triples || 0;
                    }
                }
            } else {
                horasNormalesDia = Math.min(horasTrabajadas, 8);
            }
        }

        let horasTurnoDia = 0;
        if (!esDomingoDia && !festivo) {
            if (entrada.turno === 1) {
                horasTurnoDia = 1;
            } else if (entrada.turno === 3) {
                horasTurnoDia = 0.5;
            }
        }

        let horasPlantaExtraDia = 0;
        if (!esDomingoDia && !festivo && entrada.turno === 4) {
            const minSalida = horaAMinutos(salida.hora);
            const min1630 = 16 * 60 + 30;
            const min1800 = 18 * 60;
            if (minSalida >= min1630 && minSalida <= min1800) {
                horasPlantaExtraDia = 1.5;
            }
        }

        desgloseDiario.push({
            fecha,
            es_domingo: esDomingoDia,
            es_festivo: festivo,
            nombre_festivo: festivo ? nombreFestivo(fecha) : '',
            turno: entrada.turno,
            hora_entrada: entrada.hora,
            hora_salida: salida.hora,
            horas_trabajadas: horasTrabajadas.toFixed(2),
            horas_normales: horasNormalesDia.toFixed(2),
            horas_dobles: horasDoblesDia.toFixed(2),
            horas_triples: horasTriplesDia.toFixed(2),
            horas_turno: horasTurnoDia.toFixed(2),
            horas_planta_extra: horasPlantaExtraDia.toFixed(2),
            horas_festivo_trabajadas: horasFestivoDia.toFixed(2),
            es_vacaciones: false
        });
    });

    // Cuarta pasada: agregar días de vacaciones y calcular días esperados
    // Generar todas las fechas del período (solo días laborables, sin domingo)
    const todasLasFechas = generarFechasEntre(fechaInicio, fechaFin);
    let diasVacaciones = 0;
    let diasEsperados = 0;
    let diasFestivos = 0;
    
    todasLasFechas.forEach(fecha => {
        const esDomingoDia = esDomingo(fecha);
        const festivo = esFestivoOficial(fecha);

        if (festivo) {
            diasFestivos++;
            horasNormalesTotales += 8;
            if (!esDomingoDia) {
                diasEsperados++;
                diasTrabajados++;
            }
            desgloseDiario.push({
                fecha,
                es_domingo: esDomingoDia,
                es_festivo: true,
                nombre_festivo: nombreFestivo(fecha),
                turno: null,
                hora_entrada: null,
                hora_salida: null,
                horas_trabajadas: '8.00',
                horas_normales: '8.00',
                horas_dobles: '0.00',
                horas_triples: '0.00',
                horas_turno: '0.00',
                horas_planta_extra: '0.00',
                horas_festivo_trabajadas: '0.00',
                es_vacaciones: false,
                es_descanso_obligatorio: true
            });
            return;
        }

        if (!esDomingoDia) {
            diasEsperados++;
            
            const tieneRegistros = registrosPorDia[fecha] && registrosPorDia[fecha].length > 0;
            const estaEnVacaciones = fechaEnVacaciones(fecha, vacaciones);
            
            if (estaEnVacaciones && !tieneRegistros) {
                diasTrabajados++;
                diasVacaciones++;
                horasNormalesTotales += 8;
                
                desgloseDiario.push({
                    fecha,
                    es_domingo: false,
                    es_festivo: false,
                    turno: null,
                    hora_entrada: null,
                    hora_salida: null,
                    horas_trabajadas: '8.00',
                    horas_normales: '8.00',
                    horas_dobles: '0.00',
                    horas_triples: '0.00',
                    horas_turno: '0.00',
                    horas_planta_extra: '0.00',
                    es_vacaciones: true
                });
            }
        }
    });
    
    // Calcular días faltados (días esperados - días trabajados - días de vacaciones)
    const diasFaltados = Math.max(0, diasEsperados - diasTrabajados);
    
    // Calcular montos
    // Sueldo base: se calcula por horas normales trabajadas (NO por días completos)
    const sueldoBaseCalculado = horasNormalesTotales * pagoPorHora;
    
    // Horas extras: dobles (1-9) multiplicador 0.85, triples (10+) multiplicador 0.80
    const montoHorasDobles = horasDobles * pagoPorHora * 2 * 0.85;
    const montoHorasTriples = horasTriples * pagoPorHora * 3 * 0.80;
    
    // Horas turno: multiplicador 0.95 (no 0.85)
    const montoHorasTurno = horasTurnoSemana * pagoPorHora * 2 * 0.95;

    // Turno Planta (4): bloque fijo +1.5 h × tarifa normal si salida 16:30–18:00
    const montoHorasPlantaExtra = horasPlantaExtraSemana * pagoPorHora;

    // Descuento por faltas: se calcula por días faltados (solo para mostrar, NO se aplica)
    // Sueldo por día = Sueldo base / 6 días
    // Descuento = (Sueldo base / 6) × días faltados
    // NOTA: Este descuento NO se aplica al total. Se muestra solo como información.
    // El descuento se aplica naturalmente: si trabaja menos horas, gana menos.
    const sueldoPorDia = sueldoBase / 6;
    const descuentoFaltas = diasFaltados * sueldoPorDia;
    const montoPrimaDominical = trabajoDomingo ? sueldoPorDia * 0.25 : 0;
    const montoPrimaVacacional = diasVacaciones * 8 * pagoPorHora * 0.25;
    const montoFestivoTrabajado = horasFestivoTrabajadas * pagoPorHora * 2;
    
    const totalGanado = sueldoBaseCalculado
        + montoHorasDobles
        + montoHorasTriples
        + montoHorasTurno
        + montoHorasPlantaExtra
        + montoPrimaDominical
        + montoPrimaVacacional
        + montoFestivoTrabajado;
    const totalBruto = totalGanado - descuentosVarios;
    const total = Math.max(0, totalBruto);

    return {
        desglose_diario: desgloseDiario,
        resumen: {
            horas_normales: horasNormalesTotales.toFixed(2),
            horas_dobles: horasDobles.toFixed(2),
            horas_triples: horasTriples.toFixed(2),
            horas_turno: horasTurnoSemana.toFixed(2),
            horas_planta_extra: horasPlantaExtraSemana.toFixed(2),
            horas_festivo_trabajadas: horasFestivoTrabajadas.toFixed(2),
            dias_trabajados: diasTrabajados,
            dias_faltados: diasFaltados,
            dias_vacaciones: diasVacaciones,
            dias_festivos: diasFestivos,
            trabajo_domingo: trabajoDomingo
        },
        calculos: {
            sueldo_base: sueldoBaseCalculado.toFixed(2),
            monto_horas_dobles: montoHorasDobles.toFixed(2),
            monto_horas_triples: montoHorasTriples.toFixed(2),
            monto_horas_turno: montoHorasTurno.toFixed(2),
            monto_horas_planta_extra: montoHorasPlantaExtra.toFixed(2),
            monto_prima_dominical: montoPrimaDominical.toFixed(2),
            monto_prima_vacacional: montoPrimaVacacional.toFixed(2),
            monto_festivo_trabajado: montoFestivoTrabajado.toFixed(2),
            descuento_faltas: descuentoFaltas.toFixed(2),
            descuentos_varios: descuentosVarios.toFixed(2)
        },
        total: total.toFixed(2)
    };
}

// Listar sueldos de todos los empleados de un área
router.get('/listar', (req, res) => {
    const { fecha_inicio, fecha_fin } = req.query;
    const db = getDB();

    // Obtener todos los empleados
    db.all('SELECT id, nombre, apellido, sueldo_base FROM empleados WHERE activo = 1', 
        [], 
        (err, empleados) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener empleados: ' + err.message 
                });
            }

            // Calcular sueldo para cada empleado
            const sueldos = [];
            let procesados = 0;

            if (empleados.length === 0) {
                return res.json({
                    success: true,
                    data: [],
                    total: 0
                });
            }

            let fechaInicio;
            let fechaFin;
            if (fecha_inicio && fecha_fin) {
                fechaInicio = fecha_inicio;
                fechaFin = fecha_fin;
            } else {
                const semana = periodoSemanaActual();
                fechaInicio = semana.fechaInicio;
                fechaFin = semana.fechaFin;
            }

            db.all(
                `SELECT empleado_id FROM pagos WHERE fecha_inicio = ? AND fecha_fin = ?`,
                [fechaInicio, fechaFin],
                (errPagos, pagosRows) => {
                    if (errPagos) {
                        return res.status(500).json({
                            success: false,
                            message: 'Error al consultar pagos: ' + errPagos.message
                        });
                    }
                    const pagados = new Set((pagosRows || []).map((p) => p.empleado_id));

            empleados.forEach(empleado => {
                const sueldoBase = empleado.sueldo_base || 2000;
                const pagoPorHora = sueldoBase / 48;

                const fechasEnRango = fechasConsultaAsistencia(fechaInicio, fechaFin);
                
                // Obtener registros de asistencia
                db.all(
                    `SELECT fecha, hora, movimiento, turno 
                     FROM asistencia 
                     WHERE empleado_id = ? 
                     AND fecha IN (${fechasEnRango.map(() => '?').join(',')})
                     ORDER BY fecha ASC, hora ASC`,
                    [empleado.id, ...fechasEnRango],
                    (err, registros) => {
                        if (err) {
                            console.error(`Error al obtener asistencia para empleado ${empleado.id}:`, err);
                            procesados++;
                            if (procesados === empleados.length) {
                                res.json({
                                    success: true,
                                    periodo: {
                                        fecha_inicio: fechaInicio,
                                        fecha_fin: fechaFin
                                    },
                                    data: sueldos,
                                    total: sueldos.length
                                });
                            }
                            return;
                        }

                        // Obtener descuentos varios para este período
                        db.all(
                            `SELECT COALESCE(SUM(monto), 0) as total_descuentos
                             FROM descuentos_varios 
                             WHERE empleado_id = ? 
                             AND fecha_inicio = ? 
                             AND fecha_fin = ?`,
                            [empleado.id, fechaInicio, fechaFin],
                            (err, descuentos) => {
                                if (err) {
                                    console.error(`Error al obtener descuentos para empleado ${empleado.id}:`, err);
                                    procesados++;
                                    if (procesados === empleados.length) {
                                        res.json({
                                            success: true,
                                            periodo: {
                                                fecha_inicio: fechaInicio,
                                                fecha_fin: fechaFin
                                            },
                                            data: sueldos,
                                            total: sueldos.length
                                        });
                                    }
                                    return;
                                }

                                const descuentosVarios = descuentos[0]?.total_descuentos || 0;

                                // Obtener vacaciones que se solapan con el período
                                db.all(
                                    `SELECT fecha_inicio, fecha_fin, dias, año
                                     FROM vacaciones
                                     WHERE empleado_id = ?`,
                                    [empleado.id],
                                    (err, vacaciones) => {
                                        if (err) {
                                            console.error(`Error al obtener vacaciones para empleado ${empleado.id}:`, err);
                                        }

                                        const vacacionesArray = filtrarVacacionesSolapadas(vacaciones, fechaInicio, fechaFin);
                                        const calculo = calcularSueldoSemanal(registros, sueldoBase, pagoPorHora, fechaInicio, fechaFin, descuentosVarios, vacacionesArray, empleado.nombre, empleado.apellido);
                                        
                                        sueldos.push({
                                            empleado_id: empleado.id,
                                            empleado: `${empleado.nombre} ${empleado.apellido}`,
                                            sueldo_base: sueldoBase,
                                            pago_por_hora: pagoPorHora,
                                            ya_pagado: pagados.has(empleado.id),
                                            periodo: {
                                                fecha_inicio: fechaInicio,
                                                fecha_fin: fechaFin
                                            },
                                            ...calculo
                                        });
                                        
                                        procesados++;
                                        if (procesados === empleados.length) {
                                            res.json({
                                                success: true,
                                                periodo: {
                                                    fecha_inicio: fechaInicio,
                                                    fecha_fin: fechaFin
                                                },
                                                data: sueldos,
                                                total: sueldos.length
                                            });
                                        }
                                    }
                                );
                            }
                        );
                    }
                );
            });
                }
            );
        }
    );
});

const locksPago = new Set();

function dbRunP(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function dbGetP(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row || null);
        });
    });
}

function dbAllP(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

// Pagar sueldo a un empleado (conserva checadas; guarda historial y quita descuentos del período)
router.post('/pagar/:empleado_id', async (req, res) => {
    const { empleado_id } = req.params;
    const { fecha_inicio, fecha_fin } = req.body;
    const db = getDB();

    if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({
            success: false,
            message: 'fecha_inicio y fecha_fin son requeridos'
        });
    }

    const lockKey = `${empleado_id}:${fecha_inicio}:${fecha_fin}`;
    if (locksPago.has(lockKey)) {
        return res.status(429).json({
            success: false,
            message: 'Ya hay un pago en proceso para este empleado y período.'
        });
    }
    locksPago.add(lockKey);

    try {
        const empleado = await dbGetP(
            db,
            'SELECT id, nombre, apellido, sueldo_base FROM empleados WHERE id = ?',
            [empleado_id]
        );
        if (!empleado) {
            return res.status(404).json({ success: false, message: 'Empleado no encontrado' });
        }

        const existente = await dbGetP(
            db,
            `SELECT id FROM pagos
             WHERE empleado_id = ? AND fecha_inicio = ? AND fecha_fin = ?`,
            [empleado_id, fecha_inicio, fecha_fin]
        );
        if (existente) {
            return res.status(409).json({
                success: false,
                message: 'Este período ya fue pagado. Revisa el historial de pagos.'
            });
        }

        const sueldoBase = empleado.sueldo_base || 2000;
        const pagoPorHora = sueldoBase / 48;
        const fechasEnRango = fechasConsultaAsistencia(fecha_inicio, fecha_fin);

        const registros = await dbAllP(
            db,
            `SELECT id, fecha, hora, movimiento, turno
             FROM asistencia
             WHERE empleado_id = ?
             AND fecha IN (${fechasEnRango.map(() => '?').join(',')})
             ORDER BY fecha ASC, hora ASC`,
            [empleado_id, ...fechasEnRango]
        );

        const descuentosRow = await dbGetP(
            db,
            `SELECT COALESCE(SUM(monto), 0) as total_descuentos
             FROM descuentos_varios
             WHERE empleado_id = ? AND fecha_inicio = ? AND fecha_fin = ?`,
            [empleado_id, fecha_inicio, fecha_fin]
        );
        const descuentosVarios = descuentosRow ? descuentosRow.total_descuentos : 0;

        const vacaciones = await dbAllP(
            db,
            `SELECT fecha_inicio, fecha_fin, dias, año FROM vacaciones WHERE empleado_id = ?`,
            [empleado_id]
        );
        const vacacionesArray = filtrarVacacionesSolapadas(vacaciones, fecha_inicio, fecha_fin);

        const calculo = calcularSueldoSemanal(
            registros,
            sueldoBase,
            pagoPorHora,
            fecha_inicio,
            fecha_fin,
            descuentosVarios,
            vacacionesArray,
            empleado.nombre,
            empleado.apellido
        );

        const desgloseJSON = JSON.stringify({
            empleado: `${empleado.nombre} ${empleado.apellido}`,
            periodo: { fecha_inicio, fecha_fin },
            sueldo_base: sueldoBase,
            pago_por_hora: pagoPorHora,
            ...calculo
        });

        await dbRunP(db, 'BEGIN IMMEDIATE');
        try {
            const insert = await dbRunP(
                db,
                `INSERT INTO pagos (empleado_id, fecha_inicio, fecha_fin, area, sueldo_base, total_pagado, desglose)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [empleado_id, fecha_inicio, fecha_fin, null, sueldoBase, calculo.total, desgloseJSON]
            );

            await dbRunP(
                db,
                `DELETE FROM descuentos_varios
                 WHERE empleado_id = ? AND fecha_inicio = ? AND fecha_fin = ?`,
                [empleado_id, fecha_inicio, fecha_fin]
            );

            await dbRunP(db, 'COMMIT');

            return res.json({
                success: true,
                message: `Pago registrado para ${empleado.nombre} ${empleado.apellido}`,
                pago_id: insert.lastID,
                total_pagado: calculo.total
            });
        } catch (txErr) {
            try {
                await dbRunP(db, 'ROLLBACK');
            } catch (rollbackErr) {
                console.error('Error en ROLLBACK de pago:', rollbackErr);
            }
            throw txErr;
        }
    } catch (err) {
        console.error('Error al pagar sueldo:', err);
        if (String(err.message || '').includes('UNIQUE constraint')) {
            return res.status(409).json({
                success: false,
                message: 'Este período ya fue pagado. Revisa el historial de pagos.'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Error al registrar pago: ' + err.message
        });
    } finally {
        locksPago.delete(lockKey);
    }
});

module.exports = router;

