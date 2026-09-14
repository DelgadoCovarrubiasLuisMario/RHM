// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    const semana = window.periodoSemanaISO ? window.periodoSemanaISO(new Date()) : null;
    if (semana) {
        document.getElementById('filtroFechaInicio').value = semana.inicio;
        document.getElementById('filtroFechaFin').value = semana.fin;
    }
});

// Actualizar fecha fin cuando cambia fecha inicio (para mantener semana completa)
function actualizarFechaFin() {
    const fechaInicio = document.getElementById('filtroFechaInicio').value;
    if (fechaInicio) {
        const inicio = new Date(`${fechaInicio}T00:00:00`);
        const fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 6);
        document.getElementById('filtroFechaFin').value = window.fechaISOLocal(fin);
    }
}

// Cargar sueldos
async function cargarSueldos() {
    const fechaInicio = document.getElementById('filtroFechaInicio').value;
    const fechaFin = document.getElementById('filtroFechaFin').value;

    if (!fechaInicio || !fechaFin) {
        alert('Por favor selecciona un rango de fechas');
        return;
    }

    // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY
    const [yearInicio, monthInicio, dayInicio] = fechaInicio.split('-');
    const [yearFin, monthFin, dayFin] = fechaFin.split('-');
    const fechaInicioFormateada = `${dayInicio}/${monthInicio}/${yearInicio}`;
    const fechaFinFormateada = `${dayFin}/${monthFin}/${yearFin}`;

    const listaPlanta = document.getElementById('listaSueldosPlanta');
    
    listaPlanta.innerHTML = '<div class="loading">Calculando sueldos...</div>';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Cargar todos los sueldos sin filtrar por área
        const url = `${apiURL}/api/sueldos/listar?fecha_inicio=${encodeURIComponent(fechaInicioFormateada)}&fecha_fin=${encodeURIComponent(fechaFinFormateada)}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            mostrarSueldos(data.data, data.periodo, 'Planta');
        } else {
            listaPlanta.innerHTML = `<div class="error">Error: ${data.message || 'Error desconocido'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        listaPlanta.innerHTML = '<div class="error">Error de conexión. Verifica que el servidor esté corriendo.</div>';
    }
}

let sueldosEnPantalla = {};

