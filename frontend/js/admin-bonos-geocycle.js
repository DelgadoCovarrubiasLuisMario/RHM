// Función para obtener la URL base de la API
function getAPIBase() {
    if (typeof API_CONFIG !== 'undefined' && API_CONFIG.getBaseURL) {
        return API_CONFIG.getBaseURL();
    }
    // Fallback si API_CONFIG no está disponible
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return window.location.origin;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Establecer fecha de hoy por defecto
    const hoy = new Date();
    const fechaStr = hoy.toISOString().split('T')[0];
    document.getElementById('fechaRegistro').value = fechaStr;

    // Establecer mes actual por defecto
    const mesStr = hoy.toISOString().slice(0, 7);
    document.getElementById('mesResumen').value = mesStr;

    // Calcular puntos en tiempo real
    document.getElementById('toneladasRegistro').addEventListener('input', calcularPuntosPreview);
});

// Cambiar tab
function cambiarTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tab === 'registro') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('tab-registro').classList.add('active');
    } else if (tab === 'historial') {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('tab-historial').classList.add('active');
        cargarHistorial();
    } else {
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
        document.getElementById('tab-resumen').classList.add('active');
    }
}

// Calcular puntos preview
function calcularPuntosPreview() {
    const toneladas = parseFloat(document.getElementById('toneladasRegistro').value);
    const preview = document.getElementById('puntosPreview');
    const puntosText = document.getElementById('puntosText');

    if (isNaN(toneladas) || toneladas <= 0) {
        preview.style.display = 'none';
        return;
    }

    let puntos = {
        rango_25_30: 0,
        rango_30_35: 0,
        rango_35_40: 0,
        rango_40_plus: 0
    };

    if (toneladas >= 25 && toneladas < 30) {
        puntos.rango_25_30 = toneladas - 25;
    } else if (toneladas >= 30 && toneladas < 35) {
        puntos.rango_30_35 = toneladas - 30;
    } else if (toneladas >= 35 && toneladas < 40) {
        puntos.rango_35_40 = toneladas - 35;
    } else if (toneladas >= 40) {
        puntos.rango_40_plus = toneladas - 40;
    }

    let texto = '';
    if (toneladas < 25) {
        texto = '❌ No alcanza el mínimo (25 ton) → 0 toneladas';
    } else {
        if (puntos.rango_25_30 > 0) texto += `Rango 25-30: ${puntos.rango_25_30.toFixed(2)} ton<br>`;
        if (puntos.rango_30_35 > 0) texto += `Rango 30-35: ${puntos.rango_30_35.toFixed(2)} ton<br>`;
        if (puntos.rango_35_40 > 0) texto += `Rango 35-40: ${puntos.rango_35_40.toFixed(2)} ton<br>`;
        if (puntos.rango_40_plus > 0) texto += `Rango 40+: ${puntos.rango_40_plus.toFixed(2)} ton<br>`;
    }

    puntosText.innerHTML = texto;
    preview.style.display = 'block';
}

// Registrar producción
async function registrarProduccion(event) {
    event.preventDefault();

    const fecha = document.getElementById('fechaRegistro').value;
    const nombreEmpleado = document.getElementById('empleadoRegistro').value.trim();
    const toneladas = parseFloat(document.getElementById('toneladasRegistro').value);
    const turno = document.getElementById('turnoRegistro').value;
    const comentarios = document.getElementById('comentariosRegistro').value.trim();

    if (!nombreEmpleado || !toneladas || !turno) {
        alert('Por favor completa todos los campos');
        return;
    }

    try {
        // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
        const [año, mes, dia] = fecha.split('-');
        const fechaFormato = `${dia}/${mes}/${año}`;

        // Registrar producción con nombre directamente
        const res = await fetch(`${getAPIBase()}/api/produccion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre_encargado: nombreEmpleado,
                fecha: fechaFormato,
                turno: parseInt(turno),
                toneladas: toneladas,
                comentarios: comentarios || null,
            })
        });

        // Verificar si la respuesta es JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('Respuesta no JSON:', text);
            throw new Error(`Error del servidor (${res.status}): ${text.substring(0, 100)}`);
        }

        const data = await res.json();

        if (data.success) {
            alert('✅ Producción registrada correctamente');
            document.getElementById('formRegistro').reset();
            document.getElementById('fechaRegistro').value = fecha;
            document.getElementById('comentariosRegistro').value = '';
            document.getElementById('puntosPreview').style.display = 'none';
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al registrar producción: ' + error.message);
    }
}


// Calcular bonos mensuales
async function calcularBonos() {
    const mesInput = document.getElementById('mesResumen').value;
    if (!mesInput) {
        alert('Selecciona un mes');
        return;
    }

    // Convertir de YYYY-MM a MM/YYYY
    const [año, mes] = mesInput.split('-');
    const mesFormato = `${mes}/${año}`;

    try {
        const res = await fetch(`${getAPIBase()}/api/produccion/calcular-bonos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mes: mesFormato,
            })
        });

        const data = await res.json();

        if (!data.success) {
            throw new Error(data.message);
        }

        if (!data.data) {
            throw new Error('No se recibieron datos del servidor');
        }

        mostrarResultadosBonos(data.data);
    } catch (error) {
        console.error('Error:', error);
        alert('Error al calcular bonos: ' + error.message);
    }
}

