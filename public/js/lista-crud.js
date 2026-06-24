// Fábrica genérica de listas CRUD (paginación, búsqueda, sorting, eliminar).
// Cada entidad la configura con: endpoint, endpointEliminar, filtros,
// eliminar(item) y un alInicializar() opcional (ej. flatpickr).
function crearListaCrud(config) {
    return {
        items: [],
        cargando: true,
        error: '',
        exito: '',
        paginaActual: 1,
        totalPaginas: 1,
        total: 0,
        porPagina: 10,
        opcionesPorPagina: [10, 25, 50, 100],
        ordenarPor: '',
        orden: '',
        filtros: { ...config.filtros },
        _peticionId: 0,

        async init() {
            // Mensaje flash tras una redirección
            const flash = sessionStorage.getItem('flash');
            if (flash) {
                this.exito = flash;
                sessionStorage.removeItem('flash');
                setTimeout(() => { this.exito = ''; }, 4000);
            }

            const params = new URLSearchParams(window.location.search);
            this.paginaActual = parseInt(params.get('pagina') || '1');

            // Filtrado automático al escribir (debounce vía x-model)
            this.$watch('filtros.texto', () => this.buscar());

            // Hook de inicialización por entidad (ej. flatpickr de fechas)
            if (config.alInicializar) config.alInicializar.call(this);

            await this.cargar();
        },

        async cargar() {
            this.cargando = true;
            this.error = '';
            const idActual = ++this._peticionId;

            const params = new URLSearchParams({
                pagina: this.paginaActual,
                porPagina: this.porPagina
            });
            for (const [clave, valor] of Object.entries(this.filtros)) {
                if (valor) params.append(clave, valor);
            }
            if (this.ordenarPor) {
                params.append('ordenarPor', this.ordenarPor);
                params.append('orden', this.orden);
            }

            try {
                const res = await fetch(`${config.endpoint}?${params}`);
                if (res.status === 401) { window.location.href = '/login'; return; }
                if (!res.ok) throw new Error();

                const datos = await res.json();
                if (idActual !== this._peticionId) return;

                this.items = datos.items || [];
                this.total = datos.total;
                this.totalPaginas = datos.totalPaginas;
            } catch {
                if (idActual !== this._peticionId) return;
                this.error = 'Error al cargar la lista. Intenta de nuevo.';
            } finally {
                if (idActual === this._peticionId) this.cargando = false;
            }
        },

        async buscar() {
            this.paginaActual = 1;
            this.actualizarUrl();
            await this.cargar();
        },

        async cambiarPorPagina() {
            this.paginaActual = 1;
            this.actualizarUrl();
            await this.cargar();
        },

        async ordenar(columna) {
            if (this.ordenarPor !== columna) {
                this.ordenarPor = columna;
                this.orden = 'asc';
            } else if (this.orden === 'asc') {
                this.orden = 'desc';
            } else {
                this.ordenarPor = '';
                this.orden = '';
            }
            this.paginaActual = 1;
            this.actualizarUrl();
            await this.cargar();
        },

        iconoOrden(columna) {
            if (this.ordenarPor !== columna) return 'fa-sort';
            return this.orden === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
        },

        async irPagina(pagina) {
            if (pagina < 1 || pagina > this.totalPaginas) return;
            this.paginaActual = pagina;
            this.actualizarUrl();
            await this.cargar();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        actualizarUrl() {
            const params = new URLSearchParams({ pagina: this.paginaActual });
            window.history.replaceState({}, '', `?${params}`);
        },

        limpiarTexto() {
            this.filtros.texto = '';
        },

        confirmarEliminar(item) {
            const cfg = config.eliminar(item);
            Alpine.store('modalEliminar').abrir({
                titulo: cfg.titulo,
                mensaje: cfg.mensaje,
                dependencias: cfg.dependencias || [],
                onConfirmar: async () => {
                    const res = await fetch(config.endpointEliminar, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(cfg.body)
                    });
                    if (res.status === 401) { window.location.href = '/login'; return; }
                    if (!res.ok) {
                        const d = await res.json().catch(() => ({}));
                        throw new Error(d.mensaje || 'No se pudo eliminar.');
                    }
                    this.exito = cfg.mensajeExito || 'Eliminado correctamente.';
                    setTimeout(() => { this.exito = ''; }, 4000);
                    await this.cargar();
                }
            });
        },

        // Ventana de números de página alrededor de la actual (máx. 5)
        get paginasVisibles() {
            const ventana = 5;
            let inicio = Math.max(1, this.paginaActual - Math.floor(ventana / 2));
            let fin = Math.min(this.totalPaginas, inicio + ventana - 1);
            inicio = Math.max(1, fin - ventana + 1);
            const paginas = [];
            for (let i = inicio; i <= fin; i++) paginas.push(i);
            return paginas;
        },

        get rangoMostrado() {
            if (this.total === 0) return 'Sin resultados';
            const desde = (this.paginaActual - 1) * this.porPagina + 1;
            const hasta = Math.min(this.paginaActual * this.porPagina, this.total);
            return `Mostrando ${desde} a ${hasta} de ${this.total}`;
        },

        formatearMonto(valor) {
            return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor || 0);
        },

        formatearFecha(fecha) {
            if (!fecha) return '—';
            const [anio, mes, dia] = fecha.split('T')[0].split('-');
            return `${dia}/${mes}/${anio}`;
        }
    };
}
