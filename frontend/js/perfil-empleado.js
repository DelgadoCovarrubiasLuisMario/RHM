// Variables globales
let html5QrcodeScanner = null;
let movimientoSeleccionado = null;
let turnoSeleccionado = null;
let todosLosEmpleados = [];

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar empleados para la búsqueda
    cargarEmpleados();
    
    // Inicializar formulario directamente
    inicializarFormularioRegistro();
    
    // Cerrar lista al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#codigo') && !e.target.closest('#listaEmpleados') && !e.target.closest('#btnEscanearQR')) {
            const listaEmpleados = document.getElementById('listaEmpleados');
            if (listaEmpleados) {
                listaEmpleados.style.display = 'none';
            }
        }
    });
});

// Variable para intervalo de hora
let intervaloHora = null;
let listenersConfigurados = false;

// Configurar listeners de búsqueda
function configurarBusquedaEmpleados() {
    if (listenersConfigurados) return;
    
    const codigoInput = document.getElementById('codigo');
    if (!codigoInput) return;
    
    codigoInput.addEventListener('input', filtrarEmpleados);
    codigoInput.addEventListener('focus', function() {
        if (this.value) {
            filtrarEmpleados();
        } else {
            // Mostrar todos los empleados si no hay texto
            mostrarListaEmpleadosFiltrada(todosLosEmpleados.slice(0, 10));
        }
    });
    
    listenersConfigurados = true;
}

// Inicializar formulario de registro (se muestra directamente)
function inicializarFormularioRegistro() {
    // Actualizar fecha y hora cada segundo
    actualizarFechaHora();
    if (intervaloHora) clearInterval(intervaloHora);
    intervaloHora = setInterval(actualizarFechaHora, 1000);
    
    // Configurar búsqueda de empleados
    configurarBusquedaEmpleados();
    
    // Enfocar el campo de código
    setTimeout(() => {
        const input = document.getElementById('codigo');
        if (input) {
            input.focus();
        }
    }, 100);
}

// Actualizar fecha y hora en tiempo real
function actualizarFechaHora() {
    const ahora = new Date();
    
    // Formatear fecha (DD/MM/YYYY)
    const fecha = ahora.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    // Formatear hora (HH:MM:SS AM/PM)
    const hora = ahora.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    document.getElementById('fecha').value = fecha;
    document.getElementById('hora').value = hora;
}

// Cargar empleados para búsqueda
async function cargarEmpleados() {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Cargar todos los empleados sin filtrar por área
        const response = await fetch(`${apiURL}/api/empleados/listar`);
        const data = await response.json();
        
        if (data.success) {
            todosLosEmpleados = data.data || [];
        }
    } catch (error) {
        console.error('Error al cargar empleados:', error);
    }
}

// Filtrar empleados
function filtrarEmpleados() {
    const input = document.getElementById('codigo');
    if (!input) return;
    
    const busqueda = input.value.toLowerCase().trim();
    const listaEmpleados = document.getElementById('listaEmpleados');
    if (!listaEmpleados) return;
    
    if (!busqueda) {
        listaEmpleados.style.display = 'none';
        return;
    }
    
    const filtrados = todosLosEmpleados.filter(emp => {
        const nombreCompleto = `${emp.nombre} ${emp.apellido}`.toLowerCase();
        const codigo = (emp.codigo || '').toLowerCase();
        const nombre = (emp.nombre || '').toLowerCase();
        const apellido = (emp.apellido || '').toLowerCase();
        
        // Buscar en nombre completo, código, nombre solo o apellido solo
        return nombreCompleto.includes(busqueda) || 
               codigo.includes(busqueda) ||
               nombre.includes(busqueda) ||
               apellido.includes(busqueda);
    });
    
    mostrarListaEmpleadosFiltrada(filtrados.slice(0, 10)); // Mostrar máximo 10
}


