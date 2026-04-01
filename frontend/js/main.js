// Manejo de tabs en el login
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const loginForms = document.querySelectorAll('.login-form');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            
            // Remover clase active de todos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            loginForms.forEach(form => form.classList.remove('active'));
            
            // Agregar clase active al seleccionado
            this.classList.add('active');
            document.getElementById(`${tab}-login`).classList.add('active');
        });
    });

    // Manejo del formulario de admin
    const adminForm = document.getElementById('adminForm');
    if (adminForm) {
        adminForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const usuario = document.getElementById('adminUsuario').value;
            const password = document.getElementById('adminPassword').value;
            if (!usuario || !password) {
                alert('Por favor completa todos los campos');
                return;
            }

            try {
                const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
                const response = await fetch(`${apiURL}/api/auth/admin/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ usuario, password })
                });
                const data = await response.json();

                if (!data.success || !data.token) {
                    alert(`❌ ${data.message || 'Credenciales inválidas'}`);
                    return;
                }

                localStorage.setItem('tipoUsuario', 'admin');
                localStorage.setItem('usuario', usuario);
                localStorage.setItem('adminToken', data.token);
                window.location.href = 'admin/menu.html';
            } catch (error) {
                console.error('Error en login admin:', error);
                alert('❌ No se pudo iniciar sesión. Verifica conexión con el servidor.');
            }
        });
    }

    // Manejo del login de empleado
    const empleadoLogin = document.getElementById('empleado-login');
    if (empleadoLogin) {
        const accederPerfil = document.getElementById('accederPerfil');
        if (accederPerfil) {
            accederPerfil.addEventListener('click', function() {
                localStorage.setItem('tipoUsuario', 'empleado');
                // Ir directamente al registro de asistencia
                window.location.href = 'empleado/registro-asistencia.html';
            });
        }
    }
});


