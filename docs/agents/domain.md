# Domain Docs

How engineering skills should consume this repository's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root, or
- `CONTEXT-MAP.md` at the repo root if it exists; it points to the relevant `CONTEXT.md` files.
- `docs/adr/` for ADRs touching the area being explored.

If these files do not exist, proceed silently. The `/domain-modeling` skill creates them lazily when terms or decisions are resolved.

## File structure

This is a single-context repository:

```
/
├── CONTEXT.md
└── docs/adr/
```

## Use the glossary's vocabulary

When output names a domain concept, use the term defined in `CONTEXT.md`. If the concept is missing, treat it as a domain-modeling gap rather than inventing terminology casually.

## Flag ADR conflicts

If output contradicts an existing ADR, surface the conflict explicitly rather than silently overriding it.
