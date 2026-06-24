document.addEventListener('alpine:init', () => {
    Alpine.data('listaRecibos', () => crearListaCrud({
        endpoint: '/.netlify/functions/recibos-listar',
        endpointEliminar: '/.netlify/functions/recibos-eliminar',
        filtros: { texto: '', fechaInicio: '', fechaFin: '' },

        // Flatpickr de rango de fechas (filtro propio de recibos)
        alInicializar() {
            this._flatpickr = flatpickr(this.$refs.fechaWrap, {
                wrap: true,
                mode: 'range',
                locale: 'es',
                dateFormat: 'd/m/Y',
                onChange: (fechas) => {
                    if (fechas.length === 2) {
                        this.filtros.fechaInicio = fechas[0].toISOString().split('T')[0];
                        this.filtros.fechaFin = fechas[1].toISOString().split('T')[0];
                        this.buscar();
                    } else if (fechas.length === 0) {
                        this.filtros.fechaInicio = '';
                        this.filtros.fechaFin = '';
                        this.buscar();
                    }
                }
            });
        },

        eliminar(recibo) {
            const folio = String(recibo.folio).padStart(4, '0');
            return {
                titulo: 'Eliminar recibo',
                mensaje: `Se borrará el recibo folio ${folio} de ${recibo.comprador}.`,
                dependencias: [],
                body: { reciboId: recibo.id },
                mensajeExito: 'Recibo eliminado correctamente.'
            };
        }
    }));
});
