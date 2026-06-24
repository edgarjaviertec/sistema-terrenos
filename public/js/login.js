document.addEventListener('alpine:init', () => {
    Alpine.data('loginFormulario', () => ({
        usuario: '',
        contrasena: '',
        cargando: false,
        error: '',

        async entrar() {
            this.error = '';
            this.cargando = true;

            try {
                const respuesta = await fetch('/.netlify/functions/auth-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        usuario: this.usuario,
                        contrasena: this.contrasena
                    })
                });

                const datos = await respuesta.json();

                if (!respuesta.ok) {
                    this.error = datos.mensaje || 'Usuario o contraseña incorrectos';
                    return;
                }

                window.location.href = '/';

            } catch (e) {
                this.error = 'Error de conexión. Intenta de nuevo.';
            } finally {
                this.cargando = false;
            }
        }
    }));
});
