// Sistema de tema oscuro/claro
(function() {
    // Cargar tema guardado o usar el predeterminado
    const temaGuardado = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', temaGuardado);

    // Función para cambiar el tema
    function cambiarTema(tema) {
        document.documentElement.setAttribute('data-theme', tema);
        localStorage.setItem('theme', tema);
        actualizarToggle();
    }

    // Función para alternar entre claro y oscuro
    function toggleTema() {
        const temaActual = document.documentElement.getAttribute('data-theme');
        const nuevoTema = temaActual === 'dark' ? 'light' : 'dark';
        cambiarTema(nuevoTema);
    }

    // Actualizar el estado del toggle si existe
    function actualizarToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            const temaActual = document.documentElement.getAttribute('data-theme');
            toggle.textContent = temaActual === 'dark' ? '☀️' : '🌙';
            toggle.title = temaActual === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
        }
    }

    // Crear botón de toggle si no existe
    function crearToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) {
            const nuevoToggle = document.createElement('button');
            nuevoToggle.id = 'theme-toggle';
            nuevoToggle.className = 'theme-toggle';
            nuevoToggle.onclick = toggleTema;
            nuevoToggle.setAttribute('aria-label', 'Cambiar tema');
            document.body.appendChild(nuevoToggle);
        }
        actualizarToggle();
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', crearToggle);
    } else {
        crearToggle();
    }

    // Exportar funciones globalmente
    window.cambiarTema = cambiarTema;
    window.toggleTema = toggleTema;
})();


