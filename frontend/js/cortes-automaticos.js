// Funcionalidad para manejar cortes automáticos

// Cargar y mostrar cortes automáticos pendientes
async function cargarCortesAutomaticosPendientes() {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/cortes-automaticos/pendientes`);
        const data = await response.json();

        if (data.success && data.data && data.data.length > 0) {
            mostrarAlertaCortesAutomaticos(data.data);
        }
    } catch (error) {
        console.error('Error al cargar cortes automáticos:', error);
    }
}

// Mostrar alerta con cortes automáticos pendientes
function mostrarAlertaCortesAutomaticos(cortes) {
    // Crear modal para mostrar los cortes
    const modal = document.createElement('div');
    modal.id = 'modalCortesAutomaticos';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.style.zIndex = '10000';

    let html = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>⚠️ Cortes Automáticos Pendientes</h2>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 1rem;">
                    Se detectaron ${cortes.length} corte(s) automático(s) de jornadas que excedieron 9.5 horas.
                </p>
                <div class="cortes-lista" style="max-height: 400px; overflow-y: auto;">
    `;

    cortes.forEach((corte, index) => {
        const fechaFormateada = new Date(corte.fecha.split('/').reverse().join('-')).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        html += `
            <div class="corte-item" style="border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                <div style="margin-bottom: 0.5rem;">
                    <strong>${corte.nombre_empleado}</strong>
                </div>
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">
                    Fecha: ${fechaFormateada}
                </div>
                <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1rem;">
                    Horas originales: ${parseFloat(corte.horas_originales).toFixed(2)}h → 
                    Cortadas a: ${parseFloat(corte.horas_cortadas).toFixed(2)}h 
                    (${parseFloat(corte.horas_extra).toFixed(2)}h extra)
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-success btn-sm" onclick="aprobarCorte(${corte.id}, '${corte.nombre_empleado}')" style="flex: 1;">
                        ✅ Sí, contabilizar horas
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rechazarCorte(${corte.id}, '${corte.nombre_empleado}')" style="flex: 1;">
                        ❌ No, eliminar horas
                    </button>
                </div>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;

    modal.innerHTML = html;
    document.body.appendChild(modal);

    // Cerrar al hacer clic fuera del modal
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModalCortes();
        }
    });
}

// Aprobar corte (mantener horas extra)
async function aprobarCorte(corteId, nombreEmpleado) {
    if (!confirm(`¿Aprobar las 1.5 horas extra para ${nombreEmpleado}?`)) {
        return;
    }

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/cortes-automaticos/${corteId}/aprobar`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ Horas extra aprobadas para ${nombreEmpleado}`);
            // Recargar cortes pendientes
            cargarCortesAutomaticosPendientes();
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error al aprobar corte:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Rechazar corte (eliminar horas extra, dejar solo 8 horas)
async function rechazarCorte(corteId, nombreEmpleado) {
    if (!confirm(`¿Eliminar las 1.5 horas extra para ${nombreEmpleado}? Solo se contarán 8 horas.`)) {
        return;
    }

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/cortes-automaticos/${corteId}/rechazar`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ Horas extra eliminadas para ${nombreEmpleado}. Se contarán solo 8 horas.`);
            // Recargar cortes pendientes
            cargarCortesAutomaticosPendientes();
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error al rechazar corte:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Cerrar modal de cortes
function cerrarModalCortes() {
    const modal = document.getElementById('modalCortesAutomaticos');
    if (modal) {
        modal.remove();
    }
}

// Cargar cortes automáticos cuando se carga la página (solo para admin)
document.addEventListener('DOMContentLoaded', function() {
    const tipoUsuario = localStorage.getItem('tipoUsuario');
    if (tipoUsuario === 'admin') {
        // Esperar un poco para que la página cargue completamente
        setTimeout(() => {
            cargarCortesAutomaticosPendientes();
        }, 1000);
    }
});

