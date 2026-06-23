document.addEventListener('alpine:init', () => {
    Alpine.data('nuevoRecibo', () => ({
        form: {
            nombreComprador: '',
            telefonoComprador: '',
            direccionComprador: '',
            compradorId: null,
            descripcionTerreno: '',
            costoTotal: '',
            abonoMinimo: '',
            frecuenciaPago: 'mensual',
            diaPago: '',
            terrenoId: null,
            tipoConcepto: 'abono',
            cantidad: '',
            concepto: '',
            fechaPago: ''
        },
        compradorNuevo: false,
        terrenoNuevo: false,
        sugerenciasComprador: [],
        sugerenciasTerreno: [],
        cargando: false,
        error: '',
        exito: '',
        _timer: null,
        _conceptoAuto: 'ABONO',

        init() {
            flatpickr(this.$refs.fechaPago, {
                locale: 'es',
                dateFormat: 'd/m/Y',
                defaultDate: 'today',
                onChange: ([fecha]) => {
                    this.form.fechaPago = fecha ? fecha.toISOString().split('T')[0] : '';
                }
            });
            // Fecha de hoy por defecto
            this.form.fechaPago = new Date().toISOString().split('T')[0];

            // Concepto por defecto + auto-relleno reactivo desde la descripción del terreno
            this.form.concepto = 'ABONO';
            this.$watch('form.descripcionTerreno', (desc) => {
                const auto = (desc && desc.trim() ? `Abono ${desc}` : 'Abono').toUpperCase();
                // Solo sobrescribe si el usuario no editó el concepto manualmente
                if (!this.form.concepto || this.form.concepto === this._conceptoAuto) {
                    this.form.concepto = auto;
                }
                this._conceptoAuto = auto;
            });
        },

        async buscarComprador() {
            this.form.compradorId = null;
            this.compradorNuevo = false;
            this.form.terrenoId = null;
            this.sugerenciasTerreno = [];

            const nombre = this.form.nombreComprador.trim();
            if (nombre.length < 2) {
                this.sugerenciasComprador = [];
                return;
            }

            clearTimeout(this._timer);
            this._timer = setTimeout(async () => {
                const res = await fetch(`/.netlify/functions/compradores-buscar?nombre=${encodeURIComponent(nombre)}`);
                if (res.ok) {
                    const datos = await res.json();
                    this.sugerenciasComprador = datos.compradores;
                    this.compradorNuevo = datos.compradores.length === 0;
                }
            }, 300);
        },

        seleccionarComprador(s) {
            this.form.compradorId = s.id;
            this.form.nombreComprador = s.nombre;
            this.sugerenciasComprador = [];
            this.compradorNuevo = false;
        },

        async buscarTerreno() {
            this.form.terrenoId = null;
            this.terrenoNuevo = false;

            const desc = this.form.descripcionTerreno.trim();
            if (desc.length < 2) {
                this.sugerenciasTerreno = [];
                return;
            }

            const compradorId = this.form.compradorId;
            const nombre = this.form.nombreComprador.trim();

            clearTimeout(this._timer);
            this._timer = setTimeout(async () => {
                const params = new URLSearchParams({ descripcion: desc });
                if (compradorId) params.append('compradorId', compradorId);
                else if (nombre) params.append('nombreComprador', nombre);

                const res = await fetch(`/.netlify/functions/terrenos-buscar?${params}`);
                if (res.ok) {
                    const datos = await res.json();
                    this.sugerenciasTerreno = datos.terrenos;
                    this.terrenoNuevo = datos.terrenos.length === 0;
                }
            }, 300);
        },

        seleccionarTerreno(s) {
            this.form.terrenoId = s.id;
            this.form.descripcionTerreno = s.descripcion;
            this.sugerenciasTerreno = [];
            this.terrenoNuevo = false;
        },

        cerrarSugerencias(tipo) {
            setTimeout(() => {
                if (tipo === 'comprador') this.sugerenciasComprador = [];
                if (tipo === 'terreno') this.sugerenciasTerreno = [];
            }, 200);
        },

        async guardar() {
            this.error = '';
            this.exito = '';

            if (!this.form.fechaPago) {
                this.error = 'La fecha del pago es requerida.';
                return;
            }

            this.cargando = true;
            try {
                const res = await fetch('/.netlify/functions/recibos-guardar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.form)
                });

                if (res.status === 401) { window.location.href = '/login'; return; }

                const datos = await res.json();

                if (!res.ok) {
                    this.error = datos.mensaje || 'Error al guardar el recibo.';
                    return;
                }

                window.location.href = `/recibo/editar?id=${datos.reciboId}`;

            } catch {
                this.error = 'Error de conexión. Intenta de nuevo.';
            } finally {
                this.cargando = false;
            }
        }
    }));
});