// Mostrar lista filtrada
function mostrarListaEmpleadosFiltrada(empleados) {
    const listaEmpleados = document.getElementById('listaEmpleados');
    
    if (empleados.length === 0) {
        listaEmpleados.style.display = 'none';
        return;
    }
    
    listaEmpleados.innerHTML = empleados.map(emp => `
        <div class="empleado-item-lista" onclick="seleccionarEmpleado('${emp.codigo}', '${emp.nombre} ${emp.apellido}')">
            <div class="empleado-nombre-lista">${emp.nombre} ${emp.apellido}</div>
            <div class="empleado-codigo-lista">${emp.codigo.substring(0, 8)}...</div>
        </div>
    `).join('');
    
    listaEmpleados.style.display = 'block';
}

// Seleccionar empleado de la lista
function seleccionarEmpleado(codigo, nombre) {
    document.getElementById('codigo').value = codigo;
    document.getElementById('listaEmpleados').style.display = 'none';
}

// Seleccionar movimiento
function seleccionarMovimiento(movimiento) {
    movimientoSeleccionado = movimiento;
    document.getElementById('movimiento').value = movimiento;
    
    document.querySelectorAll('.movimiento-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-movimiento') === movimiento) {
            btn.classList.add('active');
        }
    });
}

// Seleccionar turno
function seleccionarTurno(turno) {
    turnoSeleccionado = turno;
    document.getElementById('turno').value = turno;
    
    document.querySelectorAll('.turno-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.getAttribute('data-turno')) === turno) {
            btn.classList.add('active');
        }
    });
}

// Activar escáner QR
function activarEscanner() {
    const qrReaderContainer = document.getElementById('qr-reader');
    const codigoInput = document.getElementById('codigo');
    
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
        qrReaderContainer.style.display = 'none';
        return;
    }

    qrReaderContainer.style.display = 'block';
    
    html5QrcodeScanner = new Html5Qrcode("qr-reader");
    
    html5QrcodeScanner.start(
        { facingMode: "environment" },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        (decodedText, decodedResult) => {
            codigoInput.value = decodedText;
            html5QrcodeScanner.stop();
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
            qrReaderContainer.style.display = 'none';
        },
        (errorMessage) => {
            // Ignorar errores continuos
        }
    ).catch((err) => {
        console.error("Error al iniciar escáner:", err);
        alert('Error al activar la cámara. Asegúrate de dar permisos de cámara.');
        qrReaderContainer.style.display = 'none';
    });
}

// Manejar envío del formulario
document.getElementById('registroForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const codigo = document.getElementById('codigo').value;
    const movimiento = document.getElementById('movimiento').value;
    const turno = document.getElementById('turno').value;
    
    // Validar campos
    if (!codigo || !movimiento || !turno) {
        mostrarMensaje('Por favor completa todos los campos requeridos', 'error');
        return;
    }

    // Deshabilitar botón mientras se procesa
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Registrando...';

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Registrar asistencia sin área
        const response = await fetch(`${apiURL}/api/asistencia/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                codigo,
                movimiento,
                turno: parseInt(turno)
            })
        });
        
        const data = await response.json();

        if (data.success) {
            mostrarMensaje(`✅ ${data.message} - ${data.data.empleado}`, 'success');
            
            // Limpiar formulario después de 2 segundos
            setTimeout(() => {
                limpiarFormulario();
            }, 2000);
        } else {
            mostrarMensaje(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('❌ Error de conexión. Verifica que el servidor esté corriendo.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Aceptar';
    }
});

// Limpiar formulario después de registro exitoso
function limpiarFormulario() {
    document.getElementById('registroForm').reset();
    movimientoSeleccionado = null;
    turnoSeleccionado = null;
    document.querySelectorAll('.movimiento-btn, .turno-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('mensaje').style.display = 'none';
    
    // Detener scanner si está activo
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
        document.getElementById('qr-reader').style.display = 'none';
    }
    
    // Re-enfocar el campo de código
    setTimeout(() => {
        const input = document.getElementById('codigo');
        if (input) {
            input.focus();
        }
    }, 100);
}

// Mostrar mensaje
function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    mensajeDiv.innerHTML = texto;
    mensajeDiv.className = `mensaje mensaje-${tipo}`;
    mensajeDiv.style.display = 'block';
    
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, 5000);
}

// Volver
function volver() {
    window.location.href = '../index.html';
}