// Mostrar resultados de bonos (INDIVIDUAL POR EMPLEADO)
function mostrarResultadosBonos(resultados) {
    const tabla = document.getElementById('tablaBonos');
    const resultadoDiv = document.getElementById('resultadoBonos');

    if (!resultados || !resultados.empleados || resultados.empleados.length === 0) {
        tabla.innerHTML = '<tr><td colspan="6">No hay datos para este mes</td></tr>';
        resultadoDiv.style.display = 'block';
        return;
    }

    tabla.innerHTML = resultados.empleados.map(emp => {
        const ton25_30 = (emp.toneladas_25_30 || 0);
        const ton30_35 = (emp.toneladas_30_35 || 0);
        const ton35_40 = (emp.toneladas_35_40 || 0);
        const ton40_plus = (emp.toneladas_40_plus || 0);
        const bonoTotal = (emp.bono_total_individual || 0);

        const nombreMostrar = emp.nombre_encargado || emp.nombre || '';
        const nombreEquipo = nombreMostrar ? `Equipo de ${nombreMostrar}` : `${emp.nombre || ''} ${emp.apellido || ''}`.trim();

        return `
            <tr>
                <td><strong>${nombreEquipo}</strong></td>
                <td>${ton25_30.toFixed(2)}</td>
                <td>${ton30_35.toFixed(2)}</td>
                <td>${ton35_40.toFixed(2)}</td>
                <td>${ton40_plus.toFixed(2)}</td>
                <td><strong>$${bonoTotal.toFixed(2)}</strong></td>
            </tr>
        `;
    }).join('');

    resultadoDiv.style.display = 'block';
}


// Limpiar registros
async function limpiarRegistros() {
    if (!confirm('⚠️ ¿Estás SEGURO de que quieres eliminar TODOS los registros de producción de GeoCycle?\n\nEsta acción NO se puede deshacer.')) {
        return;
    }

    try {
        const res = await fetch(`${getAPIBase()}/api/produccion/limpiar/registros`, {
            method: 'DELETE'
        });

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text();
            console.error('Respuesta no JSON:', text);
            throw new Error(`Error del servidor (${res.status}): ${text.substring(0, 100)}`);
        }

        const data = await res.json();

        if (data.success) {
            alert(`✅ ${data.registros_eliminados || 0} registro(s) eliminado(s) correctamente`);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al limpiar registros: ' + error.message);
    }
}

