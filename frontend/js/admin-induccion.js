// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    cargarEmpleados();
});

// Cargar todos los empleados
async function cargarEmpleados() {
    const cargandoPlanta = document.getElementById('cargandoPlanta');
    const listaPlanta = document.getElementById('listaEmpleadosPlanta');
    const sinEmpleadosPlanta = document.getElementById('sinEmpleadosPlanta');

    cargandoPlanta.style.display = 'block';
    listaPlanta.innerHTML = '';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/empleados/listar-con-cargos`);
        const data = await response.json();

        cargandoPlanta.style.display = 'none';

        if (data.success && data.data.length > 0) {
            mostrarEmpleados(data.data, 'Planta');
            sinEmpleadosPlanta.style.display = 'none';
        } else {
            listaPlanta.innerHTML = '';
            sinEmpleadosPlanta.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        cargandoPlanta.style.display = 'none';
        listaPlanta.innerHTML = '<p class="error-message">Error al cargar empleados. Por favor, recarga la página.</p>';
    }
}

// Mostrar empleados en tabla
function mostrarEmpleados(empleados, area) {
    // Ya no separamos por área, siempre usar Planta
    const listaEmpleados = document.getElementById('listaEmpleadosPlanta');
    const countDiv = document.getElementById('countPlanta');

    // Actualizar contador
    countDiv.textContent = `${empleados.length} empleado${empleados.length !== 1 ? 's' : ''}`;

    const tabla = `
        <div class="tabla-container">
            <table class="empleados-tabla">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nombre Completo</th>
                        <th>Química Sanguínea</th>
                        <th>Antidoping</th>
                        <th>Electrocardiograma</th>
                        <th>Espirometrías</th>
                        <th>Audiometrías</th>
                        <th>Vigencia de Estudios</th>
                        <th>Fecha de Nacimiento</th>
                        <th>Vence Inducción</th>
                        <th>Mandar a Curso</th>
                    </tr>
                </thead>
                <tbody>
                    ${empleados.map((emp, index) => `
                        <tr>
                            <td class="numero">${index + 1}</td>
                            <td class="nombre">${emp.nombre} ${emp.apellido}</td>
                            <td class="examen-cell" data-empleado-id="${emp.id}" data-tipo-examen="quimica_sanguinea" data-estado="${emp.quimica_sanguinea}">
                                <div class="examen-icon ${emp.quimica_sanguinea ? 'check' : 'cross'}">
                                    ${emp.quimica_sanguinea ? '✓' : '✗'}
                                </div>
                            </td>
                            <td class="examen-cell" data-empleado-id="${emp.id}" data-tipo-examen="antidoping" data-estado="${emp.antidoping}">
                                <div class="examen-icon ${emp.antidoping ? 'check' : 'cross'}">
                                    ${emp.antidoping ? '✓' : '✗'}
                                </div>
                            </td>
                            <td class="examen-cell" data-empleado-id="${emp.id}" data-tipo-examen="electrocardiogram" data-estado="${emp.electrocardiogram}">
                                <div class="examen-icon ${emp.electrocardiogram ? 'check' : 'cross'}">
                                    ${emp.electrocardiogram ? '✓' : '✗'}
                                </div>
                            </td>
                            <td class="examen-cell" data-empleado-id="${emp.id}" data-tipo-examen="espirometrias" data-estado="${emp.espirometrias}">
                                <div class="examen-icon ${emp.espirometrias ? 'check' : 'cross'}">
                                    ${emp.espirometrias ? '✓' : '✗'}
                                </div>
                            </td>
                            <td class="examen-cell" data-empleado-id="${emp.id}" data-tipo-examen="audiometrias" data-estado="${emp.audiometrias}">
                                <div class="examen-icon ${emp.audiometrias ? 'check' : 'cross'}">
                                    ${emp.audiometrias ? '✓' : '✗'}
                                </div>
                            </td>
                            <td class="fecha-cell fecha-editable" 
                                data-empleado-id="${emp.id}" 
                                data-tipo-fecha="vigencia_de" 
                                data-fecha="${emp.vigencia_de || ''}"
                                onclick="editarFecha(this)">
                                ${formatearFechaConColor(emp.vigencia_de)}
                            </td>
                            <td class="fecha-cell fecha-editable" 
                                data-empleado-id="${emp.id}" 
                                data-tipo-fecha="fecha_nacimiento" 
                                data-fecha="${emp.fecha_nacimiento || ''}"
                                onclick="editarFecha(this)">
                                ${emp.fecha_nacimiento || '<span class="sin-fecha">-</span>'}
                            </td>
                            <td class="fecha-cell fecha-editable" 
                                data-empleado-id="${emp.id}" 
                                data-tipo-fecha="vence_induccion" 
                                data-fecha="${emp.vence_induccion || ''}"
                                onclick="editarFecha(this)">
                                ${formatearFechaConColor(emp.vence_induccion)}
                            </td>
                            <td class="fecha-cell fecha-editable" 
                                data-empleado-id="${emp.id}" 
                                data-tipo-fecha="mandar_a_curso" 
                                data-fecha="${emp.mandar_a_curso || ''}"
                                onclick="editarFecha(this)">
                                ${formatearFechaConColor(emp.mandar_a_curso)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    listaEmpleados.innerHTML = tabla;
    
    // Agregar event listeners a las celdas de examen
    const celdasExamen = document.querySelectorAll('.examen-cell');
    celdasExamen.forEach(celda => {
        celda.addEventListener('click', function() {
            const empleadoId = this.getAttribute('data-empleado-id');
            const tipoExamen = this.getAttribute('data-tipo-examen');
            const estadoActual = parseInt(this.getAttribute('data-estado'));
            toggleExamen(empleadoId, tipoExamen, estadoActual);
        });
    });
}

// Toggle examen médico
async function toggleExamen(empleadoId, tipoExamen, estadoActual) {
    const nuevoEstado = !estadoActual;
    
    // Guardar posición de scroll
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/empleados/${empleadoId}/examen-medico`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo_examen: tipoExamen,
                completado: nuevoEstado
            })
        });

        const data = await response.json();

        if (data.success) {
            // Actualizar solo el ícono sin recargar toda la lista
            actualizarIconoExamen(empleadoId, tipoExamen, nuevoEstado);
        } else {
            alert('Error al actualizar el examen: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión. Por favor, intenta de nuevo.');
    } finally {
        // Restaurar posición de scroll después de un breve delay
        setTimeout(() => {
            window.scrollTo(0, scrollPosition);
        }, 50);
    }
}

