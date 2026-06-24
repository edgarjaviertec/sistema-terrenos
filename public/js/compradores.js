document.addEventListener('alpine:init', () => {
    Alpine.data('listaCompradores', () => crearListaCrud({
        endpoint: '/.netlify/functions/compradores-listar',
        endpointEliminar: '/.netlify/functions/compradores-eliminar',
        filtros: { texto: '' },

        eliminar(c) {
            const dependencias = [];
            if (c.terrenos_count > 0) {
                dependencias.push({ cantidad: c.terrenos_count, etiqueta: c.terrenos_count === 1 ? 'terreno' : 'terrenos' });
            }
            if (c.recibos_count > 0) {
                dependencias.push({ cantidad: c.recibos_count, etiqueta: c.recibos_count === 1 ? 'recibo' : 'recibos' });
            }
            return {
                titulo: 'Eliminar comprador',
                mensaje: `Se borrará el comprador ${c.nombre}.`,
                dependencias,
                body: { compradorId: c.id },
                mensajeExito: 'Comprador eliminado correctamente.'
            };
        }
    }));
});
