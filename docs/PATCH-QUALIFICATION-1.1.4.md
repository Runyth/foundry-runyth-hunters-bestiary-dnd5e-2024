# Patch Qualification 1.1.4

## Scope

Progress windows close only after clean success and remain open with failure details otherwise.

## Automated qualification

- Tests: 24/24
- English/German localization parity: 86/86
- Static validation: passed
- Manifest paths and dependencies: passed
- Runtime archive path safety: passed
- Repeated deterministic builds: required by release packaging
- Source-to-install reproduction: required by release packaging

## Limitation

No live Foundry client was launched in the build environment.
