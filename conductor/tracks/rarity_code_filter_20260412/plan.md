# Implementation Plan — Rarity Code Filter

This plan implements a multi-select rarity code filter (ABA codes 1-6) in the dashboard header, with responsive behavior (inline on desktop, dropdown on mobile).

## Phase 1: Foundation & State Management [checkpoint: b05bd4b]
Define the rarity filter state and filtering logic in the `Dashboard` component.

- [x] Task: Create `RarityFilter` component shell and types. fec3392
    - [ ] Define `RarityCode` type (1-6).
    - [ ] Create `RarityFilterProps` interface.
- [x] Task: Implement TDD for `Dashboard` filtering logic. 68ef710
    - [ ] Write tests in `Dashboard.test.tsx` for:
        - [ ] Default selection (3, 4, 5, 6).
        - [ ] Filtering sightings by rarity code.
        - [ ] Empty-state guard (cannot deselect last code).
- [x] Task: Implement state and filtering logic in `Dashboard.tsx`. 031d689
    - [ ] Add `selectedRarities` state.
    - [ ] Update `displayedSightings` to include rarity filtering.
    - [ ] Implement `handleToggleRarity` with empty-state guard.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Foundation & State Management' (Protocol in workflow.md) b05bd4b

## Phase 2: UI Implementation (Desktop & Mobile) [checkpoint: 11b7727]
Build the responsive `RarityFilter` component with inline and dropdown modes.

- [x] Task: Implement TDD for `RarityFilter` UI component. 6d52a48
    - [ ] Write tests in `RarityFilter.test.tsx` for:
        - [ ] Correct rarity colors from `RARITY_COLOR_MAP` applied to each button.
        - [ ] Disabled/ignored state when only one code is selected.
        - [ ] Correct callbacks fire on toggle.
        - [ ] Desktop inline layout vs. Mobile dropdown behavior (using mock matchMedia or viewport sizing).
- [x] Task: Implement `RarityFilter` component UI. 84f0bc2
    - [ ] Add desktop layout: Inline toggle buttons styled with `RARITY_COLOR_MAP`.
    - [ ] Add mobile layout: Dropdown menu (active when viewport < 600px).
    - [ ] Ensure \"Field Journal\" styling (Playfair Display / Lora).
- [x] Task: Integrate `RarityFilter` into `Dashboard.tsx`. 031d689
    - [ ] Place component between header title and \"Filter Near Me\" button.
    - [ ] Wire up `selectedRarities` and `handleToggleRarity`.
- [x] Task: Verify responsive behavior. 84f0bc2
    - [ ] Test CSS media queries for < 600px breakpoint.
- [x] Task: Conductor - User Manual Verification 'Phase 2: UI Implementation' (Protocol in workflow.md) 11b7727

## Phase 3: Verification & Polish
Final end-to-end testing and styling refinements.

- [ ] Task: Run full test suite and verify coverage.
    - [ ] Ensure `Dashboard.test.tsx` and `RarityFilter.test.tsx` pass.
    - [ ] Verify >80% coverage for new code.
- [ ] Task: Manual end-to-end verification.
    - [ ] Verify card list updates on filter change.
    - [ ] Verify map pins update on filter change.
    - [ ] Verify mobile dropdown behavior.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Verification & Polish' (Protocol in workflow.md)