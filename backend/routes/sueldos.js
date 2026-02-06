const express = require('express');
const router = express.Router();
const { getDB } = require('../database/db');

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
        let horasDecimales = diferenciaMs / (1000 * 60 * 60);
        
        // CORTE AUTOMÁTICO: Si excede 9.5 horas, cortar a 9.5 horas
        if (horasDecimales > 9.5) {
            horasDecimales = 9.5;
        }
        
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
        const hoy = new Date();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - hoy.getDay() + 1); // Lunes de esta semana
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6); // Domingo de esta semana
        
        fechaInicio = lunes.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
        fechaFin = domingo.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

            // Generar todas las fechas en el rango
            const fechasEnRango = generarFechasEnRango(fechaInicio, fechaFin);
            
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
                                     WHERE empleado_id = ?
                                     AND NOT (fecha_fin < ? OR fecha_inicio > ?)`,
                                    [empleado_id, fechaInicio, fechaFin],
                                    (err, vacaciones) => {
                                        if (err) {
                                            console.error(`Error al obtener vacaciones para empleado ${empleado_id}:`, err);
                                        }

                                        const vacacionesArray = vacaciones || [];

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
                horas_dobles: '0.00',
                horas_triples: '0.00',
                horas_turno: '0.00'
            },
            calculos: {
                sueldo_base: '6000.00',
                descuento_faltas: '0.00',
                monto_horas_dobles: '0.00',
                monto_horas_triples: '0.00',
                monto_horas_turno: '0.00',
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
    const horasExtrasPorDia = []; // Para distribuir dobles/triples
    let diasTrabajados = 0; // Días con asistencia registrada (para calcular faltas)

    // Agrupar registros por día para procesar entrada/salida
    const registrosPorDia = {};
    registros.forEach(reg => {
        // Usar la fecha de entrada para agrupar (si cruza medianoche, se cuenta en el día de entrada)
        if (!registrosPorDia[reg.fecha]) {
            registrosPorDia[reg.fecha] = [];
        }
        registrosPorDia[reg.fecha].push(reg);
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
    Object.keys(registrosPorDia).sort().forEach(fecha => {
        const registrosDia = registrosPorDia[fecha];
        const esDomingoDia = esDomingo(fecha);
        
        // Emparejar entrada con salida: PRIMERA entrada y ÚLTIMA salida del día
        let entrada = null;
        let salida = null;
        
        // Ordenar registros por hora para encontrar la primera entrada y última salida
        const registrosOrdenados = [...registrosDia].sort((a, b) => {
            return horaAMinutos(a.hora) - horaAMinutos(b.hora);
        });
        
        // Buscar la PRIMERA entrada
        for (let i = 0; i < registrosOrdenados.length; i++) {
            if (registrosOrdenados[i].movimiento === 'ENTRADA' || registrosOrdenados[i].movimiento === 'INGRESO') {
                entrada = registrosOrdenados[i];
                break; // Tomar la primera entrada
            }
        }
        
        // Buscar la ÚLTIMA salida
        for (let i = registrosOrdenados.length - 1; i >= 0; i--) {
            if (registrosOrdenados[i].movimiento === 'SALIDA') {
                salida = registrosOrdenados[i];
                break; // Tomar la última salida
            }
        }
        
        if (entrada && salida) {
            let horasTrabajadas = calcularHorasTrabajadas(
                entrada.fecha, entrada.hora, 
                salida.fecha, salida.hora
            );
            
            // Verificar si hay un corte automático procesado para este día
            // Si el admin eligió "eliminar", solo contar 8 horas en lugar de 9.5
            db.get(
                `SELECT accion_admin FROM cortes_automaticos 
                 WHERE empleado_id = ? AND fecha = ? AND asistencia_id = ? AND procesado = 1`,
                [empleado_id, fecha, salida.id],
                (err, corte) => {
                    if (!err && corte && corte.accion_admin === 'eliminar') {
                        // Si el admin eligió eliminar horas extra, solo contar 8 horas
                        horasTrabajadas = Math.min(horasTrabajadas, 8);
                    }
                    
                    procesarHorasDia(horasTrabajadas);
                }
            );
            
            function procesarHorasDia(horasTrabajadas) {
                // Solo procesar si hay horas trabajadas (aunque sean pocas, como 1 hora)
                if (horasTrabajadas > 0) {
                    if (!esDomingoDia) {
                        // Contar como día trabajado (para calcular faltas)
                        diasTrabajados++;
                        
                        // Días normales: primeras 8 horas son normales, el resto extras
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
                    
                    // Calcular horas turno por día
                    let horasTurnoDia = 0;
                    if (entrada.turno === 1) {
                        horasTurnoDia = 1; // Turno 1 = 1 hora turno
                    } else if (entrada.turno === 3) {
                        horasTurnoDia = 0.5; // Turno 3 = 0.5 horas turno
                    }
                    // Turno 2 = 0 horas turno
                    
                    // Acumular horas turno (máximo 6 por semana)
                    horasTurnoSemana += horasTurnoDia;
                    if (horasTurnoSemana > 6) {
                        horasTurnoSemana = 6; // Limitar a 6 horas por semana
                    }
                } else {
                    // Domingo: TODAS las horas se cuentan como horas extras (dobles/triples según acumulación semanal)
                    horasExtrasSemanales += horasTrabajadas;
                    horasExtrasPorDia.push({
                        fecha,
                        horas_extras: horasTrabajadas,
                        es_domingo: true
                    });
                }
            }
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
    Object.keys(registrosPorDia).sort().forEach(fecha => {
        const registrosDia = registrosPorDia[fecha];
        const esDomingoDia = esDomingo(fecha);
        
        // Buscar entrada y salida: PRIMERA entrada y ÚLTIMA salida del día
        let entrada = null;
        let salida = null;
        
        // Ordenar registros por hora para encontrar la primera entrada y última salida
        const registrosOrdenados = [...registrosDia].sort((a, b) => {
            return horaAMinutos(a.hora) - horaAMinutos(b.hora);
        });
        
        // Buscar la PRIMERA entrada
        for (let i = 0; i < registrosOrdenados.length; i++) {
            if (registrosOrdenados[i].movimiento === 'ENTRADA' || registrosOrdenados[i].movimiento === 'INGRESO') {
                entrada = registrosOrdenados[i];
                break; // Tomar la primera entrada
            }
        }
        
        // Buscar la ÚLTIMA salida
        for (let i = registrosOrdenados.length - 1; i >= 0; i--) {
            if (registrosOrdenados[i].movimiento === 'SALIDA') {
                salida = registrosOrdenados[i];
                break; // Tomar la última salida
            }
        }
        
        if (entrada && salida) {
            const horasTrabajadas = calcularHorasTrabajadas(
                entrada.fecha, entrada.hora, 
                salida.fecha, salida.hora
            );

            // Incluir en el desglose aunque sean pocas horas (ej: 1 hora)
            if (horasTrabajadas > 0) {
                let horasDoblesDia = 0;
                let horasTriplesDia = 0;
                let horasNormalesDia = 0;

                // Buscar en el array de horas extras para saber cuántas son dobles/triples
                const diaExtras = horasExtrasPorDia.find(d => d.fecha === fecha);
                if (diaExtras) {
                    if (esDomingoDia) {
                        // Domingo: todas las horas se cuentan como horas extras (dobles/triples según acumulación)
                        horasDoblesDia = diaExtras.horas_dobles || 0;
                        horasTriplesDia = diaExtras.horas_triples || 0;
                        horasNormalesDia = 0;
                    } else {
                        // Días normales: primeras 8 horas normales, resto extras
                        horasNormalesDia = Math.min(horasTrabajadas, 8);
                        if (horasTrabajadas > 8) {
                            horasDoblesDia = diaExtras.horas_dobles || 0;
                            horasTriplesDia = diaExtras.horas_triples || 0;
                        }
                    }
                } else {
                    // No hay extras, todas son normales (hasta 8 horas)
                    horasNormalesDia = Math.min(horasTrabajadas, 8);
                }

                // Calcular horas turno del día
                let horasTurnoDia = 0;
                if (!esDomingoDia) {
                    if (entrada.turno === 1) {
                        horasTurnoDia = 1;
                    } else if (entrada.turno === 3) {
                        horasTurnoDia = 0.5;
                    }
                }

                desgloseDiario.push({
                    fecha,
                    es_domingo: esDomingoDia,
                    turno: entrada.turno,
                    hora_entrada: entrada.hora,
                    hora_salida: salida.hora,
                    horas_trabajadas: horasTrabajadas.toFixed(2),
                    horas_normales: horasNormalesDia.toFixed(2),
                    horas_dobles: horasDoblesDia.toFixed(2),
                    horas_triples: horasTriplesDia.toFixed(2),
                    horas_turno: horasTurnoDia.toFixed(2),
                    es_vacaciones: false
                });
            }
        }
    });

    // Cuarta pasada: agregar días de vacaciones y calcular días esperados
    // Generar todas las fechas del período (solo días laborables, sin domingo)
    const todasLasFechas = generarFechasEntre(fechaInicio, fechaFin);
    let diasVacaciones = 0;
    let diasEsperados = 0;
    
    todasLasFechas.forEach(fecha => {
        const esDomingoDia = esDomingo(fecha);
        // Solo considerar días laborables (lunes a sábado)
        if (!esDomingoDia) {
            diasEsperados++; // Contar días esperados
            
            const tieneRegistros = registrosPorDia[fecha] && registrosPorDia[fecha].length > 0;
            const estaEnVacaciones = fechaEnVacaciones(fecha, vacaciones);
            
            // Si está en vacaciones y no tiene registros, agregar 8 horas normales
            if (estaEnVacaciones && !tieneRegistros) {
                diasTrabajados++; // Contar como día trabajado (no falta)
                diasVacaciones++;
                horasNormalesTotales += 8; // 8 horas por día de vacaciones
                
                desgloseDiario.push({
                    fecha,
                    es_domingo: false,
                    turno: null,
                    hora_entrada: null,
                    hora_salida: null,
                    horas_trabajadas: '8.00',
                    horas_normales: '8.00',
                    horas_dobles: '0.00',
                    horas_triples: '0.00',
                    horas_turno: '0.00',
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

    // Descuento por faltas: se calcula por días faltados (solo para mostrar, NO se aplica)
    // Sueldo por día = Sueldo base / 6 días
    // Descuento = (Sueldo base / 6) × días faltados
    // NOTA: Este descuento NO se aplica al total. Se muestra solo como información.
    // El descuento se aplica naturalmente: si trabaja menos horas, gana menos.
    const sueldoPorDia = sueldoBase / 6;
    const descuentoFaltas = diasFaltados * sueldoPorDia;
    
    // Calcular total semanal:
    // (Horas trabajadas con cálculos pertinentes) - (Solo descuentos varios, NO descuento por faltas)
    // El descuento por faltas se aplica naturalmente: si trabaja menos horas, gana menos
    const totalGanado = sueldoBaseCalculado + montoHorasDobles + montoHorasTriples + montoHorasTurno;
    const totalBruto = totalGanado - descuentosVarios; // NO restar descuentoFaltas
    const total = Math.max(0, totalBruto); // El total no puede ser negativo (solo por descuentos varios)

    return {
        desglose_diario: desgloseDiario,
        resumen: {
            horas_normales: horasNormalesTotales.toFixed(2),
            horas_dobles: horasDobles.toFixed(2),
            horas_triples: horasTriples.toFixed(2),
            horas_turno: horasTurnoSemana.toFixed(2),
            dias_trabajados: diasTrabajados,
            dias_faltados: diasFaltados,
            dias_vacaciones: diasVacaciones
        },
        calculos: {
            sueldo_base: sueldoBaseCalculado.toFixed(2),
            monto_horas_dobles: montoHorasDobles.toFixed(2),
            monto_horas_triples: montoHorasTriples.toFixed(2),
            monto_horas_turno: montoHorasTurno.toFixed(2),
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

            empleados.forEach(empleado => {
                const sueldoBase = empleado.sueldo_base || 2000;
                const pagoPorHora = sueldoBase / 48; // Sueldo base / 48 horas semanales (6 días × 8 horas)

                // Determinar fechas
                let fechaInicio, fechaFin;
                if (fecha_inicio && fecha_fin) {
                    fechaInicio = fecha_inicio;
                    fechaFin = fecha_fin;
                } else {
                    const hoy = new Date();
                    const lunes = new Date(hoy);
                    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
                    const domingo = new Date(lunes);
                    domingo.setDate(lunes.getDate() + 6);
                    
                    fechaInicio = lunes.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    fechaFin = domingo.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
                }

                // Generar todas las fechas en el rango
                const fechasEnRango = generarFechasEnRango(fechaInicio, fechaFin);
                
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
                                     WHERE empleado_id = ?
                                     AND NOT (fecha_fin < ? OR fecha_inicio > ?)`,
                                    [empleado.id, fechaInicio, fechaFin],
                                    (err, vacaciones) => {
                                        if (err) {
                                            console.error(`Error al obtener vacaciones para empleado ${empleado.id}:`, err);
                                        }

                                        const vacacionesArray = vacaciones || [];
                                        const calculo = calcularSueldoSemanal(registros, sueldoBase, pagoPorHora, fechaInicio, fechaFin, descuentosVarios, vacacionesArray, empleado.nombre, empleado.apellido);
                                        
                                        sueldos.push({
                                            empleado_id: empleado.id,
                                            empleado: `${empleado.nombre} ${empleado.apellido}`,
                                            sueldo_base: sueldoBase,
                                            pago_por_hora: pagoPorHora,
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
});

// Pagar sueldo a un empleado (elimina asistencia y descuentos, guarda en historial)
router.post('/pagar/:empleado_id', (req, res) => {
    const { empleado_id } = req.params;
    const { fecha_inicio, fecha_fin } = req.body;
    const db = getDB();

    if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ 
            success: false, 
            message: 'fecha_inicio y fecha_fin son requeridos' 
        });
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

            // Obtener registros de asistencia para calcular el sueldo antes de eliminar
            // Generar todas las fechas en el rango
            const fechasEnRango = generarFechasEnRango(fecha_inicio, fecha_fin);
            
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

                    // Obtener descuentos varios
                    db.all(
                        `SELECT COALESCE(SUM(monto), 0) as total_descuentos
                         FROM descuentos_varios 
                         WHERE empleado_id = ? 
                         AND fecha_inicio = ? 
                         AND fecha_fin = ?`,
                        [empleado_id, fecha_inicio, fecha_fin],
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
                                 WHERE empleado_id = ?
                                 AND NOT (fecha_fin < ? OR fecha_inicio > ?)`,
                                [empleado_id, fecha_inicio, fecha_fin],
                                (err, vacaciones) => {
                                    if (err) {
                                        console.error(`Error al obtener vacaciones para empleado ${empleado_id}:`, err);
                                    }

                                    const vacacionesArray = vacaciones || [];
                                    
                                    // Calcular sueldo completo
                                    const calculo = calcularSueldoSemanal(registros, sueldoBase, pagoPorHora, fecha_inicio, fecha_fin, descuentosVarios, vacacionesArray, empleado.nombre, empleado.apellido);
                                    
                                    const desgloseJSON = JSON.stringify({
                                        empleado: `${empleado.nombre} ${empleado.apellido}`,
                                        periodo: {
                                            fecha_inicio: fecha_inicio,
                                            fecha_fin: fecha_fin
                                        },
                                        sueldo_base: sueldoBase,
                                        pago_por_hora: pagoPorHora,
                                        ...calculo
                                    });

                                    // Guardar en historial de pagos
                                    db.run(
                                        `INSERT INTO pagos (empleado_id, fecha_inicio, fecha_fin, area, sueldo_base, total_pagado, desglose)
                                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                        [empleado_id, fecha_inicio, fecha_fin, null, sueldoBase, calculo.total, desgloseJSON],
                                        function(err) {
                                    if (err) {
                                        return res.status(500).json({ 
                                            success: false, 
                                            message: 'Error al guardar pago: ' + err.message 
                                        });
                                    }

                                    // Generar todas las fechas en el rango para eliminar
                                    const fechasEnRangoEliminar = generarFechasEnRango(fecha_inicio, fecha_fin);
                                    
                                    // Eliminar registros de asistencia del período
                                    db.run(
                                        `DELETE FROM asistencia 
                                         WHERE empleado_id = ? 
                                         AND fecha IN (${fechasEnRangoEliminar.map(() => '?').join(',')})`,
                                        [empleado_id, ...fechasEnRangoEliminar],
                                        (err) => {
                                            if (err) {
                                                console.error('Error al eliminar asistencia:', err);
                                                // Continuar aunque haya error
                                            }

                                            // Eliminar descuentos varios del período
                                            db.run(
                                                `DELETE FROM descuentos_varios 
                                                 WHERE empleado_id = ? 
                                                 AND fecha_inicio = ? 
                                                 AND fecha_fin = ?`,
                                                [empleado_id, fecha_inicio, fecha_fin],
                                                (err) => {
                                                    if (err) {
                                                        console.error('Error al eliminar descuentos:', err);
                                                        // Continuar aunque haya error
                                                    }

                                                            res.json({
                                                                success: true,
                                                                message: `Pago registrado para ${empleado.nombre} ${empleado.apellido}`,
                                                                pago_id: this.lastID,
                                                                total_pagado: calculo.total
                                                            });
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

module.exports = router;

