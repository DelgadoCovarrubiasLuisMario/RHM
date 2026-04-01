// Variables globales
let todosLosEmpleados = [];
let empleadosFiltrados = [];

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar vacaciones al inicio
    cargarVacaciones();

    // Configurar formulario
    document.getElementById('formRegistrar').addEventListener('submit', registrarVacaciones);
});

// Cargar empleados para el checklist (de ambas áreas)
async function cargarEmpleadosModal() {
    const checklistDiv = document.getElementById('empleadosChecklist');

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Cargar todos los empleados
        const response = await fetch(`${apiURL}/api/empleados/listar`);
        const data = await response.json();

        if (data.success) {
            todosLosEmpleados = data.data;
            empleadosFiltrados = todosLosEmpleados;
            mostrarEmpleadosChecklist();
        } else {
            checklistDiv.innerHTML = '<div class="error">Error al cargar empleados</div>';
        }
    } catch (error) {
        console.error('Error:', error);
        checklistDiv.innerHTML = '<div class="error">Error de conexión</div>';
    }
}

// Mostrar empleados en checklist
function mostrarEmpleadosChecklist() {
    const checklistDiv = document.getElementById('empleadosChecklist');

    if (empleadosFiltrados.length === 0) {
        checklistDiv.innerHTML = '<div class="empty-state">No hay empleados que coincidan</div>';
        return;
    }

    let html = '<div class="checklist-container">';
    
    empleadosFiltrados.forEach(empleado => {
        html += `
            <label class="checkbox-item">
                <input type="checkbox" name="empleados" value="${empleado.id}" class="checkbox-empleado">
                <span class="checkbox-label">
                    <strong>${empleado.nombre} ${empleado.apellido}</strong>
                    <span class="checkbox-codigo">${empleado.codigo}</span>
                </span>
            </label>
        `;
    });

    html += '</div>';
    checklistDiv.innerHTML = html;
}

// Filtrar empleados en el modal
function filtrarEmpleadosModal() {
    const busqueda = document.getElementById('busquedaEmpleadosModal').value.toLowerCase().trim();
    
    if (!busqueda) {
        empleadosFiltrados = todosLosEmpleados;
    } else {
        empleadosFiltrados = todosLosEmpleados.filter(empleado => {
            const nombreCompleto = `${empleado.nombre} ${empleado.apellido}`.toLowerCase();
            const codigo = (empleado.codigo || '').toLowerCase();
            return nombreCompleto.includes(busqueda) || codigo.includes(busqueda);
        });
    }
    
    mostrarEmpleadosChecklist();
}

// Abrir modal para registrar
function abrirModalRegistrar() {
    document.getElementById('modalRegistrar').style.display = 'block';
    
    // Limpiar formulario
    document.getElementById('formRegistrar').reset();
    document.getElementById('busquedaEmpleadosModal').value = '';
    
    // Asegurarse de que los inputs de fecha sean editables
    const fechaInicioInput = document.getElementById('fechaInicioVacaciones');
    const fechaFinInput = document.getElementById('fechaFinVacaciones');
    
    // Remover cualquier atributo que pueda bloquear la edición
    fechaInicioInput.removeAttribute('readonly');
    fechaInicioInput.removeAttribute('disabled');
    fechaFinInput.removeAttribute('readonly');
    fechaFinInput.removeAttribute('disabled');
    
    // Establecer fecha de hoy por defecto en ambos campos (usar setTimeout para asegurar que el reset se complete)
    setTimeout(() => {
        const hoy = new Date().toISOString().split('T')[0];
        fechaInicioInput.value = hoy;
        fechaFinInput.value = hoy;
    }, 10);
    
    // Cargar empleados
    cargarEmpleadosModal();
}

// Cerrar modal
function cerrarModalRegistrar() {
    document.getElementById('modalRegistrar').style.display = 'none';
}

