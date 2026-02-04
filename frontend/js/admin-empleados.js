// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar empleados de ambas áreas al inicio
    cargarEmpleados();

    // Configurar formulario de descuento
    document.getElementById('formDescuento').addEventListener('submit', agregarDescuento);
    
    // Configurar formulario de empleado
    document.getElementById('formEmpleado').addEventListener('submit', guardarEmpleado);
});

// Variable global para almacenar todos los empleados
let todosLosEmpleados = [];

// Cargar todos los empleados
async function cargarEmpleados() {
    const listaEmpleados = document.getElementById('listaEmpleadosPlanta');
    
    listaEmpleados.innerHTML = '<div class="loading">Cargando empleados...</div>';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Cargar todos los empleados sin filtrar por área
        const response = await fetch(`${apiURL}/api/empleados/listar`);
        const data = await response.json();

        if (data.success) {
            todosLosEmpleados = data.data;
            mostrarEmpleados(data.data, 'Planta'); // Mostrar todos en la sección de Planta
        } else {
            listaEmpleados.innerHTML = `<div class="error">Error: ${data.message || 'Error desconocido'}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        listaEmpleados.innerHTML = '<div class="error">Error de conexión. Verifica que el servidor esté corriendo.</div>';
    }
}

// Filtrar empleados
function filtrarEmpleados() {
    const busqueda = document.getElementById('busquedaEmpleados').value.toLowerCase().trim();
    
    if (!busqueda) {
        // Si no hay búsqueda, mostrar todos
        mostrarEmpleados(todosLosEmpleados, 'Planta');
        return;
    }

    const empleadosFiltrados = todosLosEmpleados.filter(empleado => {
        const nombreCompleto = `${empleado.nombre} ${empleado.apellido}`.toLowerCase();
        const codigo = (empleado.codigo || '').toLowerCase();
        const nombre = (empleado.nombre || '').toLowerCase();
        const apellido = (empleado.apellido || '').toLowerCase();

        // Buscar en nombre completo, código, nombre solo o apellido solo
        return nombreCompleto.includes(busqueda) || 
               codigo.includes(busqueda) ||
               nombre.includes(busqueda) ||
               apellido.includes(busqueda);
    });
    
    mostrarEmpleados(empleadosFiltrados, 'Planta');
}

// Mostrar lista de empleados
function mostrarEmpleados(empleados, area) {
    // Ya no separamos por área, siempre usar Planta
    const listaDiv = document.getElementById('listaEmpleadosPlanta');
    const countDiv = document.getElementById('countPlanta');

    // Actualizar contador
    countDiv.textContent = `${empleados.length} empleado${empleados.length !== 1 ? 's' : ''}`;

    if (empleados.length === 0) {
        listaDiv.innerHTML = '<div class="empty-state">No se encontraron empleados</div>';
        return;
    }

    let html = '<div class="empleados-table">';

    empleados.forEach(empleado => {
        html += `
            <div class="empleado-item">
                <div class="empleado-main-content">
                    <div class="empleado-foto-qr">
                        ${empleado.foto ? `<img src="${empleado.foto}" alt="${empleado.nombre}" class="empleado-foto" onerror="this.style.display='none'">` : '<div class="empleado-foto-placeholder">📷</div>'}
                        <div class="empleado-qr-container" id="qr-container-${empleado.id}">
                            <div class="qr-loading">Cargando QR...</div>
                        </div>
                    </div>
                    <div class="empleado-datos">
                        <div class="empleado-nombre">${empleado.nombre} ${empleado.apellido}</div>
                        <div class="empleado-id">ID: ${empleado.id}</div>
                        <div class="empleado-qr-text">Código QR: <span class="qr-text-value" id="qr-text-${empleado.id}">${empleado.codigo}</span></div>
                        <div class="empleado-vacaciones-disponibles" id="vacaciones-disponibles-${empleado.id}">
                            <span class="loading-text">Cargando días disponibles...</span>
                        </div>
                        <div class="empleado-ultimas-entregas" id="ultimas-entregas-${empleado.id}">
                            <span class="loading-text">Cargando últimas entregas...</span>
                        </div>
                    </div>
                </div>
                <div class="empleado-actions">
                    <button class="btn btn-action-small" onclick="generarGafete(${empleado.id}, '${(empleado.nombre + ' ' + empleado.apellido).replace(/'/g, "\\'")}', '${empleado.codigo || ''}', '${empleado.foto || ''}')" title="Descargar gafete">
                        🪪 Gafete
                    </button>
                    <button class="btn btn-action-small" onclick="editarEmpleado(${empleado.id})" title="Editar empleado">
                        ✏️ Editar
                    </button>
                    <button class="btn btn-action-small" onclick="abrirModalDescuento(${empleado.id}, '${(empleado.nombre + ' ' + empleado.apellido).replace(/'/g, "\\'")}')" title="Agregar descuento">
                        ➕ Descuento
                    </button>
                    <button class="btn btn-action-small" onclick="verDescuentos(${empleado.id}, '${(empleado.nombre + ' ' + empleado.apellido).replace(/'/g, "\\'")}')" title="Ver descuentos">
                        💰 Ver
                    </button>
                    <button class="btn btn-danger btn-action-small" onclick="eliminarEmpleado(${empleado.id}, '${(empleado.nombre + ' ' + empleado.apellido).replace(/'/g, "\\'")}')" title="Eliminar empleado">
                        🗑️ Eliminar
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';

    listaDiv.innerHTML = html;

    // Cargar códigos QR, días disponibles de vacaciones y últimas entregas para cada empleado
    empleados.forEach(empleado => {
        cargarQR(empleado.id);
        cargarDiasVacacionesDisponibles(empleado.id);
        cargarUltimasEntregas(empleado.id);
    });
}

