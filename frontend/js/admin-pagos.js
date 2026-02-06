// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar pagos al inicio
    cargarPagos();
});

// Cargar pagos
async function cargarPagos() {
    const fechaInicio = document.getElementById('filtroFechaInicio').value;
    const fechaFin = document.getElementById('filtroFechaFin').value;

    const listaPlanta = document.getElementById('listaPagosPlanta');
    
    listaPlanta.innerHTML = '<div class="loading">Cargando pagos...</div>';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Cargar todos los pagos sin filtrar por área
        let url = `${apiURL}/api/pagos/listar`;
        if (fechaInicio) {
            url += `&fecha_desde=${encodeURIComponent(fechaInicio)}`;
        }
        if (fechaFin) {
            url += `&fecha_hasta=${encodeURIComponent(fechaFin)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            mostrarPagos(data.data, 'Planta');
        } else {
            listaPlanta.innerHTML = `<div class="error">Error: ${data.message || 'Error desconocido'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        listaPlanta.innerHTML = '<div class="error">Error de conexión. Verifica que el servidor esté corriendo.</div>';
    }
}

// Mostrar lista de pagos
function mostrarPagos(pagos, area) {
    // Ya no separamos por área, siempre usar Planta
    const listaDiv = document.getElementById('listaPagosPlanta');
    const countDiv = document.getElementById('countPlanta');

    // Actualizar contador
    countDiv.textContent = `${pagos.length} pago${pagos.length !== 1 ? 's' : ''}`;

    if (pagos.length === 0) {
        listaDiv.innerHTML = '<div class="empty-state">No hay pagos registrados</div>';
        return;
    }

    let html = '<div class="pagos-table">';

    pagos.forEach(pago => {
        const fechaPago = new Date(pago.fecha_pago);
        const fechaFormateada = fechaPago.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        html += `
            <div class="pago-item">
                <div class="pago-header">
                    <div class="empleado-info">
                        <strong>${pago.nombre_empleado}</strong>
                        <span class="pago-fecha">Pagado el: ${fechaFormateada}</span>
                    </div>
                    <div class="pago-total">
                        <span class="total-label">Total:</span>
                        <span class="total-amount">$${parseFloat(pago.total_pagado).toFixed(2)}</span>
                    </div>
                </div>
                <div class="pago-periodo">
                    <span class="periodo-label">Período:</span>
                    <span class="periodo-value">${pago.fecha_inicio} al ${pago.fecha_fin}</span>
                    <span class="sueldo-base">Sueldo base: $${pago.sueldo_base}</span>
                </div>
                <button class="btn btn-primary btn-ver-detalle" onclick="verDetalle(${pago.id})" data-pago='${JSON.stringify(pago).replace(/'/g, "\\'")}'>
                    Ver Detalle Completo
                </button>
            </div>
        `;
    });

    html += '</div>';
    html += `<div class="total-registros">Total: ${pagos.length} pago(s)</div>`;

    listaDiv.innerHTML = html;
}

// Ver detalle completo de un pago
function verDetalle(pagoId) {
    const modal = document.getElementById('modalDetalle');
    const modalTitulo = document.getElementById('modalTitulo');
    const modalBody = document.getElementById('modalBody');
    
    // Obtener datos del botón que fue clickeado
    const boton = event.target.closest('.btn-ver-detalle');
    const datosPago = JSON.parse(boton.getAttribute('data-pago'));
    
    try {
        const desglose = JSON.parse(datosPago.desglose);
        
        const fechaPago = new Date(datosPago.fecha_pago);
        const fechaFormateada = fechaPago.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        modalTitulo.textContent = `Detalle de Pago - ${desglose.empleado}`;

        let html = `
            <div class="desglose-header">
                <div class="desglose-info">
                    <p><strong>Fecha de pago:</strong> ${fechaFormateada}</p>
                    <p><strong>Período:</strong> ${datosPago.fecha_inicio} al ${datosPago.fecha_fin}</p>
                    <p><strong>Sueldo base:</strong> $${datosPago.sueldo_base}</p>
                    <p><strong>Pago por hora:</strong> $${parseFloat(desglose.pago_por_hora || 0).toFixed(2)}</p>
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
                                <th>Extras (Dobles)</th>
                                <th>Extras (Triples)</th>
                                <th>Horas Turno</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (desglose.desglose_diario && desglose.desglose_diario.length > 0) {
            desglose.desglose_diario.forEach(dia => {
                html += `
                    <tr class="${dia.es_domingo ? 'domingo-row' : ''}">
                        <td>${dia.fecha} ${dia.es_domingo ? '🏖️ Domingo' : ''}</td>
                        <td>Turno ${dia.turno}</td>
                        <td>${dia.hora_entrada}</td>
                        <td>${dia.hora_salida}</td>
                        <td><strong>${dia.horas_trabajadas}h</strong></td>
                        <td>${dia.horas_dobles}h</td>
                        <td>${dia.horas_triples}h</td>
                        <td>${dia.horas_turno || '0'}h</td>
                    </tr>
                `;
            });
        } else {
            html += '<tr><td colspan="8" class="empty-state">No hay registros para este período</td></tr>';
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
                        <span class="calculo-value">${desglose.resumen?.horas_normales || '0.00'} horas normales</span>
                        <span class="calculo-monto"><strong>$${desglose.calculos?.sueldo_base || '0.00'}</strong></span>
                    </div>
                    <div class="calculo-item">
                        <span class="calculo-label">Horas Dobles (×2 ×0.85):</span>
                        <span class="calculo-value">${desglose.resumen?.horas_dobles || '0.00'}h</span>
                        <span class="calculo-monto">$${desglose.calculos?.monto_horas_dobles || '0.00'}</span>
                    </div>
                    <div class="calculo-item">
                        <span class="calculo-label">Horas Triples (×3 ×0.80):</span>
                        <span class="calculo-value">${desglose.resumen?.horas_triples || '0.00'}h</span>
                        <span class="calculo-monto">$${desglose.calculos?.monto_horas_triples || '0.00'}</span>
                    </div>
                    <div class="calculo-item destacado">
                        <span class="calculo-label"><strong>Horas Turno (×2 ×0.95):</strong></span>
                        <span class="calculo-value">${desglose.resumen?.horas_turno || '0.00'}h</span>
                        <span class="calculo-monto"><strong>$${desglose.calculos?.monto_horas_turno || '0.00'}</strong></span>
                    </div>
        `;


        if (desglose.calculos?.descuento_faltas > 0) {
            html += `
                    <div class="calculo-item negativo">
                        <span class="calculo-label">Descuento por Faltas:</span>
                        <span class="calculo-value">${desglose.resumen?.dias_faltados || 0} día(s)</span>
                        <span class="calculo-monto">-$${desglose.calculos.descuento_faltas}</span>
                    </div>
            `;
        }

        if (desglose.calculos?.descuentos_varios > 0) {
            html += `
                    <div class="calculo-item negativo">
                        <span class="calculo-label">Descuentos Varios:</span>
                        <span class="calculo-value">-</span>
                        <span class="calculo-monto">-$${desglose.calculos.descuentos_varios}</span>
                    </div>
            `;
        }

        html += `
                    <div class="calculo-item total-item">
                        <span class="calculo-label"><strong>TOTAL PAGADO:</strong></span>
                        <span class="calculo-value">-</span>
                        <span class="calculo-monto total-monto"><strong>$${parseFloat(datosPago.total_pagado || 0).toFixed(2)}</strong></span>
                    </div>
                </div>
            </div>
        `;

        modalBody.innerHTML = html;
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error al parsear desglose:', error);
        modalBody.innerHTML = '<div class="error">Error al mostrar el detalle del pago</div>';
        modal.style.display = 'block';
    }
}

// Cerrar modal
function cerrarModal() {
    document.getElementById('modalDetalle').style.display = 'none';
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('modalDetalle');
    if (event.target === modal) {
        cerrarModal();
    }
}

// Generar nómina (descargar Excel)
async function generarNomina() {
    const fechaInicio = document.getElementById('filtroFechaInicio').value;
    const fechaFin = document.getElementById('filtroFechaFin').value;

    if (!fechaInicio || !fechaFin) {
        alert('⚠️ Por favor selecciona un rango de fechas (Desde y Hasta)');
        return;
    }

    const btnGenerar = document.getElementById('btnGenerarNomina');
    const textoOriginal = btnGenerar.textContent;
    btnGenerar.disabled = true;
    btnGenerar.textContent = '⏳ Generando...';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const url = `${apiURL}/api/pagos/generar-nomina?fecha_desde=${encodeURIComponent(fechaInicio)}&fecha_hasta=${encodeURIComponent(fechaFin)}`;
        
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al generar nómina');
        }

        // Obtener el blob del archivo
        const blob = await response.blob();
        
        // Crear URL temporal y descargar
        const urlDescarga = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = urlDescarga;
        
        // Obtener nombre del archivo del header Content-Disposition
        const contentDisposition = response.headers.get('Content-Disposition');
        let nombreArchivo = 'nomina.xlsx';
        if (contentDisposition) {
            const matches = contentDisposition.match(/filename="(.+)"/);
            if (matches && matches[1]) {
                nombreArchivo = matches[1];
            }
        }
        
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(urlDescarga);

        alert(`✅ Nómina generada exitosamente: ${nombreArchivo}`);
    } catch (error) {
        console.error('Error al generar nómina:', error);
        alert(`❌ Error al generar nómina: ${error.message}`);
    } finally {
        btnGenerar.disabled = false;
        btnGenerar.textContent = textoOriginal;
    }
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroFechaInicio').value = '';
    document.getElementById('filtroFechaFin').value = '';
    cargarPagos();
}

// Volver al menú
function volver() {
    window.location.href = 'menu.html';
}