// Registrar vacaciones
async function registrarVacaciones(e) {
    e.preventDefault();

    // Obtener empleados seleccionados
    const checkboxes = document.querySelectorAll('.checkbox-empleado:checked');
    const empleadosIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (empleadosIds.length === 0) {
        alert('Por favor selecciona al menos un empleado');
        return;
    }

    const fechaInicio = document.getElementById('fechaInicioVacaciones').value;
    const fechaFin = document.getElementById('fechaFinVacaciones').value;
    const observaciones = document.getElementById('observacionesVacaciones').value;

    if (!fechaInicio || !fechaFin) {
        alert('Por favor completa las fechas');
        return;
    }

    // Validar que la fecha de inicio sea anterior o igual a la fecha fin
    const fechaInicioObj = new Date(fechaInicio);
    const fechaFinObj = new Date(fechaFin);
    
    if (fechaInicioObj > fechaFinObj) {
        alert('La fecha de inicio debe ser anterior a la fecha fin');
        return;
    }

    // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY para enviar al backend
    const fechaInicioFormateada = convertirFecha(fechaInicio);
    const fechaFinFormateada = convertirFecha(fechaFin);

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/vacaciones/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                empleados_ids: empleadosIds,
                fecha_inicio: fechaInicioFormateada,
                fecha_fin: fechaFinFormateada,
                observaciones: observaciones || null
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            cerrarModalRegistrar();
            cargarVacaciones();
            // Intentar refrescar la vista de empleados si está abierta
            if (window.opener && window.opener.cargarEmpleados) {
                window.opener.cargarEmpleados();
            }
        } else {
            let mensaje = data.message || 'Error al registrar vacaciones';
            if (data.failed && data.failed.length > 0) {
                mensaje += '\n\nErrores:\n' + data.failed.join('\n');
            }
            alert(mensaje);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
function convertirFecha(fecha) {
    const [año, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${año}`;
}

// Cargar vacaciones
async function cargarVacaciones() {
    const listaPlanta = document.getElementById('listaVacacionesPlanta');
    
    listaPlanta.innerHTML = '<div class="loading">Cargando vacaciones...</div>';

    const fechaDesde = document.getElementById('filtroFechaDesde').value;
    const fechaHasta = document.getElementById('filtroFechaHasta').value;

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Cargar todas las vacaciones sin filtrar por área
        let url = `${apiURL}/api/vacaciones/listar`;
        const params = [];
        if (fechaDesde) {
            params.push(`fecha_desde=${encodeURIComponent(convertirFecha(fechaDesde))}`);
        }
        if (fechaHasta) {
            params.push(`fecha_hasta=${encodeURIComponent(convertirFecha(fechaHasta))}`);
        }
        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            mostrarVacaciones(data.data, 'Planta');
        } else {
            listaPlanta.innerHTML = `<div class="error">Error: ${data.message || 'Error desconocido'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        listaPlanta.innerHTML = '<div class="error">Error de conexión. Verifica que el servidor esté corriendo.</div>';
    }
}

// Mostrar vacaciones
function mostrarVacaciones(vacaciones, area) {
    // Ya no separamos por área, siempre usar Planta
    const listaDiv = document.getElementById('listaVacacionesPlanta');
    const countDiv = document.getElementById('countPlanta');

    // Actualizar contador
    countDiv.textContent = `${vacaciones.length} registro${vacaciones.length !== 1 ? 's' : ''}`;

    if (vacaciones.length === 0) {
        listaDiv.innerHTML = '<div class="empty-state">No hay vacaciones registradas</div>';
        return;
    }

    let html = '<div class="entregas-table">';

    vacaciones.forEach(vacacion => {
        html += `
            <div class="entrega-item">
                <div class="entrega-header">
                    <div class="entrega-info">
                        <div class="entrega-codigo">${vacacion.nombre_empleado}</div>
                        <div class="entrega-tipo">Código: ${vacacion.codigo_empleado}</div>
                    </div>
                    <div class="entrega-fecha">
                        <span class="fecha-label">${vacacion.dias} día(s)</span>
                        <button class="btn btn-danger btn-sm" onclick="eliminarVacacion(${vacacion.id}, '${(vacacion.nombre_empleado).replace(/'/g, "\\'")}')" title="Eliminar vacación" style="margin-left: 0.5rem;">🗑️</button>
                    </div>
                </div>
                <div class="entrega-detalles">
                    <div class="detalle-item">
                        <strong>Período:</strong> ${vacacion.fecha_inicio} - ${vacacion.fecha_fin}
                    </div>
                    <div class="detalle-item">
                        <strong>Año:</strong> ${vacacion.año}
                    </div>
                    <div class="detalle-item">
                        <strong>Disponibles:</strong> ${vacacion.dias_disponibles}/${vacacion.dias_totales}
                        <small style="opacity: .8;">(Tomados: ${vacacion.dias_usados})</small>
                    </div>
                    ${vacacion.observaciones ? `<div class="observaciones"><strong>Observaciones:</strong> ${vacacion.observaciones}</div>` : ''}
                    <div class="detalle-item">
                        <small>Registrado: ${new Date(vacacion.creado_en).toLocaleString('es-MX')}</small>
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    listaDiv.innerHTML = html;
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroFechaDesde').value = '';
    document.getElementById('filtroFechaHasta').value = '';
    cargarVacaciones();
}

// Eliminar vacación
async function eliminarVacacion(vacacionId, nombreEmpleado) {
    if (!confirm(`¿Estás seguro de eliminar esta vacación de ${nombreEmpleado}? Los días se restaurarán automáticamente.`)) {
        return;
    }

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/vacaciones/${vacacionId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ ${data.message}`);
            cargarVacaciones(); // Recargar lista
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Volver al menú
function volver() {
    window.location.href = 'menu.html';
}

