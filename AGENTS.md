# Project Working Rules

## Confirm Before Building

For any non-trivial build, feature, refactor, architecture choice, or product decision:

1. First restate what you understood from the user's prompt.
2. Explain exactly what you propose to build or change.
3. Ask for confirmation or edits.
4. Do not start implementation until the user confirms the plan.

Small factual answers, status checks, and explicitly requested terminal-only actions can be answered directly.

## Spec-Driven Work

Use the `spec-kit` workflow for substantial project work, especially when the user says things like "spec this", "spec-driven", "let's spec this out", "plan this properly", or "I want to build X".

Spec Kit artifacts live in `docs/spec-kit/`. Before continuing any spec-driven planning, read the existing artifacts there so new work stays aligned with the specification and plan.

## Product Story Context

Before planning, designing, or implementing the app, read `docs/product-story-brief.md`. This project is a candidate pitch plus interactive product prototype for Comena, not just a standalone SaaS demo.

## UX Product Playbook

Before designing or building UI for this project, read `docs/ux-product-playbook.md` and apply it. The app should handle loading, success, error, empty, and partial states intentionally, not only the happy path.

## Git Authorship

Never add Codex, OpenAI, assistant, or AI co-author trailers to commits. Keep commit messages clean unless the user explicitly asks for attribution.
