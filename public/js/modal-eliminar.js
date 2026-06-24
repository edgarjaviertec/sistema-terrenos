document.addEventListener('alpine:init', () => {
    // Store global reutilizable para confirmar borrados con cascada
    Alpine.store('modalEliminar', {
        abierto: false,
        titulo: '',
        mensaje: '',
        dependencias: [],   // [{ cantidad, etiqueta }]
        error: '',
        cargando: false,
        _onConfirmar: null,

        abrir({ titulo, mensaje, dependencias = [], onConfirmar }) {
            this.titulo = titulo || 'Eliminar';
            this.mensaje = mensaje || '';
            this.dependencias = dependencias;
            this._onConfirmar = onConfirmar;
            this.error = '';
            this.cargando = false;
            this.abierto = true;
        },

        cerrar() {
            if (this.cargando) return;
            this.abierto = false;
            this._onConfirmar = null;
            this.error = '';
        },

        async confirmar() {
            if (!this._onConfirmar) return;
            this.cargando = true;
            this.error = '';
            try {
                await this._onConfirmar();
                this.abierto = false;
                this._onConfirmar = null;
            } catch (e) {
                this.error = (e && e.message) || 'No se pudo eliminar.';
            } finally {
                this.cargando = false;
            }
        }
    });
});
