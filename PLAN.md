# Plan de ejecución — Sistema de Terrenos

> Decisión de arquitectura: **migración a Astro** (componentes + layouts) para soportar los CRUDs que vienen, conservando Alpine + CDNs + el backend de Netlify Functions.

---

## ⚠️ Decisión gatillo (RESUELTA): Astro

Se migra a **Astro**. Conserva:
- Alpine para interactividad (islas)
- CDNs (FontAwesome, Flatpickr, html2pdf) vía `is:inline`
- Backend `netlify/functions/` sin cambios
- DOM real, sin virtual DOM

---

## Fase 1 — Quick wins (independientes del stack) ✅ HECHA

Sobre el editor de recibo actual:
- Quitar el select "tipo de movimiento" → siempre `abono`.
- `concepto` auto-rellenado: `"Abono " + descripcion_terreno` (o `"Abono"` si no hay terreno), reactivo y preservando ediciones manuales.
- Backend: confirmar que `recibos-obtener` devuelva `terreno.descripcion`; mantener la columna `tipo_concepto` en BD (futuro).

**Entregable:** editor de recibo más simple. *No depende de Astro.*

---

## Fase 2 — Fundación del layout (Astro) ✅ HECHA

- Scaffold del proyecto + build en Netlify (output estático).
- `Layout.astro`: sidebar de navegación + topbar + slot de contenido. **Off-canvas <992px** (hamburguesa).
- Migrar páginas existentes a `src/pages/*.astro` con el layout. `editar` queda **enfocado** (sin sidebar global). JS en `public/` + CDNs `is:inline`; `auth-guard` `is:inline` en el head. Se **elimina `_redirects`** (routing nativo).
- Menú: **GESTIÓN** (Recibos, Compradores, Terrenos) + Configuración + Salir.

**Entregable:** app con navegación persistente y páginas actuales dentro del shell.

---

## Fase 3 — Editor de recibo unificado (2 vistas)

- Un `<EditorRecibo>`: machote (izq) + sidebar (der) + footer (Imprimir/PDF/Cancelar/Guardar).
- Rutas: `/recibo/nuevo` y `/recibo/editar` (duplicar = flag de editar).
- Sidebar seccionado: **COMPRADOR / TERRENO / PAGO** con progressive disclosure.
- **Tom Select/Choices** en comprador y terreno con opción "Nuevo…" + creación inline. Acoplamiento: *nuevo comprador ⟹ nuevo terreno*.
- Folio: `0001` si terreno nuevo; **fetch `folios-proximo`** si existente (solo lectura, indicativo).
- Hint suave sobre machote vacío.
- "Recibí de" pre-llenado con el comprador.
- Preview reactivo (incluye cláusulas del terreno: costo_total, abono_minimo, día).
- Terreno: 1 solo campo "día del mes"; `frecuencia_pago`/`mes_pago` por default de BD; `saldo_actual`/`estado` derivados en backend.

**Backend:**
- `folios-proximo` (solo lectura).
- Endpoint transaccional "nueva venta" (comprador + terreno + folios_terrenos + recibo, todo o nada).

**Entregable:** crear/editar recibo unificado con venta nueva inline.

---

## Fase 4 — CRUDs de compradores y terrenos ✅ HECHA

Cada uno: **lista** (reusa tabla + buscador + paginador + sorting + empty state + modal eliminar) + **form** nuevo/editar.

**Fábrica genérica de lista (DECIDIDO: sí)** — `listaCrud` parametrizada por config: endpoint, columnas, y filtros por entidad. La mecánica (paginar/ordenar/cargar/eliminar) se comparte; los filtros se parametrizan. Refactorizar también la lista de recibos para que use la fábrica.

**Buscadores (cerrado):**
- Recibos: texto = nombre o folio (LPAD); filtro rango de fechas.
- Compradores: texto = nombre o teléfono; sin filtros extra.
- Terrenos: texto = descripción o comprador; filtro Estado (Todos/Pendiente/Pagado).

**Formularios:**
- Comprador: nombre, telefono, direccion.
- Terreno: comprador (select, solo en NUEVO), descripcion, costo_total, abono_minimo, día. **Traspaso (DECIDIDO): al editar NO se puede cambiar el comprador.**

**Editar finanzas de terreno (DECIDIDO: Opción C):** se permite editar costo/abono aunque haya recibos; el backend **reajusta `saldo_actual`** por la diferencia del costo. Los textos del machote (costo, abono mínimo, día) se leen **en vivo** del terreno (no snapshot) — solo afectan el texto de condiciones, nunca los `cantidad_pago` de los recibos.

**Backend por entidad:** listar, obtener, guardar, editar, eliminar. Las listas traen conteos de dependencias para el modal de cascada.

**Entregable:** administración completa de las 3 entidades.

---

## Fase 5 — Pulido
- Componente de lista genérico para las 3 entidades.
- Refinar off-canvas mobile.
- Print/PDF excluyen el chrome en todas las pantallas imprimibles.

---

## Transversal / decisiones abiertas
- Columnas que se quedan en BD pero sin UI: `tipo_concepto`, `frecuencia_pago`, `mes_pago`.
- `compradores.nombre` sin unique → posibles duplicados (aceptado por ahora).
- Saldo al editar finanzas de un terreno con recibos → resuelto con Opción C (reajuste automático).

---

## Reglas de modelado (simple ahora, BD lista para el futuro)
- El formulario solo expone lo que el humano decide; los derivados (saldo, estado, folio, usuario) los maneja el backend.
- Jerarquía: Comprador (raíz) → Terreno (necesita comprador) → Recibo (necesita terreno).
- Recibo siempre `abono`; pagos siempre mensuales (solo `dia_pago`).
