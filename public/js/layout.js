document.addEventListener('alpine:init', () => {
    Alpine.data('appLayout', () => ({
        sidebarAbierto: false,
        menuUsuario: false,

        abrir() { this.sidebarAbierto = true; },
        cerrar() { this.sidebarAbierto = false; },

        async cerrarSesion() {
            await fetch('/.netlify/functions/auth-logout', { method: 'POST' });
            window.location.href = '/login';
        }
    }));
});
