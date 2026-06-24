document.addEventListener('alpine:init', () => {
    Alpine.data('configuracion', () => ({
        form: {
            'vendedor.nombre': '',
            'vendedor.telefono': '',
            'vendedor.direccion': ''
        },
        cargando: true,
        guardando: false,
        error: '',
        exito: '',

        async init() {
            try {
                const res = await fetch('/.netlify/functions/config-obtener');
                if (res.status === 401) { window.location.href = '/login'; return; }
                if (!res.ok) throw new Error();

                const { config } = await res.json();
                this.form['vendedor.nombre']    = config['vendedor.nombre']    || '';
                this.form['vendedor.telefono']  = config['vendedor.telefono']  || '';
                this.form['vendedor.direccion'] = config['vendedor.direccion'] || '';

            } catch {
                this.error = 'Error al cargar la configuración.';
            } finally {
                this.cargando = false;
            }
        },

        async guardar() {
            this.error = '';
            this.exito = '';
            this.guardando = true;

            try {
                const res = await fetch('/.netlify/functions/config-guardar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ config: this.form })
                });

                if (res.status === 401) { window.location.href = '/login'; return; }
                if (!res.ok) throw new Error();

                this.exito = 'Configuración guardada correctamente.';
                setTimeout(() => { this.exito = ''; }, 3000);

            } catch {
                this.error = 'Error al guardar. Intenta de nuevo.';
            } finally {
                this.guardando = false;
            }
        }
    }));
});
