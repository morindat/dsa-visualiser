# `src/ui/sidebar/`

Persistent navigation over the structure catalogue: for each structure, its description, supported
operations, validation rules and a complexity summary. Selecting an entry drives the guide and the
workspace.

Expected files:

- `CatalogueSidebar.tsx` — renders `CatalogueEntry` records read from `data/catalogue.ts`.
- `CatalogueItem.tsx` — one selectable row (keyboard operable, `aria-current` on the active item).

The catalogue is **static, versioned data** — the sidebar must never fetch anything over the
network (§4.4, `NFR-Se1`).