function escapeHtml(texto) {
    return String(texto || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Mostrar lista de sueldos
function mostrarSueldos(sueldos, periodo, area) {
    // Ya no separamos por área, siempre usar Planta
    const listaDiv = document.getElementById('listaSueldosPlanta');
    const countDiv = document.getElementById('countPlanta');
    sueldosEnPantalla = {};

    // Actualizar contador
    countDiv.textContent = `${sueldos.length} empleado${sueldos.length !== 1 ? 's' : ''}`;

    if (sueldos.length === 0) {
        listaDiv.innerHTML = '<div class="empty-state">No hay registros de asistencia para calcular sueldos en este período</div>';
        return;
    }

    let html = `<div class="periodo-info">
        <strong>Período:</strong> ${periodo.fecha_inicio} al ${periodo.fecha_fin}
    </div>`;

    html += '<div class="sueldos-table">';

    sueldos.forEach(sueldo => {
        sueldosEnPantalla[sueldo.empleado_id] = sueldo;
        html += `
            <div class="sueldo-item">
                <div class="sueldo-header">
                    <div class="empleado-info">
                        <strong>${escapeHtml(sueldo.empleado)}</strong>
                        <span class="sueldo-base">Sueldo base: $${sueldo.sueldo_base}</span>
                    </div>
                    <div class="sueldo-total">
                        <span class="total-label">Total:</span>
                        <span class="total-amount">$${parseFloat(sueldo.total).toFixed(2)}</span>
                        ${sueldo.ya_pagado ? '<span class="sueldo-base">Ya pagado</span>' : ''}
                    </div>
                </div>
                <div class="sueldo-resumen">
                    <div class="resumen-item destacado">
                        <span class="resumen-label">Sueldo Base:</span>
                        <span class="resumen-value">$${sueldo.calculos?.sueldo_base || '0.00'}</span>
                        <span class="resumen-detalle">(${sueldo.resumen.horas_normales || '0.00'} horas normales)</span>
                    </div>
                    <div class="resumen-item destacado">
                        <span class="resumen-label">Horas Turno:</span>
                        <span class="resumen-value">${sueldo.resumen.horas_turno}h</span>
                    </div>
                    <div class="resumen-item destacado">
                        <span class="resumen-label">Horas Extra:</span>
                        <span class="resumen-value">${(parseFloat(sueldo.resumen.horas_dobles) + parseFloat(sueldo.resumen.horas_triples)).toFixed(2)}h</span>
                        <span class="resumen-detalle">(${sueldo.resumen.horas_dobles}h dobles + ${sueldo.resumen.horas_triples}h triples)</span>
                    </div>
                    ${parseFloat(sueldo.resumen?.horas_planta_extra || 0) > 0 ? `
                    <div class="resumen-item destacado">
                        <span class="resumen-label">Extra Turno Planta:</span>
                        <span class="resumen-value">${sueldo.resumen.horas_planta_extra}h</span>
                        <span class="resumen-detalle">(salida 4:30–6:00 p. m.)</span>
                    </div>
                    ` : ''}
                    ${parseFloat(sueldo.calculos?.monto_prima_dominical || 0) > 0 ? `
                    <div class="resumen-item destacado">
                        <span class="resumen-label">Prima dominical 25%:</span>
                        <span class="resumen-value">$${sueldo.calculos.monto_prima_dominical}</span>
                    </div>
                    ` : ''}
                    ${parseFloat(sueldo.calculos?.monto_prima_vacacional || 0) > 0 ? `
                    <div class="resumen-item destacado">
                        <span class="resumen-label">Prima vacacional 25%:</span>
                        <span class="resumen-value">$${sueldo.calculos.monto_prima_vacacional}</span>
                    </div>
                    ` : ''}
                    ${parseFloat(sueldo.calculos?.monto_festivo_trabajado || 0) > 0 ? `
                    <div class="resumen-item destacado">
                        <span class="resumen-label">Festivo trabajado (×2):</span>
                        <span class="resumen-value">$${sueldo.calculos.monto_festivo_trabajado}</span>
                        <span class="resumen-detalle">(${sueldo.resumen.horas_festivo_trabajadas || '0.00'} h)</span>
                    </div>
                    ` : ''}
                    ${(sueldo.resumen?.dias_festivos || 0) > 0 ? `
                    <div class="resumen-item destacado">
                        <span class="resumen-label">Festivos pagados:</span>
                        <span class="resumen-value">${sueldo.resumen.dias_festivos} día(s)</span>
                        <span class="resumen-detalle">(8 h cada uno, aunque no haya checada)</span>
                    </div>
                    ` : ''}
                    ${sueldo.calculos?.descuento_faltas > 0 ? `
                    <div class="resumen-item negativo" style="opacity: 0.7; font-style: italic;">
                        <span class="resumen-label">Descuento Faltas (info):</span>
                        <span class="resumen-value">-$${sueldo.calculos.descuento_faltas}</span>
                        <span class="resumen-detalle">(${sueldo.resumen.dias_faltados || 0} día(s) faltado(s) - solo informativo)</span>
                    </div>
                    ` : ''}
                    ${sueldo.calculos?.descuentos_varios > 0 ? `
                    <div class="resumen-item negativo">
                        <span class="resumen-label">Descuentos Varios:</span>
                        <span class="resumen-value">-$${sueldo.calculos.descuentos_varios}</span>
                    </div>
                    ` : ''}
                </div>
                <div class="sueldo-actions">
                    <button type="button" class="btn btn-primary btn-ver-desglose" data-empleado-id="${sueldo.empleado_id}">
                        Ver Desglose Completo
                    </button>
                    ${sueldo.ya_pagado ? `
                    <button type="button" class="btn btn-secondary" disabled>Ya pagado</button>
                    ` : `
                    <button type="button" class="btn btn-success btn-pagar" data-empleado-id="${sueldo.empleado_id}">
                        💰 Pagar
                    </button>
                    `}
                </div>
            </div>
        `;
    });

    html += '</div>';
    html += `<div class="total-registros">Total: ${sueldos.length} empleados</div>`;

    listaDiv.innerHTML = html;

    listaDiv.querySelectorAll('.btn-ver-desglose').forEach((boton) => {
        boton.addEventListener('click', () => verDesglose(Number(boton.dataset.empleadoId)));
    });
    listaDiv.querySelectorAll('.btn-pagar').forEach((boton) => {
        boton.addEventListener('click', () => {
            const sueldo = sueldosEnPantalla[boton.dataset.empleadoId];
            if (!sueldo) return;
            pagarEmpleado(sueldo.empleado_id, sueldo.empleado, sueldo.periodo.fecha_inicio, sueldo.periodo.fecha_fin);
        });
    });
}

// Ver desglose completo de un empleado
function verDesglose(empleadoId) {
    const modal = document.getElementById('modalDesglose');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalBody = document.getElementById('modalBody');
    const datosSueldo = sueldosEnPantalla[empleadoId];
    if (!datosSueldo) {
        return;
    }

    modalTitulo.textContent = `Desglose de Sueldo - ${datosSueldo.empleado}`;

    let html = `
        <div class="desglose-header">
            <div class="desglose-info">
                <p><strong>Período:</strong> ${datosSueldo.periodo?.fecha_inicio || 'N/A'} al ${datosSueldo.periodo?.fecha_fin || 'N/A'}</p>
                <p><strong>Sueldo base:</strong> $${datosSueldo.sueldo_base}</p>
                <p><strong>Pago por hora:</strong> $${parseFloat(datosSueldo.pago_por_hora || 0).toFixed(2)}</p>
            </div>
        </div>

        <div class="desglose-diario">
            <h3>Desglose Diario</h3>
            <div class="tabla-desglose">
                <table>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Turno</th>
                            <th>Entrada</th>
                            <th>Salida</th>
                            <th>Horas</th>
                            <th>Normales</th>
                            <th>Extras (Dobles)</th>
                            <th>Extras (Triples)</th>
                            <th>Horas Turno</th>
                            <th>Extra Planta</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    if (datosSueldo.desglose_diario && datosSueldo.desglose_diario.length > 0) {
        datosSueldo.desglose_diario.forEach(dia => {
            const turnoLabel = dia.turno === 4 || dia.turno === '4' ? 'Planta' : `Turno ${dia.turno}`;
            html += `
                <tr class="${dia.es_domingo ? 'domingo-row' : ''}">
                    <td>${dia.fecha}${dia.es_domingo ? ' 🏖️ Domingo' : ''}${dia.es_festivo ? ` 🇲🇽 ${dia.nombre_festivo || 'Festivo'}` : ''}${dia.es_vacaciones ? ' 🌴 Vacaciones' : ''}${dia.es_descanso_obligatorio ? ' (pagado)' : ''}</td>
                    <td>${turnoLabel}</td>
                    <td>${dia.hora_entrada}</td>
                    <td>${dia.hora_salida}</td>
                    <td><strong>${dia.horas_trabajadas}h</strong></td>
                    <td>${dia.horas_normales || '0.00'}h</td>
                    <td>${dia.horas_dobles}h</td>
                    <td>${dia.horas_triples}h</td>
                    <td>${dia.horas_turno || '0'}h</td>
                    <td>${dia.horas_planta_extra || '0.00'}h</td>
                </tr>
            `;
        });
        } else {
            html += '<tr><td colspan="10" class="empty-state">No hay registros para este período</td></tr>';
        }

    html += `
                    </tbody>
                </table>
            </div>
        </div>

        <div class="desglose-calculos">
            <h3>Cálculos Detallados</h3>
            <div class="calculos-grid">
                <div class="calculo-item destacado">
                    <span class="calculo-label"><strong>Sueldo Base:</strong></span>
                    <span class="calculo-value">${datosSueldo.resumen?.horas_normales || '0.00'} horas normales</span>
                    <span class="calculo-monto"><strong>$${datosSueldo.calculos?.sueldo_base || '0.00'}</strong></span>
                </div>
                <div class="calculo-item">
                    <span class="calculo-label">Horas Dobles (×2 ×0.85):</span>
                    <span class="calculo-value">${datosSueldo.resumen?.horas_dobles || '0.00'}h</span>
                    <span class="calculo-monto">$${datosSueldo.calculos?.monto_horas_dobles || '0.00'}</span>
                </div>
                <div class="calculo-item">
                    <span class="calculo-label">Horas Triples (×3 ×0.80):</span>
                    <span class="calculo-value">${datosSueldo.resumen?.horas_triples || '0.00'}h</span>
                    <span class="calculo-monto">$${datosSueldo.calculos?.monto_horas_triples || '0.00'}</span>
                </div>
                <div class="calculo-item destacado">
                    <span class="calculo-label"><strong>Horas Turno (×2 ×0.95):</strong></span>
                    <span class="calculo-value">${datosSueldo.resumen?.horas_turno || '0.00'}h</span>
                    <span class="calculo-monto"><strong>$${datosSueldo.calculos?.monto_horas_turno || '0.00'}</strong></span>
                </div>
                <div class="calculo-item">
                    <span class="calculo-label">Extra Turno Planta (tarifa normal × horas):</span>
                    <span class="calculo-value">${datosSueldo.resumen?.horas_planta_extra || '0.00'}h</span>
                    <span class="calculo-monto">$${datosSueldo.calculos?.monto_horas_planta_extra || '0.00'}</span>
                </div>
                ${parseFloat(datosSueldo.calculos?.monto_prima_dominical || 0) > 0 ? `
                <div class="calculo-item destacado">
                    <span class="calculo-label">Prima dominical 25%:</span>
                    <span class="calculo-value">1 día ordinario</span>
                    <span class="calculo-monto">$${datosSueldo.calculos.monto_prima_dominical}</span>
                </div>
                ` : ''}
                ${parseFloat(datosSueldo.calculos?.monto_prima_vacacional || 0) > 0 ? `
                <div class="calculo-item destacado">
                    <span class="calculo-label">Prima vacacional 25%:</span>
                    <span class="calculo-value">${datosSueldo.resumen?.dias_vacaciones || 0} día(s)</span>
                    <span class="calculo-monto">$${datosSueldo.calculos.monto_prima_vacacional}</span>
                </div>
                ` : ''}
                ${parseFloat(datosSueldo.calculos?.monto_festivo_trabajado || 0) > 0 ? `
                <div class="calculo-item destacado">
                    <span class="calculo-label">Festivo trabajado (×2):</span>
                    <span class="calculo-value">${datosSueldo.resumen?.horas_festivo_trabajadas || '0.00'}h</span>
                    <span class="calculo-monto">$${datosSueldo.calculos.monto_festivo_trabajado}</span>
                </div>
                ` : ''}
                ${datosSueldo.calculos?.descuento_faltas > 0 ? `
                <div class="calculo-item negativo" style="opacity: 0.7; font-style: italic;">
                    <span class="calculo-label">Descuento por Faltas (información):</span>
                    <span class="calculo-value">${datosSueldo.resumen?.dias_faltados || 0} día(s) faltado(s)</span>
                    <span class="calculo-monto">-$${datosSueldo.calculos.descuento_faltas}</span>
                    <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
                        ⓘ Este descuento es solo informativo. El pago se basa en horas trabajadas.
                    </div>
                </div>
                ` : ''}
                ${datosSueldo.calculos?.descuentos_varios > 0 ? `
                <div class="calculo-item negativo">
                    <span class="calculo-label">Descuentos Varios:</span>
                    <span class="calculo-value">-</span>
                    <span class="calculo-monto">-$${datosSueldo.calculos.descuentos_varios}</span>
                </div>
                ` : ''}
                <div class="calculo-item total-item">
                    <span class="calculo-label"><strong>TOTAL:</strong></span>
                    <span class="calculo-value">-</span>
                    <span class="calculo-monto total-monto"><strong>$${parseFloat(datosSueldo.total || 0).toFixed(2)}</strong></span>
                </div>
            </div>
        </div>
    `;

    modalBody.innerHTML = html;
    modal.style.display = 'block';
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('modalDesglose').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('modalDesglose');
    if (event.target === modal) {
        cerrarModal();
    }
}

// Limpiar filtros
function limpiarFiltros() {
    const semana = window.periodoSemanaISO(new Date());
    document.getElementById('filtroFechaInicio').value = semana.inicio;
    document.getElementById('filtroFechaFin').value = semana.fin;
    const lista = document.getElementById('listaSueldosPlanta') || document.getElementById('listaSueldos');
    if (lista) {
        lista.innerHTML = '<div class="loading">Selecciona un rango de fechas y haz clic en "Calcular Sueldos"</div>';
    }
}

let pagandoEmpleado = false;

async function pagarEmpleado(empleadoId, nombreEmpleado, fechaInicio, fechaFin) {
    if (pagandoEmpleado) {
        return;
    }
    if (!confirm(`¿Estás seguro de pagar a ${nombreEmpleado}?\n\nPeríodo: ${fechaInicio} al ${fechaFin}\n\nSe guarda en historial. Las checadas se conservan.`)) {
        return;
    }

    pagandoEmpleado = true;
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/sueldos/pagar/${empleadoId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ ${data.message}\n\nTotal pagado: $${parseFloat(data.total_pagado).toFixed(2)}`);
            cargarSueldos();
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    } finally {
        pagandoEmpleado = false;
    }
}

// Volver al menú
function volver() {
    window.location.href = 'menu.html';
}