// Cargar días disponibles de vacaciones para un empleado
async function cargarDiasVacacionesDisponibles(empleadoId) {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const container = document.getElementById(`vacaciones-disponibles-${empleadoId}`);
        if (!container) return;

        const añoActual = new Date().getFullYear();
        const response = await fetch(`${apiURL}/api/vacaciones/empleado/${empleadoId}/disponibles?año=${añoActual}`);
        const data = await response.json();

        if (data.success) {
            container.innerHTML = `
                <div class="vacaciones-disponibles-info">
                    <span class="vacaciones-label">Días de vacaciones disponibles:</span>
                    <span class="vacaciones-value">${data.dias_disponibles}/12</span>
                </div>
            `;
        } else {
            container.innerHTML = `<span class="error-text">Error al cargar días disponibles</span>`;
        }
    } catch (error) {
        console.error('Error al cargar días disponibles:', error);
        const container = document.getElementById(`vacaciones-disponibles-${empleadoId}`);
        if (container) {
            container.innerHTML = `<span class="error-text">Error de conexión</span>`;
        }
    }
}

// Cargar código QR de un empleado
async function cargarQR(empleadoId) {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/empleados/${empleadoId}/qr`);
        const data = await response.json();

        if (data.success) {
            const qrContainer = document.getElementById(`qr-container-${empleadoId}`);
            const qrTextElement = document.getElementById(`qr-text-${empleadoId}`);
            
            if (qrContainer) {
                qrContainer.innerHTML = `<img src="${data.qr_image}" alt="QR Code" class="empleado-qr-image">`;
            }
            
            if (qrTextElement) {
                qrTextElement.textContent = data.qr_text;
            }
        }
    } catch (error) {
        console.error('Error al cargar QR:', error);
        const qrContainer = document.getElementById(`qr-container-${empleadoId}`);
        if (qrContainer) {
            qrContainer.innerHTML = '<div class="qr-error">Error al cargar QR</div>';
        }
    }
}

// Cargar últimas entregas de uniformes y botas
async function cargarUltimasEntregas(empleadoId) {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const container = document.getElementById(`ultimas-entregas-${empleadoId}`);
        if (!container) return;

        // Obtener todas las entregas del empleado
        const response = await fetch(`${apiURL}/api/uniformes/empleado/${empleadoId}`);
        const data = await response.json();

        if (!data.success || !data.data || data.data.length === 0) {
            container.innerHTML = `
                <div class="ultimas-entregas-info">
                    <div class="entrega-item-info">
                        <span class="entrega-label">Uniforme:</span>
                        <span class="entrega-fecha sin-entregas">Sin entregas</span>
                    </div>
                    <div class="entrega-item-info">
                        <span class="entrega-label">Botas:</span>
                        <span class="entrega-fecha sin-entregas">Sin entregas</span>
                    </div>
                </div>
            `;
            return;
        }

        // Buscar la última entrega de uniformes y botas
        // Las entregas ya vienen ordenadas por fecha DESC
        let fechaUniforme = null;
        let fechaBotas = null;

        // Convertir fecha DD/MM/YYYY a número para comparar (YYYYMMDD)
        const fechaANumero = (fechaStr) => {
            const [day, month, year] = fechaStr.split('/');
            return parseInt(year + month.padStart(2, '0') + day.padStart(2, '0'));
        };

        for (const entrega of data.data) {
            const fechaNum = fechaANumero(entrega.fecha_entrega);

            if ((entrega.tipo === 'uniforme' || entrega.tipo === 'ambos') && !fechaUniforme) {
                fechaUniforme = entrega.fecha_entrega;
            }

            if ((entrega.tipo === 'botas' || entrega.tipo === 'ambos') && !fechaBotas) {
                fechaBotas = entrega.fecha_entrega;
            }

            // Si ya tenemos ambas fechas, podemos salir del loop
            if (fechaUniforme && fechaBotas) {
                break;
            }
        }

        // Construir HTML
        let html = '<div class="ultimas-entregas-info">';
        
        html += `
            <div class="entrega-item-info">
                <span class="entrega-label">Uniforme:</span>
                <span class="entrega-fecha ${!fechaUniforme ? 'sin-entregas' : ''}">${fechaUniforme || 'Sin entregas'}</span>
            </div>
            <div class="entrega-item-info">
                <span class="entrega-label">Botas:</span>
                <span class="entrega-fecha ${!fechaBotas ? 'sin-entregas' : ''}">${fechaBotas || 'Sin entregas'}</span>
            </div>
        `;

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Error al cargar últimas entregas:', error);
        const container = document.getElementById(`ultimas-entregas-${empleadoId}`);
        if (container) {
            container.innerHTML = '<span class="error-text">Error al cargar</span>';
        }
    }
}

// Abrir modal para agregar descuento
function abrirModalDescuento(empleadoId, nombreEmpleado) {
    document.getElementById('empleadoIdDescuento').value = empleadoId;
    document.getElementById('empleadoNombreDescuento').value = nombreEmpleado;
    document.getElementById('modalTituloDescuento').textContent = `Agregar Descuento - ${nombreEmpleado}`;
    
    // Establecer semana actual por defecto
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    document.getElementById('fechaInicioDescuento').value = lunes.toISOString().split('T')[0];
    document.getElementById('fechaFinDescuento').value = domingo.toISOString().split('T')[0];
    
    // Limpiar formulario
    document.getElementById('montoDescuento').value = '';
    document.getElementById('descripcionDescuento').value = '';
    
    document.getElementById('modalDescuento').style.display = 'block';
}

// Cerrar modal de descuento
function cerrarModalDescuento() {
    document.getElementById('modalDescuento').style.display = 'none';
}

// Agregar descuento
async function agregarDescuento(e) {
    e.preventDefault();

    const empleadoId = document.getElementById('empleadoIdDescuento').value;
    const nombreEmpleado = document.getElementById('empleadoNombreDescuento').value;
    const fechaInicio = document.getElementById('fechaInicioDescuento').value;
    const fechaFin = document.getElementById('fechaFinDescuento').value;
    const monto = document.getElementById('montoDescuento').value;
    const descripcion = document.getElementById('descripcionDescuento').value;

    // Convertir fechas de YYYY-MM-DD a DD/MM/YYYY
    const [yearInicio, monthInicio, dayInicio] = fechaInicio.split('-');
    const [yearFin, monthFin, dayFin] = fechaFin.split('-');
    const fechaInicioFormateada = `${dayInicio}/${monthInicio}/${yearInicio}`;
    const fechaFinFormateada = `${dayFin}/${monthFin}/${yearFin}`;

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/empleados/${empleadoId}/descuentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fecha_inicio: fechaInicioFormateada,
                fecha_fin: fechaFinFormateada,
                monto: parseFloat(monto),
                descripcion: descripcion || null
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ ${data.message}`);
            cerrarModalDescuento();
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Ver descuentos de un empleado
async function verDescuentos(empleadoId, nombreEmpleado) {
    const modal = document.getElementById('modalVerDescuentos');
    const modalTitulo = document.getElementById('modalTituloVerDescuentos');
    const modalBody = document.getElementById('modalBodyDescuentos');

    modalTitulo.textContent = `Descuentos - ${nombreEmpleado}`;
    modalBody.innerHTML = '<div class="loading">Cargando descuentos...</div>';
    modal.style.display = 'block';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/empleados/${empleadoId}/descuentos`);
        const data = await response.json();

        if (data.success) {
            mostrarDescuentos(data.data, empleadoId);
        } else {
            modalBody.innerHTML = `<div class="error">Error: ${data.message}</div>`;
        }
    } catch (error) {
        console.error('Error:', error);
        modalBody.innerHTML = '<div class="error">Error de conexión. Verifica que el servidor esté corriendo.</div>';
    }
}

// Mostrar descuentos en el modal
function mostrarDescuentos(descuentos, empleadoId) {
    const modalBody = document.getElementById('modalBodyDescuentos');

    if (descuentos.length === 0) {
        modalBody.innerHTML = '<div class="empty-state">No hay descuentos registrados</div>';
        return;
    }

    let html = '<div class="descuentos-lista">';

    descuentos.forEach(descuento => {
        const fechaCreado = new Date(descuento.creado_en);
        const fechaFormateada = fechaCreado.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        html += `
            <div class="descuento-item">
                <div class="descuento-header">
                    <div class="descuento-info">
                        <strong>$${parseFloat(descuento.monto).toFixed(2)}</strong>
                        <span class="descuento-periodo">Período: ${descuento.fecha_inicio} al ${descuento.fecha_fin}</span>
                        ${descuento.descripcion ? `<span class="descuento-descripcion">${descuento.descripcion}</span>` : ''}
                        <span class="descuento-fecha">Agregado: ${fechaFormateada}</span>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="eliminarDescuento(${descuento.id}, ${empleadoId})">🗑️ Eliminar</button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    modalBody.innerHTML = html;
}

