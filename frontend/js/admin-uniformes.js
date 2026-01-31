// Variables globales
let todosLosEmpleados = [];
let empleadosFiltrados = [];

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar entregas al inicio
    cargarEntregas();

    // Configurar formulario
    document.getElementById('formRegistrar').addEventListener('submit', registrarEntrega);

    // Establecer fecha de hoy por defecto
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaEntrega').value = hoy;
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
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaEntrega').value = hoy;
    // Cargar empleados
    cargarEmpleadosModal();
}

// Cerrar modal
function cerrarModalRegistrar() {
    document.getElementById('modalRegistrar').style.display = 'none';
}

// Registrar entrega
async function registrarEntrega(e) {
    e.preventDefault();

    // Obtener empleados seleccionados
    const checkboxes = document.querySelectorAll('.checkbox-empleado:checked');
    const empleadosIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (empleadosIds.length === 0) {
        alert('❌ Por favor, selecciona al menos un empleado');
        return;
    }

    const tipo = document.getElementById('tipoEntrega').value;
    const fechaEntrega = document.getElementById('fechaEntrega').value;
    const observaciones = document.getElementById('observaciones').value;

    // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
    const [year, month, day] = fechaEntrega.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;

    // Validar tipo
    if (!tipo) {
        alert('❌ Por favor, selecciona el tipo de entrega');
        return;
    }

    // Determinar cantidades según tipo (por defecto 1)
    let cantidadUniformes = 0;
    let cantidadBotas = 0;
    
    if (tipo === 'uniforme') {
        cantidadUniformes = 1;
    } else if (tipo === 'botas') {
        cantidadBotas = 1;
    } else if (tipo === 'ambos') {
        cantidadUniformes = 1;
        cantidadBotas = 1;
    }

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Registrar entrega para cada empleado seleccionado
        const promesas = empleadosIds.map(empleadoId => 
            fetch(`${apiURL}/api/uniformes/registrar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    empleado_id: empleadoId,
                    tipo: tipo,
                    fecha_entrega: fechaFormateada,
                    cantidad_uniformes: cantidadUniformes,
                    cantidad_botas: cantidadBotas,
                    observaciones: observaciones || null
                })
            }).then(res => res.json())
        );

        const resultados = await Promise.all(promesas);
        const exitosos = resultados.filter(r => r.success).length;
        const errores = resultados.filter(r => !r.success);

        if (errores.length > 0) {
            alert(`⚠️ Se registraron ${exitosos} entregas, pero ${errores.length} fallaron`);
        } else {
            alert(`✅ Se registraron ${exitosos} entregas correctamente`);
        }

        cerrarModalRegistrar();
        cargarEntregas();
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Cargar entregas
async function cargarEntregas() {
    const fechaDesde = document.getElementById('filtroFechaDesde').value;
    const fechaHasta = document.getElementById('filtroFechaHasta').value;

    const listaPlanta = document.getElementById('listaEntregasPlanta');
    
    listaPlanta.innerHTML = '<div class="loading">Cargando entregas...</div>';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Cargar todas las entregas sin filtrar por área
        let url = `${apiURL}/api/uniformes/listar`;
        if (fechaDesde) {
            const [year, month, day] = fechaDesde.split('-');
            url += `&fecha_desde=${day}/${month}/${year}`;
        }
        if (fechaHasta) {
            const [year, month, day] = fechaHasta.split('-');
            url += `&fecha_hasta=${day}/${month}/${year}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            mostrarEntregas(data.data, 'Planta');
        } else {
            listaPlanta.innerHTML = `<div class="error">Error: ${data.message || 'Error desconocido'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        listaPlanta.innerHTML = '<div class="error">Error de conexión. Verifica que el servidor esté corriendo.</div>';
    }
}

// Mostrar entregas
function mostrarEntregas(entregas, area) {
    // Ya no separamos por área, siempre usar Planta
    const listaDiv = document.getElementById('listaEntregasPlanta');
    const countDiv = document.getElementById('countPlanta');

    // Actualizar contador
    countDiv.textContent = `${entregas.length} entrega${entregas.length !== 1 ? 's' : ''}`;

    if (entregas.length === 0) {
        listaDiv.innerHTML = '<div class="empty-state">No hay entregas registradas</div>';
        return;
    }

    let html = '<div class="entregas-table">';

    entregas.forEach(entrega => {
        const tipoText = {
            'uniforme': 'Uniforme',
            'botas': 'Botas',
            'ambos': 'Uniformes y Botas'
        }[entrega.tipo] || entrega.tipo;

        html += `
            <div class="entrega-item">
                <div class="entrega-header">
                    <div class="entrega-info">
                        <strong>${entrega.nombre_empleado}</strong>
                        <span class="entrega-codigo">Código: ${entrega.codigo_empleado}</span>
                        <span class="entrega-tipo">Tipo: ${tipoText}</span>
                    </div>
                    <div class="entrega-actions">
                        <button class="btn-icon btn-edit" onclick="editarEntrega(${entrega.id})" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-icon btn-delete" onclick="eliminarEntrega(${entrega.id})" title="Eliminar">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="entrega-detalles">
                    <div class="entrega-fecha">
                        <span class="fecha-label">Fecha:</span>
                        <span class="fecha-value">${entrega.fecha_entrega}</span>
                    </div>
                    ${entrega.cantidad_uniformes > 0 ? `<span class="detalle-item">Uniformes: ${entrega.cantidad_uniformes}</span>` : ''}
                    ${entrega.cantidad_botas > 0 ? `<span class="detalle-item">Botas: ${entrega.cantidad_botas}</span>` : ''}
                    ${entrega.observaciones ? `<div class="observaciones">Observaciones: ${entrega.observaciones}</div>` : ''}
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
    cargarEntregas();
}

// Editar entrega
async function editarEntrega(entregaId) {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Obtener datos de la entrega
        const response = await fetch(`${apiURL}/api/uniformes/listar`);
        const data = await response.json();
        
        if (!data.success) {
            alert('Error al cargar datos de la entrega');
            return;
        }
        
        const entrega = data.data.find(e => e.id === entregaId);
        if (!entrega) {
            alert('Entrega no encontrada');
            return;
        }
        
        // Llenar formulario
        document.getElementById('editarEntregaId').value = entrega.id;
        document.getElementById('editarTipoEntrega').value = entrega.tipo;
        
        // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD
        const [day, month, year] = entrega.fecha_entrega.split('/');
        document.getElementById('editarFechaEntrega').value = `${year}-${month}-${day}`;
        
        document.getElementById('editarCantidadUniformes').value = entrega.cantidad_uniformes || 0;
        document.getElementById('editarCantidadBotas').value = entrega.cantidad_botas || 0;
        document.getElementById('editarObservaciones').value = entrega.observaciones || '';
        
        // Mostrar modal
        document.getElementById('modalEditar').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar datos de la entrega');
    }
}

// Cerrar modal de editar
function cerrarModalEditar() {
    document.getElementById('modalEditar').style.display = 'none';
}

// Guardar edición
document.getElementById('formEditar')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const entregaId = document.getElementById('editarEntregaId').value;
    const tipo = document.getElementById('editarTipoEntrega').value;
    const fechaEntrega = document.getElementById('editarFechaEntrega').value;
    const cantidadUniformes = parseInt(document.getElementById('editarCantidadUniformes').value) || 0;
    const cantidadBotas = parseInt(document.getElementById('editarCantidadBotas').value) || 0;
    const observaciones = document.getElementById('editarObservaciones').value;
    
    // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
    const [year, month, day] = fechaEntrega.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;
    
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        const response = await fetch(`${apiURL}/api/uniformes/${entregaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: tipo,
                fecha_entrega: fechaFormateada,
                cantidad_uniformes: cantidadUniformes,
                cantidad_botas: cantidadBotas,
                observaciones: observaciones || null
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Entrega actualizada correctamente');
            cerrarModalEditar();
            cargarEntregas();
        } else {
            alert(`❌ Error: ${data.message || 'Error desconocido'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
});

// Eliminar entrega
async function eliminarEntrega(entregaId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta entrega?')) {
        return;
    }
    
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        const response = await fetch(`${apiURL}/api/uniformes/${entregaId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Entrega eliminada correctamente');
            cargarEntregas();
        } else {
            alert(`❌ Error: ${data.message || 'Error desconocido'}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const modalRegistrar = document.getElementById('modalRegistrar');
    const modalEditar = document.getElementById('modalEditar');
    if (event.target === modalRegistrar) {
        cerrarModalRegistrar();
    }
    if (event.target === modalEditar) {
        cerrarModalEditar();
    }
}

// Volver al menú
function volver() {
    window.location.href = 'menu.html';
}
