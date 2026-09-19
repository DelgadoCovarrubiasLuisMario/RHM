const CA_TEXTO_SALIDA_AUTO_95 =
    'Salida registrada automáticamente (jornada de 9.5 h).';

function etiquetaMovimiento(movimiento) {
    if (movimiento === 'INGRESO') return 'ENTRADA';
    return movimiento;
}

function esMovimientoEntrada(movimiento) {
    return movimiento === 'ENTRADA' || movimiento === 'INGRESO';
}

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    const hoy = window.fechaISOLocal(new Date());
    document.getElementById('filtroFechaInicio').value = hoy;
    document.getElementById('filtroFechaFin').value = hoy;

    const listaPlanta = document.getElementById('listaAsistenciaPlanta');
    listaPlanta.addEventListener('click', manejarClickListaAsistencia);

    cargarAsistencia();
});

async function manejarClickListaAsistencia(event) {
    const btn = event.target.closest('.btn-ver-foto-asistencia');
    if (!btn) return;

    const id = btn.getAttribute('data-asistencia-id');
    const nombre = btn.getAttribute('data-nombre') || 'empleado';
    if (!id) return;

    btn.disabled = true;
    const textoOriginal = btn.textContent;
    btn.textContent = 'Cargando…';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/asistencia/registro/${id}/foto`);
        const data = await response.json();
        if (!data.success || !data.foto) {
            alert(data.message || 'No se pudo cargar la foto');
            return;
        }
        ampliarFoto(data.foto, nombre);
    } catch (error) {
        console.error('Error al cargar foto:', error);
        alert('Error de conexión al cargar la foto');
    } finally {
        btn.disabled = false;
        btn.textContent = textoOriginal;
    }
}

async function cargarAsistencia() {
    const fechaInicio = document.getElementById('filtroFechaInicio').value;
    const fechaFin = document.getElementById('filtroFechaFin').value;
    const movimiento = document.getElementById('filtroMovimiento').value;

    if (!fechaInicio || !fechaFin) {
        alert('Por favor selecciona un rango de fechas');
        return;
    }

    const [yearInicio, monthInicio, dayInicio] = fechaInicio.split('-');
    const [yearFin, monthFin, dayFin] = fechaFin.split('-');
    const fechaInicioFormateada = `${dayInicio}/${monthInicio}/${yearInicio}`;
    const fechaFinFormateada = `${dayFin}/${monthFin}/${yearFin}`;

    const listaPlanta = document.getElementById('listaAsistenciaPlanta');

    listaPlanta.innerHTML = '<div class="loading">Cargando asistencia...</div>';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';

        let url = `${apiURL}/api/asistencia/listar?fecha_inicio=${encodeURIComponent(fechaInicioFormateada)}&fecha_fin=${encodeURIComponent(fechaFinFormateada)}`;
        if (movimiento) {
            url += `&movimiento=${encodeURIComponent(movimiento)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            mostrarAsistencia(data.data);
        } else {
            listaPlanta.innerHTML = `<div class="error">Error: ${data.message || 'Error desconocido'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        listaPlanta.innerHTML = '<div class="error">Error de conexión. Verifica que el servidor esté corriendo.</div>';
    }
}

function mostrarAsistencia(registros) {
    const listaDiv = document.getElementById('listaAsistenciaPlanta');
    const countDiv = document.getElementById('countPlanta');

    countDiv.textContent = `${registros.length} registro${registros.length !== 1 ? 's' : ''}`;

    if (registros.length === 0) {
        listaDiv.innerHTML = '<div class="empty-state">No hay registros de asistencia para este rango de fechas</div>';
        return;
    }

    let html = '<div class="asistencia-table">';

    registros.forEach((registro) => {
        const nombreCompleto = `${registro.nombre} ${registro.apellido}`;
        const movimientoLabel = etiquetaMovimiento(registro.movimiento);
        const movimientoClass = esMovimientoEntrada(registro.movimiento)
            ? 'movimiento-entrada'
            : 'movimiento-salida';
        const nombreEsc = nombreCompleto.replace(/'/g, "\\'");

        html += `
            <div class="asistencia-item">
                <div class="asistencia-header">
                    <div class="empleado-info">
                        <strong>${nombreCompleto}</strong>
                        <span class="codigo-empleado">${registro.codigo}</span>
                    </div>
                    <span class="movimiento-badge ${movimientoClass}">${movimientoLabel}</span>
                    ${registro.salida_automatica === 1 ? `<span class="movimiento-badge" style="background:#fef3c7;color:#92400e;margin-left:6px;" title="${CA_TEXTO_SALIDA_AUTO_95}">Auto</span>` : ''}
                </div>
                ${
                    registro.tiene_foto === 1 || registro.tiene_foto === true
                        ? `<div class="asistencia-foto-container">
                    <button type="button" class="btn btn-secondary btn-sm btn-ver-foto-asistencia" data-asistencia-id="${registro.id}" data-nombre="${nombreEsc.replace(/"/g, '&quot;')}">Ver foto</button>
                </div>`
                        : ''
                }
                <div class="asistencia-details">
                    <div class="detail-item">
                        <span class="detail-label">Fecha:</span>
                        <span class="detail-value">${registro.fecha}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Hora:</span>
                        <span class="detail-value">${registro.hora}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Turno:</span>
                        <span class="detail-value">Turno ${registro.turno}</span>
                    </div>
                    ${
                        registro.tiempoTrabajado
                            ? `
                    <div class="detail-item tiempo-trabajado">
                        <span class="detail-label">⏱️ Tiempo trabajado:</span>
                        <span class="detail-value tiempo-value">${registro.tiempoTrabajado}</span>
                    </div>
                    `
                            : ''
                    }
                    ${
                        registro.salida_automatica === 1
                            ? `
                    <div class="detail-item" style="color:#92400e;font-weight:600;">
                        <span class="detail-value">${CA_TEXTO_SALIDA_AUTO_95}</span>
                    </div>
                    `
                            : ''
                    }
                </div>
                <div class="asistencia-actions">
                    <button class="btn btn-danger btn-sm" onclick="eliminarAsistencia(${registro.id}, '${nombreEsc}', '${registro.fecha}', '${registro.hora}', '${registro.movimiento}')" title="Eliminar registro permanentemente">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';

    listaDiv.innerHTML = html;
}

function limpiarFiltros() {
    const hoy = window.fechaISOLocal(new Date());
    document.getElementById('filtroFechaInicio').value = hoy;
    document.getElementById('filtroFechaFin').value = hoy;
    document.getElementById('filtroMovimiento').value = '';
    cargarAsistencia();
}

function ampliarFoto(fotoSrc, nombreEmpleado) {
    const modal = document.createElement('div');
    modal.className = 'modal-foto';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;

    const img = document.createElement('img');
    img.src = fotoSrc;
    img.alt = `Foto de ${nombreEmpleado}`;
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    `;

    modal.appendChild(img);
    document.body.appendChild(modal);

    modal.onclick = () => {
        document.body.removeChild(modal);
    };
}

async function eliminarAsistencia(asistenciaId, nombreEmpleado, fecha, hora, movimiento) {
    const avisoJornada = esMovimientoEntrada(movimiento)
        ? '\n\n⚠️ Si esta ENTRADA tiene una SALIDA emparejada, también se eliminará esa SALIDA (no quedarán salidas huérfanas).'
        : '\n\n⚠️ Eliminar una SALIDA puede afectar el cálculo de horas en nómina.';
    if (
        !confirm(
            `¿Eliminar permanentemente este registro de asistencia?\n\nEmpleado: ${nombreEmpleado}\nFecha: ${fecha}\nHora: ${hora}\nMovimiento: ${etiquetaMovimiento(movimiento)}${avisoJornada}\n\nEsta acción no se puede deshacer: el registro se borrará de la base de datos y dejará de aparecer en listados e historial.`
        )
    ) {
        return;
    }

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/asistencia/${asistenciaId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ ${data.message}`);
            cargarAsistencia();
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

function volver() {
    window.location.href = 'menu.html';
}
