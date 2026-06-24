document.addEventListener('alpine:init', () => {
    Alpine.data('nuevoRecibo', () => ({
        vendedor: { nombre: '', telefono: '', direccion: '' },
        compradores: [],
        terrenos: [],
        compradorSel: '',   // '' | id | 'nuevo'
        terrenoSel: '',     // '' | id | 'nuevo'
        comprador: { nombre: '', telefono: '', direccion: '' },
        terreno: { descripcion: '', costo_total: '', abono_minimo: '', dia_pago: '' },
        form: { recibiDe: '', cantidad: '', concepto: 'ABONO', fechaPago: '' },
        folioPreview: 1,
        sidebarAbierto: true,
        cargando: false,
        error: '',
        _flatpickr: null,
        _tsComprador: null,
        _tsTerreno: null,
        _conceptoAuto: 'ABONO',

        async init() {
            this.form.fechaPago = new Date().toISOString().split('T')[0];
            await this.cargarVendedor();
            await this.cargarCompradores();
            this.$nextTick(() => {
                this.inicializarFlatpickr();
                this.inicializarSelects();
            });
            this.$watch('terreno.descripcion', () => this.actualizarConcepto());
        },

        async cargarVendedor() {
            try {
                const res = await fetch('/.netlify/functions/config-obtener');
                if (res.status === 401) { window.location.href = '/login'; return; }
                if (res.ok) {
                    const { config } = await res.json();
                    this.vendedor = {
                        nombre: config['vendedor.nombre'] || '',
                        telefono: config['vendedor.telefono'] || '',
                        direccion: config['vendedor.direccion'] || ''
                    };
                }
            } catch {}
        },

        async cargarCompradores() {
            try {
                const res = await fetch('/.netlify/functions/compradores-opciones');
                if (res.ok) this.compradores = (await res.json()).opciones;
            } catch {}
        },

        inicializarSelects() {
            const self = this;

            this._tsComprador = new TomSelect(this.$refs.selComprador, {
                options: [
                    ...this.compradores.map(c => ({ value: String(c.id), text: c.nombre })),
                    { value: 'nuevo', text: '+ Nuevo comprador' }
                ],
                placeholder: 'Selecciona un comprador...',
                allowEmptyOption: true,
                onChange(valor) { self.manejarCambioComprador(valor); }
            });

            this._tsTerreno = new TomSelect(this.$refs.selTerreno, {
                options: [{ value: 'nuevo', text: '+ Nuevo terreno' }],
                placeholder: 'Selecciona un terreno...',
                allowEmptyOption: true,
                onChange(valor) { self.manejarCambioTerreno(valor); }
            });
            this._tsTerreno.disable();
        },

        async manejarCambioComprador(valor) {
            this.compradorSel = valor;
            this.terrenos = [];
            this.terreno = { descripcion: '', costo_total: '', abono_minimo: '', dia_pago: '' };
            this.folioPreview = 1;

            // Reiniciar el select de terreno
            this._tsTerreno.clear(true);
            this._tsTerreno.clearOptions();

            if (valor === 'nuevo') {
                this.comprador = { nombre: '', telefono: '', direccion: '' };
                this.form.recibiDe = '';
                this.terrenoSel = 'nuevo';
                this._tsTerreno.addOption({ value: 'nuevo', text: '+ Nuevo terreno' });
                this._tsTerreno.setValue('nuevo', true);
                this._tsTerreno.disable();
            } else if (valor) {
                const c = this.compradores.find(x => x.id == valor);
                this.comprador = { nombre: c.nombre, telefono: c.telefono || '', direccion: c.direccion || '' };
                this.form.recibiDe = c.nombre;
                await this.cargarTerrenos(valor);
                this._tsTerreno.addOptions([
                    ...this.terrenos.map(t => ({ value: String(t.id), text: t.descripcion })),
                    { value: 'nuevo', text: '+ Nuevo terreno' }
                ]);
                this._tsTerreno.enable();
                this.terrenoSel = '';
            } else {
                this.comprador = { nombre: '', telefono: '', direccion: '' };
                this.form.recibiDe = '';
                this.terrenoSel = '';
                this._tsTerreno.disable();
            }
        },

        async manejarCambioTerreno(valor) {
            this.terrenoSel = valor;
            if (valor === 'nuevo') {
                this.terreno = { descripcion: '', costo_total: '', abono_minimo: '', dia_pago: '' };
                this.folioPreview = 1;
            } else if (valor) {
                const t = this.terrenos.find(x => x.id == valor);
                this.terreno = {
                    descripcion: t.descripcion,
                    costo_total: t.costo_total,
                    abono_minimo: t.abono_minimo,
                    dia_pago: t.dia_pago || ''
                };
                await this.cargarFolio(valor);
            }
        },

        async cargarTerrenos(compradorId) {
            try {
                const res = await fetch(`/.netlify/functions/terrenos-buscar?compradorId=${compradorId}&descripcion=`);
                if (res.ok) this.terrenos = (await res.json()).terrenos;
            } catch {}
        },

        async cargarFolio(terrenoId) {
            try {
                const res = await fetch(`/.netlify/functions/folios-proximo?terrenoId=${terrenoId}`);
                if (res.ok) this.folioPreview = (await res.json()).proximo;
            } catch {}
        },

        actualizarConcepto() {
            const desc = (this.terreno.descripcion || '').trim();
            const auto = (desc ? `Abono ${desc}` : 'Abono').toUpperCase();
            if (!this.form.concepto || this.form.concepto === this._conceptoAuto) {
                this.form.concepto = auto;
            }
            this._conceptoAuto = auto;
        },

        inicializarFlatpickr() {
            if (!this.$refs.fechaNuevo) return;
            this._flatpickr = flatpickr(this.$refs.fechaNuevo, {
                locale: 'es',
                dateFormat: 'd/m/Y',
                defaultDate: 'today',
                onChange: ([f]) => { this.form.fechaPago = f ? f.toISOString().split('T')[0] : ''; }
            });
        },

        get listoParaPreview() {
            return this.compradorSel !== '' && this.terrenoSel !== '';
        },
        get esCompradorNuevo() { return this.compradorSel === 'nuevo'; },
        get esTerrenoNuevo() { return this.terrenoSel === 'nuevo'; },

        async guardar() {
            this.error = '';
            if (!this.compradorSel) { this.error = 'Selecciona o crea un comprador.'; return; }
            if (!this.terrenoSel) { this.error = 'Selecciona o crea un terreno.'; return; }
            if (this.esCompradorNuevo && !this.comprador.nombre.trim()) { this.error = 'El nombre del comprador es requerido.'; return; }
            if (this.esCompradorNuevo && !/^\d{10}$/.test((this.comprador.telefono || '').trim())) { this.error = 'El teléfono del comprador debe tener 10 dígitos.'; return; }
            if (this.esCompradorNuevo && !this.comprador.direccion.trim()) { this.error = 'La dirección del comprador es requerida.'; return; }
            if (this.esTerrenoNuevo && (!this.terreno.descripcion.trim() || this.terreno.costo_total === '' || this.terreno.abono_minimo === '')) {
                this.error = 'Completa descripción, costo y abono mínimo del terreno nuevo.';
                return;
            }
            if (this.form.cantidad === '' || !this.form.fechaPago) { this.error = 'La cantidad y la fecha son requeridas.'; return; }
            if (!this.form.recibiDe || !this.form.recibiDe.trim()) { this.error = 'El campo "Recibí de" es obligatorio.'; return; }
            if (!this.form.concepto || !this.form.concepto.trim()) { this.error = 'El concepto es obligatorio.'; return; }

            this.cargando = true;
            try {
                const body = {
                    ...(this.esCompradorNuevo ? {} : { compradorId: this.compradorSel }),
                    nombreComprador: this.comprador.nombre,
                    telefonoComprador: this.comprador.telefono,
                    direccionComprador: this.comprador.direccion,
                    ...(this.esTerrenoNuevo ? {} : { terrenoId: this.terrenoSel }),
                    descripcionTerreno: this.terreno.descripcion,
                    costoTotal: this.terreno.costo_total,
                    abonoMinimo: this.terreno.abono_minimo,
                    diaPago: this.terreno.dia_pago,
                    tipoConcepto: 'abono',
                    cantidad: this.form.cantidad,
                    concepto: this.form.concepto,
                    fechaPago: this.form.fechaPago,
                    recibiDe: this.form.recibiDe
                };

                const res = await fetch('/.netlify/functions/recibos-guardar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (res.status === 401) { window.location.href = '/login'; return; }
                const datos = await res.json();
                if (!res.ok) { this.error = datos.mensaje || 'Error al guardar el recibo.'; return; }

                sessionStorage.setItem('flash', 'Recibo creado con éxito.');
                window.location.href = '/';
            } catch {
                this.error = 'Error de conexión. Intenta de nuevo.';
            } finally {
                this.cargando = false;
            }
        },

        imprimir() { window.print(); },

        get folioFormateado() {
            return String(this.folioPreview || 0).padStart(4, '0');
        },

        get fechaFormateada() {
            const f = this.form.fechaPago;
            if (!f) return '—';
            const [anio, mes, dia] = f.split('-');
            const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                           'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
            return `${dia} DE ${meses[parseInt(mes) - 1]} ${anio}`;
        },

        get cantidadEnLetras() {
            const num = parseFloat(this.form.cantidad || 0);
            const entero = Math.floor(num);
            const centavos = Math.round((num - entero) * 100);
            return `${numeroALetrasRecibo(entero)} PESOS ${String(centavos).padStart(2,'0')}/100 (M.N.)`;
        },

        formatearMonto(valor) {
            return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor || 0);
        }
    }));
});

