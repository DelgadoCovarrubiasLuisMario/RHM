/**
 * Carga opcional de kiosk-token.local.js (gitignored). Si no existe, no falla la página.
 */
(function cargarTokenKioskOpcional() {
    const current = document.currentScript;
    if (!current || !current.src) {
        return;
    }
    const localSrc = current.src.replace(/kiosk-token-loader\.js(?:\?.*)?$/, 'kiosk-token.local.js');
    const script = document.createElement('script');
    script.src = localSrc;
    script.onerror = function () {
        window.__RHM_KIOSK_LOCAL_AUSENTE__ = true;
    };
    script.onload = function () {
        window.__RHM_KIOSK_LOCAL_AUSENTE__ = false;
        if (typeof window.verificarBannerTokenKiosk === 'function') {
            window.verificarBannerTokenKiosk();
        }
    };
    document.head.appendChild(script);
})();
