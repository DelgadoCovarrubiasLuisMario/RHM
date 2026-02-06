// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    // Establecer fechas por defecto (hoy)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('filtroFechaInicio').value = hoy;
    document.getElementById('filtroFechaFin').value = hoy;

    // Cargar asistencia inicial
    cargarAsistencia();
});

// Cargar lista de asistencia
async function cargarAsistencia() {
    const fechaInicio = document.getElementById('filtroFechaInicio').value;
    const fechaFin = document.getElementById('filtroFechaFin').value;
    const movimiento = document.getElementById('filtroMovimiento').value;
    
    // Validar que haya fechas
    if (!fechaInicio || !fechaFin) {
        alert('Por favor selecciona un rango de fechas');
        return;
    }
    
    // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY
    const [yearInicio, monthInicio, dayInicio] = fechaInicio.split('-');
    const [yearFin, monthFin, dayFin] = fechaFin.split('-');
    const fechaInicioFormateada = `${dayInicio}/${monthInicio}/${yearInicio}`;
    const fechaFinFormateada = `${dayFin}/${monthFin}/${yearFin}`;

    const listaPlanta = document.getElementById('listaAsistenciaPlanta');
    
    listaPlanta.innerHTML = '<div class="loading">Cargando asistencia...</div>';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Cargar toda la asistencia sin filtrar por área
        let url = `${apiURL}/api/asistencia/listar?fecha_inicio=${fechaInicioFormateada}&fecha_fin=${fechaFinFormateada}`;
        if (movimiento) {
            url += `&movimiento=${movimiento}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            mostrarAsistencia(data.data, 'Planta');
        } else {
            listaPlanta.innerHTML = `<div class="error">Error: ${data.message || 'Error desconocido'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        listaPlanta.innerHTML = '<div class="error">Error de conexión. Verifica que el servidor esté corriendo.</div>';
    }
}

// Mostrar lista de asistencia
function mostrarAsistencia(registros, area) {
    // Ya no separamos por área, siempre usar Planta
    const listaDiv = document.getElementById('listaAsistenciaPlanta');
    const countDiv = document.getElementById('countPlanta');

    // Actualizar contador
    countDiv.textContent = `${registros.length} registro${registros.length !== 1 ? 's' : ''}`;

    if (registros.length === 0) {
        listaDiv.innerHTML = '<div class="empty-state">No hay registros de asistencia para este rango de fechas</div>';
        return;
    }

    let html = '<div class="asistencia-table">';
    
    registros.forEach(registro => {
        const nombreCompleto = `${registro.nombre} ${registro.apellido}`;
        const movimientoClass = registro.movimiento === 'ENTRADA' || registro.movimiento === 'INGRESO' 
            ? 'movimiento-entrada' 
            : 'movimiento-salida';
        
        html += `
            <div class="asistencia-item">
                <div class="asistencia-header">
                    <div class="empleado-info">
                        <strong>${nombreCompleto}</strong>
                        <span class="codigo-empleado">${registro.codigo}</span>
                    </div>
                    <span class="movimiento-badge ${movimientoClass}">${registro.movimiento}</span>
                </div>
                ${registro.foto ? `
                <div class="asistencia-foto-container">
                    <img src="${registro.foto}" alt="Foto de ${nombreCompleto}" class="asistencia-foto" onclick="ampliarFoto('${registro.foto}', '${nombreCompleto}')">
                </div>
                ` : ''}
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
                    ${registro.tiempoTrabajado ? `
                    <div class="detail-item tiempo-trabajado">
                        <span class="detail-label">⏱️ Tiempo trabajado:</span>
                        <span class="detail-value tiempo-value">${registro.tiempoTrabajado}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    html += '</div>';
    
    listaDiv.innerHTML = html;
}

// Limpiar filtros
function limpiarFiltros() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('filtroFechaInicio').value = hoy;
    document.getElementById('filtroFechaFin').value = hoy;
    document.getElementById('filtroMovimiento').value = '';
    cargarAsistencia();
}

// Ampliar foto al hacer clic
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

// Volver al menú principal
function volver() {
    window.location.href = 'menu.html';
}

