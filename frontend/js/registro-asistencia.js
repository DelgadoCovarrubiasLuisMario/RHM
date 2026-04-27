// Variables globales
let movimientoSeleccionado = null;
let turnoSeleccionado = null;
let todosLosEmpleados = [];
let stream = null;
let videoElement = null;

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    // Cargar empleados para la búsqueda
    cargarEmpleados();

    // Actualizar fecha y hora cada segundo
    actualizarFechaHora();
    setInterval(actualizarFechaHora, 1000);

    // Configurar búsqueda de empleados
    configurarBusquedaEmpleados();

    // Enfocar el campo de código para facilitar escritura manual
    const codigoInput = document.getElementById('codigo');
    if (codigoInput) {
        // Pequeño delay para asegurar que el DOM esté listo
        setTimeout(() => {
            codigoInput.focus();
        }, 100);
    }

    // Cerrar lista al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#codigo') && !e.target.closest('#listaEmpleados')) {
            const listaEmpleados = document.getElementById('listaEmpleados');
            if (listaEmpleados) {
                listaEmpleados.style.display = 'none';
            }
        }
    });
});

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

// Configurar búsqueda de empleados
function configurarBusquedaEmpleados() {
    const codigoInput = document.getElementById('codigo');
    if (!codigoInput) return;
    
    codigoInput.addEventListener('input', filtrarEmpleados);
    codigoInput.addEventListener('focus', function() {
        if (this.value) {
            filtrarEmpleados();
        }
    });
}

