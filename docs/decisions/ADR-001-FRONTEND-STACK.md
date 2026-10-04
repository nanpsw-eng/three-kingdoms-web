# ADR-001 — Frontend Stack

## Status
APPROVED — 2026-10-01

## Decision
Use React + Vite + TypeScript for the application shell rather than Next.js for the initial game product.

## Rationale
The primary workload is client-side 2D rendering, PWA behavior, local persistence and static game assets. SSR/server-component capability is not a primary requirement for the Vertical Slice.

## Consequence
A separate SEO/content site may later use another framework if needed; that does not require changing the game client.
