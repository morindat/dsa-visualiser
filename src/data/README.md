# `src/data/` — static, versioned data

Nothing here is fetched or generated at runtime. It is committed to the repository so the app is a
purely static bundle with no backend (`NFR-Se1`, `ADR-7`).

```
data/
├── catalogue.ts   OperationMeta + CatalogueEntry records (see below)
├── presets/       *.json example inputs, loaded by the guide
└── golden/        *.json recorded traces, read by the golden-trace tests
```

`catalogue.ts` is the single record that must supply the menu label, the guide text, the
`pseudocodeId`, and the complexity card for an operation, so a bound cannot attach itself to the
wrong operation and a missing bound is a visible gap (`Listing 16`, `FR11`).
