# ADR-002 — Game Architecture Boundary

## Status
APPROVED — 2026-10-01

## Decision
Use Phaser for rendering/world interaction and React DOM for responsive application UI. Keep deterministic game rules in framework-independent TypeScript domain modules.

## Hard boundary
Domain modules must not import Phaser or React. Rendering layers consume domain state/results through typed controllers/events.

## Rationale
This enables headless tests, deterministic regression, balance simulation, replay/debugging and easier mobile UI/accessibility work.
