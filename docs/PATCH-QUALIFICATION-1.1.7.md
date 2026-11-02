# Patch Qualification 1.1.7

This release formalizes the base D&D stat-block registry contract and consumes Hunter's Bestiary 1.3.6 for safe operation-result inspection.

## Required gates

- Valid records register idempotently.
- Invalid records return structured rule and field diagnostics.
- Provider replacement removes stale records and rejected replacement preserves prior content.
- No copied arbitrary recursive operation traversal remains.
- Settings bootstrap and bundled runtime tests continue to pass.
- Deterministic install and source archives reproduce byte-for-byte.
