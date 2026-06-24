document.addEventListener('alpine:init', () => {
    Alpine.data('formTerreno', () => ({
        form: { compradorId: '', descripcion: '', costoTotal: '', abonoMinimo: '', diaPago: '' },
        esEditar: false,
        terrenoId: null,
        compradores: [],
        compradorNombre: '',
        cargando: false,
        error: '',

        async init() {
            this.esEditar = window.location.pathname.includes('/editar');
            const params = new URLSearchParams(window.location.search);
            this.terrenoId = params.get('id');

            if (this.esEditar) {
                if (!this.terrenoId) { window.location.href = '/terrenos'; return; }
                await this.cargar();
            } else {
                await this.cargarCompradores();
            }
        },

        async cargarCompradores() {
            try {
                const res = await fetch('/.netlify/functions/compradores-opciones');
                if (res.status === 401) { window.location.href = '/login'; return; }
                if (res.ok) {
                    const datos = await res.json();
                    this.compradores = datos.opciones;
                }
            } catch {
                this.error = 'Error al cargar los compradores.';
            }
        },

        async cargar() {
            this.cargando = true;
            try {
                const res = await fetch(`/.netlify/functions/terrenos-obtener?id=${this.terrenoId}`);
                if (res.status === 401) { window.location.href = '/login'; return; }
                if (!res.ok) { this.error = 'No se encontró el terreno.'; return; }

                const t = (await res.json()).terreno;
                this.form.compradorId = t.comprador_id;
                this.form.descripcion = t.descripcion || '';
                this.form.costoTotal = t.costo_total;
                this.form.abonoMinimo = t.abono_minimo;
                this.form.diaPago = t.dia_pago || '';
                this.compradorNombre = t.comprador_nombre || '';
            } catch {
                this.error = 'Error al cargar el terreno.';
            } finally {
                this.cargando = false;
            }
        },

        async guardar() {
            this.error = '';
            if (!this.esEditar && !this.form.compradorId) { this.error = 'Selecciona un comprador.'; return; }
            if (!this.form.descripcion.trim()) { this.error = 'La descripción es requerida.'; return; }
            if (this.form.costoTotal === '' || this.form.abonoMinimo === '') {
                this.error = 'El costo total y el abono mínimo son requeridos.';
                return;
            }
            const dia = parseInt(this.form.diaPago);
            if (!dia || dia < 1 || dia > 31) {
                this.error = 'El día de pago es obligatorio (1-31).';
                return;
            }

            this.cargando = true;
            try {
                let url, body;
                if (this.esEditar) {
                    url = '/.netlify/functions/terrenos-editar';
                    body = {
                        terrenoId: this.terrenoId,
                        descripcion: this.form.descripcion,
                        costoTotal: this.form.costoTotal,
                        abonoMinimo: this.form.abonoMinimo,
                        diaPago: this.form.diaPago
                    };
                } else {
                    url = '/.netlify/functions/terrenos-guardar';
                    body = {
                        compradorId: this.form.compradorId,
                        descripcion: this.form.descripcion,
                        costoTotal: this.form.costoTotal,
                        abonoMinimo: this.form.abonoMinimo,
                        diaPago: this.form.diaPago
                    };
                }

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (res.status === 401) { window.location.href = '/login'; return; }

                const datos = await res.json();
                if (!res.ok) { this.error = datos.mensaje || 'Error al guardar.'; return; }

                sessionStorage.setItem('flash', this.esEditar
                    ? 'Terreno actualizado correctamente.'
                    : 'Terreno creado correctamente.');
                window.location.href = '/terrenos';
            } catch {
                this.error = 'Error de conexión. Intenta de nuevo.';
            } finally {
                this.cargando = false;
            }
        }
    }));
});
