document.addEventListener('alpine:init', () => {
    Alpine.data('listaTerrenos', () => crearListaCrud({
        endpoint: '/.netlify/functions/terrenos-listar',
        endpointEliminar: '/.netlify/functions/terrenos-eliminar',
        filtros: { texto: '', estado: '' },

        eliminar(t) {
            const dependencias = [];
            if (t.recibos_count > 0) {
                dependencias.push({ cantidad: t.recibos_count, etiqueta: t.recibos_count === 1 ? 'recibo' : 'recibos' });
            }
            return {
                titulo: 'Eliminar terreno',
                mensaje: `Se borrará el terreno "${t.descripcion}" de ${t.comprador_nombre}.`,
                dependencias,
                body: { terrenoId: t.id },
                mensajeExito: 'Terreno eliminado correctamente.'
            };
        }
    }));
});
