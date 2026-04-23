# Implementation Plan - Bug: Mobile Rarity Filter

Fix the mobile rarity filter to use click-driven state instead of hover.

## Phase 1: Research & Reproduction

- [ ] Verify hover behavior in browser dev tools (mobile mode) `[ ]`
- [ ] Create a failing test case in `RarityFilter.test.tsx` that expects clicking to open the menu `[ ]`

## Phase 2: Implementation

- [ ] Add `isOpen` state and toggle logic to `RarityFilter.tsx` `[ ]`
- [ ] Implement click-outside listener in `RarityFilter.tsx` `[ ]`
- [ ] Update `App.css` to use state-driven visibility instead of `:hover` `[ ]`

## Phase 3: Validation

- [ ] Run `npm test` and ensure all `RarityFilter` tests pass `[ ]`
- [ ] Manual verification in mobile viewport `[ ]`
