async function verificarSesionAdmin() {
    const token = localStorage.getItem('adminToken');
    const tipoUsuario = localStorage.getItem('tipoUsuario');
    if (!token || tipoUsuario !== 'admin') {
        window.location.href = '../index.html';
        return false;
    }

    try {
        const apiURL = window.API_CONFIG ? window.API_CONFIG.getBaseURL() : 'http://localhost:3000';
        const response = await fetch(`${apiURL}/api/auth/admin/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Sesión inválida');
        }
        return true;
    } catch (error) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('tipoUsuario');
        localStorage.removeItem('usuario');
        window.location.href = '../index.html';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    verificarSesionAdmin();
});