// ── Número a letras ──
function numeroALetrasRecibo(n) {
    const unidades = ['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
                      'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS',
                      'DIECISIETE','DIECIOCHO','DIECINUEVE'];
    const decenas  = ['','DIEZ','VEINTE','TREINTA','CUARENTA','CINCUENTA',
                      'SESENTA','SETENTA','OCHENTA','NOVENTA'];
    const centenas = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
                      'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];

    if (n === 0) return 'CERO';
    if (n === 100) return 'CIEN';

    let resultado = '';
    if (n >= 1000000) {
        const millones = Math.floor(n / 1000000);
        resultado += (millones === 1 ? 'UN MILLÓN' : numeroALetrasRecibo(millones) + ' MILLONES') + ' ';
        n %= 1000000;
    }
    if (n >= 1000) {
        const miles = Math.floor(n / 1000);
        resultado += (miles === 1 ? 'MIL' : numeroALetrasRecibo(miles) + ' MIL') + ' ';
        n %= 1000;
    }
    if (n >= 100) {
        resultado += centenas[Math.floor(n / 100)] + ' ';
        n %= 100;
    }
    if (n >= 20) {
        resultado += decenas[Math.floor(n / 10)];
        if (n % 10 > 0) resultado += ' Y ' + unidades[n % 10];
        resultado += ' ';
    } else if (n > 0) {
        resultado += unidades[n] + ' ';
    }
    return resultado.trim();
}