// Filtrar empleados mientras se escribe
function filtrarEmpleados() {
    const input = document.getElementById('codigo');
    if (!input) return;
    
    const busqueda = input.value.toLowerCase().trim();
    const listaEmpleados = document.getElementById('listaEmpleados');
    if (!listaEmpleados) return;
    
    if (!busqueda || busqueda.length < 1) {
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
            <div class="empleado-codigo-lista">${emp.codigo}</div>
        </div>
    `).join('');
    
    listaEmpleados.style.display = 'block';
}

// Seleccionar empleado de la lista
function seleccionarEmpleado(codigo, nombre) {
    document.getElementById('codigo').value = codigo;
    document.getElementById('listaEmpleados').style.display = 'none';
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

// Seleccionar movimiento (ENTRADA/SALIDA)
function seleccionarMovimiento(movimiento) {
    movimientoSeleccionado = movimiento;
    document.getElementById('movimiento').value = movimiento;
    
    // Actualizar botones visualmente
    document.querySelectorAll('.movimiento-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-movimiento') === movimiento) {
            btn.classList.add('active');
        }
    });
}

// Seleccionar turno (1, 2, 3)
function seleccionarTurno(turno) {
    turnoSeleccionado = turno;
    document.getElementById('turno').value = turno;
    
    // Actualizar botones visualmente
    document.querySelectorAll('.turno-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.getAttribute('data-turno')) === turno) {
            btn.classList.add('active');
        }
    });
}

function esContextoSeguroParaCamara() {
    const host = window.location.hostname;
    const esLocalhost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    return window.isSecureContext || esLocalhost;
}

async function solicitarStreamCamara() {
    const intentos = [
        { video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false }
    ];

    let ultimoError = null;
    for (const constraints of intentos) {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
            ultimoError = error;
            console.warn('⚠️ Intento de cámara fallido con constraints:', constraints, error);
        }
    }

    throw ultimoError || new Error('No fue posible obtener stream de cámara');
}

function esMovimientoConFoto(movimiento) {
    return movimiento === 'ENTRADA' || movimiento === 'INGRESO';
}

/**
 * Debe invocarse en el manejador de «submit» sin await antes, para que getUserMedia
 * siga ligado al gesto del usuario (exigido por Chrome móvil / tablet).
 */
function iniciarPromesaStreamEntrada() {
    const movimiento = document.getElementById('movimiento').value;
    if (!esMovimientoConFoto(movimiento)) {
        return Promise.resolve(null);
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('⚠️ getUserMedia no está disponible');
        return Promise.resolve(null);
    }
    if (!esContextoSeguroParaCamara()) {
        mostrarMensaje('⚠️ La cámara requiere HTTPS. Abre la app con https:// para capturar foto.', 'error');
        return Promise.resolve(null);
    }
    return solicitarStreamCamara().catch((err) => {
        console.warn('⚠️ Error al abrir cámara:', err);
        return null;
    });
}

function detenerStreamSiExiste(s) {
    if (s && s.getTracks) {
        s.getTracks().forEach((t) => t.stop());
    }
}

function configurarElementoVideoCaptura() {
    videoElement = document.createElement('video');
    // 1px visible en viewport: algunos móviles no decodifican cámara con el vídeo totalmente “fuera”
    videoElement.setAttribute('playsinline', 'true');
    videoElement.setAttribute('webkit-playsinline', 'true');
    videoElement.playsInline = true;
    videoElement.muted = true;
    videoElement.autoplay = true;
    videoElement.style.cssText = [
        'position:fixed',
        'left:0',
        'top:0',
        'width:1px',
        'height:1px',
        'opacity:0.01',
        'pointer-events:none',
        'z-index:0',
        'object-fit:cover',
    ].join(';');
    document.body.appendChild(videoElement);
    return videoElement;
}

function esperarVideoConDimensiones(video) {
    const maxEspera = 15000;
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        const to = setTimeout(
            () => reject(new Error('Timeout cargando video (comprueba permisos de cámara).')),
            maxEspera
        );
        const done = (fn) => {
            clearTimeout(to);
            fn();
        };
        const probar = () => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
                return done(() => resolve());
            }
            if (Date.now() - t0 > maxEspera) {
                return;
            }
            requestAnimationFrame(probar);
        };
        video.onloadedmetadata = probar;
        video.onerror = (err) => {
            done(() => reject(err || new Error('Error en video')));
        };
        probar();
    });
}

// Capturar a partir de un stream ya obtenido durante el gesto (no volver a llamar getUserMedia)
async function capturarFotoConStreamPendiente(promesaStream) {
    if (!promesaStream) {
        return null;
    }
    const movimiento = document.getElementById('movimiento').value;
    if (!esMovimientoConFoto(movimiento)) {
        const s = await promesaStream.catch(() => null);
        detenerStreamSiExiste(s);
        return null;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return null;
    }

    try {
        const mediaStream = await promesaStream;
        if (!mediaStream) {
            mostrarMensaje('⚠️ No se pudo tomar foto (permiso de cámara o dispositivo). El registro se guardará sin foto.', 'error');
            return null;
        }
        stream = mediaStream;
        const video = configurarElementoVideoCaptura();
        video.srcObject = stream;
        await esperarVideoConDimensiones(video);
        const playP = video.play();
        if (playP !== undefined) {
            await playP.catch((e) => {
                console.warn('video.play:', e);
            });
        }
        await new Promise(requestAnimationFrame);
        const canvas = document.createElement('canvas');
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);
        const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
        detenerCamara();
        if (fotoBase64 && fotoBase64.length > 100) {
            console.log('✅ Foto capturada correctamente, tamaño:', fotoBase64.length);
        }
        return fotoBase64;
    } catch (error) {
        console.error('❌ Error al capturar foto:', error);
        detenerCamara();
        mostrarMensaje('⚠️ No se pudo tomar foto en este dispositivo. El registro se guardará sin foto.', 'error');
        return null;
    }
}

// Detener cámara
function detenerCamara() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    if (videoElement) {
        videoElement.srcObject = null;
        if (videoElement.parentNode) {
            videoElement.parentNode.removeChild(videoElement);
        }
        videoElement = null;
    }
}

// Manejar envío del formulario
document.getElementById('registroForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const codigo = document.getElementById('codigo').value;
    const movimiento = document.getElementById('movimiento').value;
    const turno = document.getElementById('turno').value;
    // Área ya no se usa

    // Validar campos
    if (!codigo || !movimiento || !turno) {
        mostrarMensaje('Por favor completa todos los campos requeridos', 'error');
        return;
    }

    // IMPORTANT: iniciar cámara aquí, antes de cualquier await (fetch, confirm, etc.),
    // o Chrome móvil/tablet pierde el "user gesture" y bloquea getUserMedia.
    const promesaStreamCamara = iniciarPromesaStreamEntrada();

    // Verificar fechas de cursos/inducciones antes de registrar
    const puedeContinuar = await verificarFechasCursos(codigo);
    if (!puedeContinuar) {
        promesaStreamCamara
            .then((s) => detenerStreamSiExiste(s))
            .catch(() => {});
        return; // El usuario canceló o hay un error
    }

    // Deshabilitar botón mientras se procesa
    const submitBtn = this.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    let fotoBase64 = null;
    try {
        fotoBase64 = await capturarFotoConStreamPendiente(promesaStreamCamara);
    } catch (error) {
        console.error('Error al capturar foto:', error);
    }

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/asistencia/registrar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                codigo,
                movimiento,
                turno: parseInt(turno),
                foto: fotoBase64,
                fecha: document.getElementById('fecha').value,
                hora: document.getElementById('hora').value
            })
        });

        const data = await response.json();

        if (data.success) {
            let mensaje = '';
            
            // Si hay tiempo trabajado (es una salida), mostrarlo destacado
            if (data.data.tiempoTrabajado) {
                mensaje = `<div style="margin-bottom: 10px;">
                    ✅ ${data.data.movimiento} registrada - ${data.data.empleado}
                </div>
                <div style="margin-top: 10px; padding: 12px; background: #d1fae5; border-radius: 8px; font-weight: 600; color: #065f46; border: 2px solid #10b981;">
                    ⏱️ Tiempo trabajado: <strong style="font-size: 1.1em;">${data.data.tiempoTrabajado}</strong>
                </div>`;
            } else {
                mensaje = `✅ ${data.message} - ${data.data.empleado}`;
            }
            
            mostrarMensaje(mensaje, 'success');
            // Limpiar formulario
            document.getElementById('registroForm').reset();
            movimientoSeleccionado = null;
            turnoSeleccionado = null;
            document.querySelectorAll('.movimiento-btn, .turno-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Limpiar código después de 5 segundos (más tiempo si hay tiempo trabajado)
            setTimeout(() => {
                document.getElementById('codigo').value = '';
            }, data.data.tiempoTrabajado ? 5000 : 3000);
        } else {
            mostrarMensaje(`❌ ${data.message}`, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('❌ Error de conexión. Verifica que el servidor esté corriendo.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar';
    }
});

// Verificar fechas de cursos/inducciones antes de registrar asistencia
async function verificarFechasCursos(codigo) {
    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        
        // Obtener información completa del empleado con fechas de cursos
        const response = await fetch(`${apiURL}/api/empleados/listar-con-cargos`);
        const data = await response.json();
        
        if (data.success) {
            const empleado = data.data.find(emp => emp.codigo === codigo);
            if (empleado) {
                return verificarFechasEmpleado(empleado);
            }
        }
        
        return true; // Si no se encuentra, continuar (el servidor validará)
    } catch (error) {
        console.error('Error al verificar fechas:', error);
        return true; // Continuar si hay error
    }
}

// Verificar fechas de un empleado específico
function verificarFechasEmpleado(empleado) {
    const alertas = [];
    
    // Función para calcular días restantes
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
    
    // Verificar vence_induccion
    if (empleado.vence_induccion) {
        const diasRestantes = calcularDiasRestantes(empleado.vence_induccion);
        if (diasRestantes !== null && diasRestantes <= 5) {
            alertas.push({
                tipo: 'Inducción',
                fecha: empleado.vence_induccion,
                dias: diasRestantes
            });
        }
    }
    
    // Verificar mandar_a_curso
    if (empleado.mandar_a_curso) {
        const diasRestantes = calcularDiasRestantes(empleado.mandar_a_curso);
        if (diasRestantes !== null && diasRestantes <= 5) {
            alertas.push({
                tipo: 'Curso',
                fecha: empleado.mandar_a_curso,
                dias: diasRestantes
            });
        }
    }
    
    // Verificar vigencia_de (vigencia de estudios)
    if (empleado.vigencia_de) {
        const diasRestantes = calcularDiasRestantes(empleado.vigencia_de);
        if (diasRestantes !== null && diasRestantes <= 5) {
            alertas.push({
                tipo: 'Vigencia de Estudios',
                fecha: empleado.vigencia_de,
                dias: diasRestantes
            });
        }
    }
    
    // Si hay alertas, mostrarlas
    if (alertas.length > 0) {
        let mensajeAlerta = '⚠️ ALERTA: Tienes fechas próximas a vencer:\n\n';
        alertas.forEach(alerta => {
            const estado = alerta.dias <= 0 ? 'VENCIDO' : `Faltan ${alerta.dias} día(s)`;
            mensajeAlerta += `• ${alerta.tipo}: ${alerta.fecha} (${estado})\n`;
        });
        mensajeAlerta += '\nPor favor, contacta con el administrador para renovar.';
        
        return confirm(mensajeAlerta + '\n\n¿Deseas continuar con el registro de asistencia?');
    }
    
    return true; // No hay alertas, continuar
}

// Mostrar mensaje (acepta HTML)
function mostrarMensaje(texto, tipo) {
    const mensajeDiv = document.getElementById('mensaje');
    if (!mensajeDiv) {
        console.error('❌ No se encontró el elemento mensaje');
        return;
    }
    
    mensajeDiv.innerHTML = texto; // Usar innerHTML para permitir HTML
    mensajeDiv.className = `mensaje mensaje-${tipo}`;
    mensajeDiv.style.display = 'block';
    mensajeDiv.style.visibility = 'visible';
    mensajeDiv.style.opacity = '1';

    // Mostrar más tiempo si hay tiempo trabajado (ticket de salida)
    const tieneTiempoTrabajado = texto.includes('Tiempo trabajado') || texto.includes('tiempoTrabajado');
    const tiempoMostrar = tieneTiempoTrabajado ? 10000 : 5000; // 10 segundos para tiempo trabajado
    
    setTimeout(() => {
        mensajeDiv.style.display = 'none';
    }, tiempoMostrar);
}

// Cancelar y volver
function cancelar() {
    if (confirm('¿Deseas cancelar el registro?')) {
        volver();
    }
}

function volver() {
    window.location.href = '../index.html';
}

