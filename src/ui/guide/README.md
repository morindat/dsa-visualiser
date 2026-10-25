# `src/ui/guide/`

Guided entry for the selected operation: preset datasets, a free-text field for custom values, and
the **validation report**. Validation is total and happens *before* anything is built or run — the
algorithm is only ever reachable through validated values (`ADR-7`, `FR6`).

Files:

- `OperationGuide.tsx` — input form for the current operation, plus the inline preset picker. It
  renders one field per `OperationMeta.inputs` entry and reports edits; the parent owns the text,
  and the component never inspects it.
- `ValidationFeedback.tsx` — renders a `ValidationReport` as per-token chips (accepted / skipped /
  rejected) plus the batch error and the accepted preview. One component serves every structure,
  because `GraphValidationReport` reuses the same `TokenReport` shape (`FR5`, `FR6`).

A preset is loaded by turning it back into text (`presetValuesToText` / `presetEdgesToText`) and
filling the same fields a user would type into, so presets take the identical validation path.

Pressing **Visualise** starts a composed trace: the dataset is inserted one value at a time (the
insert listing is highlighted, line by line) and only then does the selected operation run. The
pseudocode and complexity panes resolve their listing from `currentStep.operation`, so the highlight
switches phase with the trace — see `src/app/README.md` ("Composed traces").

The validators themselves live in `src/app/validate.ts` (pure, DOM-free, unit-tested separately);
this folder only presents their output.
