document.addEventListener('alpine:init', () => {
    Alpine.data('formComprador', () => ({
        form: { nombre: '', telefono: '', direccion: '' },
        esEditar: false,
        compradorId: null,
        cargando: false,
        error: '',

        async init() {
            this.esEditar = window.location.pathname.includes('/editar');
            const params = new URLSearchParams(window.location.search);
            this.compradorId = params.get('id');

            if (this.esEditar) {
                if (!this.compradorId) { window.location.href = '/compradores'; return; }
                await this.cargar();
            }
        },

        async cargar() {
            this.cargando = true;
            try {
                const res = await fetch(`/.netlify/functions/compradores-obtener?id=${this.compradorId}`);
                if (res.status === 401) { window.location.href = '/login'; return; }
                if (!res.ok) { this.error = 'No se encontró el comprador.'; return; }
                const datos = await res.json();
                this.form.nombre = datos.comprador.nombre || '';
                this.form.telefono = datos.comprador.telefono || '';
                this.form.direccion = datos.comprador.direccion || '';
            } catch {
                this.error = 'Error al cargar el comprador.';
            } finally {
                this.cargando = false;
            }
        },

        async guardar() {
            this.error = '';
            if (!this.form.nombre.trim()) {
                this.error = 'El nombre es requerido.';
                return;
            }

            this.cargando = true;
            try {
                const url = this.esEditar
                    ? '/.netlify/functions/compradores-editar'
                    : '/.netlify/functions/compradores-guardar';
                const body = this.esEditar
                    ? { ...this.form, compradorId: this.compradorId }
                    : { ...this.form };

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (res.status === 401) { window.location.href = '/login'; return; }

                const datos = await res.json();
                if (!res.ok) { this.error = datos.mensaje || 'Error al guardar.'; return; }

                sessionStorage.setItem('flash', this.esEditar
                    ? 'Comprador actualizado correctamente.'
                    : 'Comprador creado correctamente.');
                window.location.href = '/compradores';
            } catch {
                this.error = 'Error de conexión. Intenta de nuevo.';
            } finally {
                this.cargando = false;
            }
        }
    }));
});