// Eliminar descuento
async function eliminarDescuento(descuentoId, empleadoId) {
    if (!confirm('¿Estás seguro de eliminar este descuento?')) {
        return;
    }

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/empleados/descuentos/${descuentoId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert('✅ Descuento eliminado correctamente');
            // Recargar descuentos
            const nombreEmpleado = document.getElementById('modalTituloVerDescuentos').textContent.replace('Descuentos - ', '');
            verDescuentos(empleadoId, nombreEmpleado);
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Cerrar modal de ver descuentos
function cerrarModalVerDescuentos() {
    document.getElementById('modalVerDescuentos').style.display = 'none';
}

// Cerrar modales al hacer clic fuera
window.onclick = function(event) {
    const modalDescuento = document.getElementById('modalDescuento');
    const modalVerDescuentos = document.getElementById('modalVerDescuentos');
    const modalEmpleado = document.getElementById('modalEmpleado');
    
    if (event.target === modalDescuento) {
        cerrarModalDescuento();
    }
    if (event.target === modalVerDescuentos) {
        cerrarModalVerDescuentos();
    }
    if (event.target === modalEmpleado) {
        cerrarModalEmpleado();
    }
}

// Actualizar fecha fin cuando cambia fecha inicio (para mantener semana completa)
document.getElementById('fechaInicioDescuento')?.addEventListener('change', function() {
    const fechaInicio = this.value;
    if (fechaInicio) {
        const inicio = new Date(fechaInicio);
        const fin = new Date(inicio);
        fin.setDate(inicio.getDate() + 6); // 7 días (semana completa)
        document.getElementById('fechaFinDescuento').value = fin.toISOString().split('T')[0];
    }
});

// Abrir modal para agregar empleado
function abrirModalEmpleado() {
    const modal = document.getElementById('modalEmpleado');
    const titulo = document.getElementById('modalTituloEmpleado');
    const form = document.getElementById('formEmpleado');
    const btnGuardar = document.getElementById('btnGuardarEmpleado');
    
    // Limpiar formulario
    form.reset();
    document.getElementById('empleadoId').value = '';
    document.getElementById('empleadoSueldo').value = '2000';
    
    // Limpiar foto
    limpiarFotoPreview();
    
    titulo.textContent = 'Agregar Empleado';
    btnGuardar.textContent = 'Guardar';
    modal.style.display = 'block';
}

// Cerrar modal de empleado
function cerrarModalEmpleado() {
    document.getElementById('modalEmpleado').style.display = 'none';
}

// Editar empleado
async function editarEmpleado(empleadoId) {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/empleados/${empleadoId}`);
        const data = await response.json();

        if (data.success) {
            const empleado = data.data;
            const modal = document.getElementById('modalEmpleado');
            const titulo = document.getElementById('modalTituloEmpleado');
            const btnGuardar = document.getElementById('btnGuardarEmpleado');
            
            // Llenar formulario con datos del empleado
            document.getElementById('empleadoId').value = empleado.id;
            document.getElementById('empleadoNombre').value = empleado.nombre;
            document.getElementById('empleadoApellido').value = empleado.apellido;
            document.getElementById('empleadoCargo').value = empleado.cargo && empleado.cargo !== 'Desconocido' ? empleado.cargo : '';
            document.getElementById('empleadoSueldo').value = empleado.sueldo_base || 2000;
            
            // Mostrar foto actual si existe
            if (empleado.foto) {
                mostrarFotoPreview(empleado.foto);
            } else {
                limpiarFotoPreview();
            }
            
            titulo.textContent = `Editar Empleado - ${empleado.nombre} ${empleado.apellido}`;
            btnGuardar.textContent = 'Actualizar';
            modal.style.display = 'block';
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Guardar empleado (crear o actualizar)
async function guardarEmpleado(e) {
    e.preventDefault();

    const empleadoId = document.getElementById('empleadoId').value;
    const nombre = document.getElementById('empleadoNombre').value.trim();
    const apellido = document.getElementById('empleadoApellido').value.trim();
    const cargo = document.getElementById('empleadoCargo').value.trim();
    const sueldo = document.getElementById('empleadoSueldo').value;

    if (!nombre || !apellido || !sueldo) {
        alert('❌ Por favor completa los campos requeridos (Nombre, Apellido, Sueldo Base)');
        return;
    }

    const sueldoNum = parseFloat(sueldo);
    if (isNaN(sueldoNum) || sueldoNum <= 0) {
        alert('❌ El sueldo base debe ser un número positivo');
        return;
    }

    const empleadoData = {
        nombre: nombre,
        apellido: apellido,
        cargo: (cargo && cargo.trim()) ? cargo.trim() : null,
        sueldo_base: sueldoNum
    };

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        let response;
        
        if (empleadoId) {
            // Actualizar empleado existente
            response = await fetch(`${apiURL}/api/empleados/${empleadoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(empleadoData)
            });
        } else {
            // Crear nuevo empleado
            response = await fetch(`${apiURL}/api/empleados`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(empleadoData)
            });
        }

        const data = await response.json();

        if (data.success) {
            // Si hay una foto seleccionada, subirla
            const inputFoto = document.getElementById('inputFoto');
            if (inputFoto.files && inputFoto.files.length > 0) {
                const empleadoIdParaFoto = empleadoId || data.data.id;
                await subirFoto(empleadoIdParaFoto, inputFoto.files[0]);
            }
            
            alert(`✅ ${data.message}`);
            cerrarModalEmpleado();
            cargarEmpleados(); // Recargar lista
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Eliminar empleado
async function eliminarEmpleado(empleadoId, nombreEmpleado) {
    if (!confirm(`⚠️ ¿Estás SEGURO de eliminar completamente al empleado "${nombreEmpleado}"?\n\nEsta acción eliminará:\n- El empleado\n- Todos sus registros de asistencia\n- Todos sus pagos\n- Todos sus bonos\n- Todas sus vacaciones\n- Todos sus uniformes y botas\n- Todos sus descuentos\n- Todos sus exámenes médicos\n\n⚠️ Esta acción NO se puede deshacer.`)) {
        return;
    }

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/empleados/${empleadoId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert(`✅ ${data.message}`);
            cargarEmpleados(); // Recargar lista
        } else {
            alert(`❌ Error: ${data.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error de conexión. Verifica que el servidor esté corriendo.');
    }
}

// Generar y descargar gafete del empleado
async function generarGafete(empleadoId, nombreCompleto, codigo, foto) {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Obtener QR del empleado
        const qrResponse = await fetch(`${apiURL}/api/empleados/${empleadoId}/qr`);
        const qrData = await qrResponse.json();
        
        if (!qrData.success) {
            alert('Error al obtener el código QR del empleado');
            return;
        }
        
        // Crear canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Dimensiones del gafete (tamaño estándar de credencial)
        const width = 400;
        const height = 600;
        canvas.width = width;
        canvas.height = height;
        
        // Fondo blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // Borde
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, width - 10, height - 10);
        
        // Cargar y dibujar foto
        const fotoImg = new Image();
        fotoImg.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
            if (foto) {
                fotoImg.onload = () => {
                    // Foto circular en la parte superior
                    const fotoSize = 120;
                    const fotoX = (width - fotoSize) / 2;
                    const fotoY = 40;
                    
                    // Crear máscara circular
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(fotoImg, fotoX, fotoY, fotoSize, fotoSize);
                    ctx.restore();
                    
                    // Borde circular
                    ctx.beginPath();
                    ctx.arc(fotoX + fotoSize / 2, fotoY + fotoSize / 2, fotoSize / 2, 0, Math.PI * 2);
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    
                    resolve();
                };
                fotoImg.onerror = () => {
                    // Si falla la foto, dibujar placeholder
                    ctx.fillStyle = '#cccccc';
                    ctx.beginPath();
                    ctx.arc(width / 2, 100, 60, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#666666';
                    ctx.font = '40px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('📷', width / 2, 115);
                    resolve();
                };
                fotoImg.src = foto;
            } else {
                // Sin foto, dibujar placeholder
                ctx.fillStyle = '#cccccc';
                ctx.beginPath();
                ctx.arc(width / 2, 100, 60, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#666666';
                ctx.font = '40px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('📷', width / 2, 115);
                resolve();
            }
        });
        
        // Nombre del empleado
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(nombreCompleto, width / 2, 200);
        
        // Cargar y dibujar QR
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
            qrImg.onload = () => {
                // QR en el centro
                const qrSize = 200;
                const qrX = (width - qrSize) / 2;
                const qrY = 250;
                
                ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
                resolve();
            };
            qrImg.onerror = reject;
            qrImg.src = qrData.qr_image;
        });
        
        // Código del QR
        ctx.fillStyle = '#000000';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(codigo || qrData.qr_text, width / 2, 480);
        
        // Convertir canvas a imagen y descargar
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gafete_${nombreCompleto.replace(/\s+/g, '_')}_${codigo || empleadoId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 'image/png');
        
    } catch (error) {
        console.error('Error al generar gafete:', error);
        alert('Error al generar el gafete. Por favor, intenta de nuevo.');
    }
}

// Volver al menú
function volver() {
    window.location.href = 'menu.html';
}