// Cargar historial de registros (todos los registros)
async function cargarHistorial() {
    try {
        const res = await fetch(`${getAPIBase()}/api/produccion/listar`);
        const data = await res.json();

        const lista = document.getElementById('listaHistorial');

        if (!data.success || !data.data || data.data.length === 0) {
            lista.innerHTML = '<p>No hay registros disponibles</p>';
            return;
        }

        lista.innerHTML = `
            <table class="historial-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Encargado</th>
                        <th>Toneladas</th>
                        <th>Turno</th>
                        <th>Rangos</th>
                        <th>Comentarios</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.data.map(reg => {
                        let toneladasText = [];
                        if (reg.puntos_rango_25_30 > 0) toneladasText.push(`25-30: ${reg.puntos_rango_25_30.toFixed(2)}`);
                        if (reg.puntos_rango_30_35 > 0) toneladasText.push(`30-35: ${reg.puntos_rango_30_35.toFixed(2)}`);
                        if (reg.puntos_rango_35_40 > 0) toneladasText.push(`35-40: ${reg.puntos_rango_35_40.toFixed(2)}`);
                        if (reg.puntos_rango_40_plus > 0) toneladasText.push(`40+: ${reg.puntos_rango_40_plus.toFixed(2)}`);

                        const nombreMostrar = reg.nombre_encargado || `${reg.nombre} ${reg.apellido}`.trim();
                        const comentarios = reg.comentarios ? `<span title="${reg.comentarios}">${reg.comentarios.length > 50 ? reg.comentarios.substring(0, 50) + '...' : reg.comentarios}</span>` : '<span style="color: #999;">-</span>';

                        return `
                            <tr>
                                <td>${reg.fecha}</td>
                                <td>${nombreMostrar}</td>
                                <td>${reg.toneladas}</td>
                                <td>Turno ${reg.turno}</td>
                                <td>${toneladasText.join(', ') || '0'}</td>
                                <td style="max-width: 200px; word-wrap: break-word;">${comentarios}</td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-icon btn-edit" onclick="editarRegistro(${reg.id})" title="Editar registro">
                                            ✏️
                                        </button>
                                        <button class="btn-icon btn-delete" onclick="eliminarRegistro(${reg.id})" title="Eliminar registro">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('listaHistorial').innerHTML = '<p>Error al cargar historial</p>';
    }
}

// Editar registro
async function editarRegistro(id) {
    try {
        const res = await fetch(`${getAPIBase()}/api/produccion/${id}`);
        const data = await res.json();

        if (!data.success) {
            alert('Error al cargar el registro: ' + data.message);
            return;
        }

        const registro = data.data;
        
        // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD
        const [dia, mes, año] = registro.fecha.split('/');
        const fechaFormato = `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;

        // Llenar formulario de edición
        document.getElementById('editarId').value = registro.id;
        document.getElementById('editarFecha').value = fechaFormato;
        document.getElementById('editarEmpleado').value = registro.nombre_encargado || '';
        document.getElementById('editarToneladas').value = registro.toneladas;
        document.getElementById('editarTurno').value = registro.turno;
        document.getElementById('editarComentarios').value = registro.comentarios || '';

        // Mostrar modal
        document.getElementById('modalEditar').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar el registro');
    }
}

// Guardar edición
async function guardarEdicion(e) {
    e.preventDefault();

    const id = document.getElementById('editarId').value;
    const fecha = document.getElementById('editarFecha').value;
    const nombreEmpleado = document.getElementById('editarEmpleado').value;
    const toneladas = document.getElementById('editarToneladas').value;
    const turno = document.getElementById('editarTurno').value;

    // Convertir fecha de YYYY-MM-DD a DD/MM/YYYY
    const [año, mes, dia] = fecha.split('-');
    const fechaFormato = `${dia}/${mes}/${año}`;

    const comentarios = document.getElementById('editarComentarios').value.trim();

    try {
        const res = await fetch(`${getAPIBase()}/api/produccion/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre_encargado: nombreEmpleado,
                fecha: fechaFormato,
                turno: parseInt(turno),
                toneladas: toneladas,
                comentarios: comentarios || null,
            })
        });

        const data = await res.json();

        if (data.success) {
            alert('✅ Registro actualizado correctamente');
            cerrarModalEditar();
            // Recargar la vista actual
            const tabActivo = document.querySelector('.tab-content.active').id;
            if (tabActivo === 'tab-historial') {
                cargarHistorial();
            }
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar el registro: ' + error.message);
    }
}

// Cerrar modal de edición
function cerrarModalEditar() {
    document.getElementById('modalEditar').style.display = 'none';
    document.getElementById('formEditar').reset();
}

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    const modal = document.getElementById('modalEditar');
    if (event.target === modal) {
        cerrarModalEditar();
    }
}

// Actualizar función eliminarRegistro para recargar la vista correcta
async function eliminarRegistro(id) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;

    try {
        const res = await fetch(`${getAPIBase()}/api/produccion/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();

        if (data.success) {
            alert('Registro eliminado');
            // Recargar la vista actual
            const tabActivo = document.querySelector('.tab-content.active').id;
            if (tabActivo === 'tab-historial') {
                cargarHistorial();
            }
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar registro');
    }
}

// Volver al menú
function volver() {
    window.location.href = 'menu.html';
}

