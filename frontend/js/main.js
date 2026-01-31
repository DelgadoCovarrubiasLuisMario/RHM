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
        adminForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const usuario = document.getElementById('adminUsuario').value;
            const password = document.getElementById('adminPassword').value;

            // Por ahora, login simple (después agregaremos autenticación real)
            // TODO: Implementar autenticación con backend
            if (usuario && password) {
                localStorage.setItem('tipoUsuario', 'admin');
                localStorage.setItem('usuario', usuario);
                // Ya no necesitamos seleccionar área, todas las páginas muestran ambas áreas
                window.location.href = 'admin/menu.html';
            } else {
                alert('Por favor completa todos los campos');
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