// Actualizar solo el ícono del examen sin recargar toda la tabla
function actualizarIconoExamen(empleadoId, tipoExamen, completado) {
    // Buscar la celda específica usando los data attributes
    const selector = `.examen-cell[data-empleado-id="${empleadoId}"][data-tipo-examen="${tipoExamen}"]`;
    const celda = document.querySelector(selector);
    
    if (!celda) return;
    
    const icono = celda.querySelector('.examen-icon');
    if (icono) {
        // Actualizar el ícono y la clase
        if (completado) {
            icono.textContent = '✓';
            icono.classList.remove('cross');
            icono.classList.add('check');
        } else {
            icono.textContent = '✗';
            icono.classList.remove('check');
            icono.classList.add('cross');
        }
        
        // Actualizar el data-estado para el próximo click
        celda.setAttribute('data-estado', completado ? '1' : '0');
    }
}

// Función para calcular días restantes hasta una fecha
function calcularDiasRestantes(fecha) {
    if (!fecha) return null;
    
    try {
        const [dia, mes, año] = fecha.split('/');
        const fechaVencimiento = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaVencimiento.setHours(0, 0, 0, 0);
        
        const diferencia = fechaVencimiento - hoy;
        const diasRestantes = Math.ceil(diferencia / (1000 * 60 * 60 * 24));
        
        return diasRestantes;
    } catch (error) {
        return null;
    }
}

// Función para formatear fecha con color según días restantes
function formatearFechaConColor(fecha) {
    if (!fecha) return '<span class="sin-fecha">-</span>';
    
    const diasRestantes = calcularDiasRestantes(fecha);
    
    if (diasRestantes === null) {
        return fecha;
    }
    
    let claseColor = '';
    if (diasRestantes <= 3) {
        claseColor = 'fecha-roja'; // Rojo: 3 días o menos
    } else if (diasRestantes <= 7) {
        claseColor = 'fecha-amarilla'; // Amarillo: 7 días o menos
    }
    
    return `<span class="${claseColor}" title="Faltan ${diasRestantes} día(s)">${fecha}</span>`;
}

// Editar fecha de curso o inducción
function editarFecha(celda) {
    const empleadoId = celda.getAttribute('data-empleado-id');
    const tipoFecha = celda.getAttribute('data-tipo-fecha');
    const fechaActual = celda.getAttribute('data-fecha') || '';
    
    // Convertir fecha DD/MM/YYYY a YYYY-MM-DD para el input date
    let fechaInput = '';
    if (fechaActual) {
        try {
            const [dia, mes, año] = fechaActual.split('/');
            fechaInput = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        } catch (e) {
            fechaInput = '';
        }
    }
    
    // Obtener nombre del campo según el tipo
    let nombreCampo = '';
    switch(tipoFecha) {
        case 'vence_induccion':
            nombreCampo = 'Vence Inducción';
            break;
        case 'mandar_a_curso':
            nombreCampo = 'Mandar a Curso';
            break;
        case 'vigencia_de':
            nombreCampo = 'Vigencia de Estudios';
            break;
        case 'fecha_nacimiento':
            nombreCampo = 'Fecha de Nacimiento';
            break;
        default:
            nombreCampo = tipoFecha;
    }
    
    const nuevaFecha = prompt(`Editar ${nombreCampo}:\n\nIngrese la fecha (DD/MM/YYYY) o deje vacío para eliminar:`, fechaActual);
    
    if (nuevaFecha === null) return; // Usuario canceló
    
    // Validar formato si se ingresó algo
    if (nuevaFecha.trim() !== '' && !/^\d{2}\/\d{2}\/\d{4}$/.test(nuevaFecha.trim())) {
        alert('Formato de fecha inválido. Debe ser DD/MM/YYYY');
        return;
    }
    
    const fechaFinal = nuevaFecha.trim() || null;
    
    // Guardar posición de scroll
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    
    // Actualizar en el servidor
    actualizarFecha(empleadoId, tipoFecha, fechaFinal, celda, scrollPosition);
}

// Actualizar fecha en el servidor
async function actualizarFecha(empleadoId, tipoFecha, fecha, celda, scrollPosition) {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/empleados/${empleadoId}/fecha-curso`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo_fecha: tipoFecha,
                fecha: fecha
            })
        });

        const data = await response.json();

        if (data.success) {
            // Actualizar la celda
            celda.setAttribute('data-fecha', fecha || '');
            celda.innerHTML = formatearFechaConColor(fecha);
        } else {
            alert('Error al actualizar la fecha: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión. Por favor, intenta de nuevo.');
    } finally {
        // Restaurar posición de scroll
        setTimeout(() => {
            window.scrollTo(0, scrollPosition);
        }, 50);
    }
}

// Volver al menú
function volver() {
    window.location.href = 'menu.html';
}

