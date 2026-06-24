document.addEventListener('alpine:init', () => {
    Alpine.data('editarRecibo', () => ({
        r: {},
        vendedor: {},
        form: {
            recibiDe: '',
            tipoConcepto: 'abono',
            cantidad: '',
            concepto: '',
            fechaPago: ''
        },
        sidebarAbierto: true,
        cargando: true,
        error: '',
        exito: '',
        esDuplicar: false,
        reciboId: null,
        _flatpickr: null,

        async init() {
            const params = new URLSearchParams(window.location.search);
            this.reciboId = params.get('id');
            this.esDuplicar = params.get('duplicar') === '1';

            if (!this.reciboId) {
                window.location.href = '/';
                return;
            }

            await this.cargar();
            this.$nextTick(() => this.inicializarFlatpickr());
        },

        async cargar() {
            this.cargando = true;
            try {
                const res = await fetch(`/.netlify/functions/recibos-obtener?id=${this.reciboId}`);

                if (res.status === 401) { window.location.href = '/login'; return; }
                if (!res.ok) { this.error = 'No se encontró el recibo.'; return; }

                const datos = await res.json();
                this.r = datos.recibo;
                this.vendedor = datos.vendedor;

                this.form.recibiDe = this.r.recibi_de || this.r.comprador_nombre;
                this.form.tipoConcepto = 'abono'; // siempre abono
                this.form.cantidad = this.r.cantidad_pago;
                this.form.concepto = this.r.concepto || this.conceptoAuto();
                this.form.fechaPago = this.r.fecha_pago?.split('T')[0] || '';

            } catch {
                this.error = 'Error al cargar el recibo.';
            } finally {
                this.cargando = false;
            }
        },

        // Concepto por defecto: "Abono " + descripción del terreno (o "Abono")
        conceptoAuto() {
            const desc = (this.r.terreno_descripcion || '').trim();
            return desc ? `Abono ${desc}` : 'Abono';
        },

        inicializarFlatpickr() {
            if (!this.$refs.fechaEditar) return;
            if (this._flatpickr) this._flatpickr.destroy();
            this._flatpickr = flatpickr(this.$refs.fechaEditar, {
                locale: 'es',
                dateFormat: 'd/m/Y',
                defaultDate: this.form.fechaPago || 'today',
                onChange: ([fecha]) => {
                    this.form.fechaPago = fecha ? fecha.toISOString().split('T')[0] : '';
                }
            });
        },

        async guardar() {
            this.error = '';
            this.exito = '';

            if (!this.form.recibiDe || !this.form.recibiDe.trim()) { this.error = 'El campo "Recibí de" es obligatorio.'; return; }
            if (!this.form.concepto || !this.form.concepto.trim()) { this.error = 'El concepto es obligatorio.'; return; }

            this.cargando = true;

            try {
                let url, body;

                if (this.esDuplicar) {
                    url = '/.netlify/functions/recibos-duplicar';
                    body = { ...this.form, terrenoId: this.r.terreno_id };
                } else {
                    url = '/.netlify/functions/recibos-editar';
                    body = { ...this.form, reciboId: this.reciboId };
                }

                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (res.status === 401) { window.location.href = '/login'; return; }

                const datos = await res.json();
                if (!res.ok) { this.error = datos.mensaje || 'Error al guardar.'; return; }

                if (this.esDuplicar && datos.reciboId) {
                    window.location.href = `/recibo/editar?id=${datos.reciboId}`;
                } else {
                    // Redirige a la lista con un mensaje flash
                    sessionStorage.setItem('flash', 'Recibo actualizado correctamente.');
                    window.location.href = '/';
                }

            } catch {
                this.error = 'Error de conexión. Intenta de nuevo.';
            } finally {
                this.cargando = false;
            }
        },

        imprimir() {
            window.print();
        },

        guardarPDF() {
            const elemento = document.getElementById('machote');
            const nombre = (this.r.comprador_nombre || 'recibo')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-');

            html2pdf().set({
                margin: 0,
                filename: `${nombre}-folio-${this.folioFormateado}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'cm', format: 'letter', orientation: 'landscape' }
            }).from(elemento).save();
        },

        get folioFormateado() {
            return String(this.r.folio || 0).padStart(4, '0');
        },

        get fechaFormateada() {
            const f = this.form.fechaPago;
            if (!f) return '—';
            const [año, mes, dia] = f.split('-');
            const meses = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                           'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
            return `${dia} DE ${meses[parseInt(mes) - 1]} ${año}`;
        },

        get cantidadEnLetras() {
            const num = parseFloat(this.form.cantidad || 0);
            const entero = Math.floor(num);
            const centavos = Math.round((num - entero) * 100);
            return `${numeroALetras(entero)} PESOS ${String(centavos).padStart(2,'0')}/100 (M.N.)`;
        },

        formatearMonto(valor) {
            return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor || 0);
        }
    }));
});

// ── Número a letras ──
function numeroALetras(n) {
    const unidades = ['','UN','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE',
                      'DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS',
                      'DIECISIETE','DIECIOCHO','DIECINUEVE'];
    const decenas  = ['','DIEZ','VEINTE','TREINTA','CUARENTA','CINCUENTA',
                      'SESENTA','SETENTA','OCHENTA','NOVENTA'];
    const centenas = ['','CIENTO','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS',
                      'SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];

    if (n === 0) return 'CERO';
    if (n === 100) return 'CIEN';
    if (n === 1000) return 'MIL';

    let resultado = '';

    if (n >= 1000000) {
        const millones = Math.floor(n / 1000000);
        resultado += (millones === 1 ? 'UN MILLÓN' : numeroALetras(millones) + ' MILLONES') + ' ';
        n %= 1000000;
    }
    if (n >= 1000) {
        const miles = Math.floor(n / 1000);
        resultado += (miles === 1 ? 'MIL' : numeroALetras(miles) + ' MIL') + ' ';
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
