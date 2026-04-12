# Implementation Plan — Rarity Code Filter

This plan implements a multi-select rarity code filter (ABA codes 1-6) in the dashboard header, with responsive behavior (inline on desktop, dropdown on mobile).

## Phase 1: Foundation & State Management
Define the rarity filter state and filtering logic in the `Dashboard` component.

- [ ] Task: Create `RarityFilter` component shell and types.
    - [ ] Define `RarityCode` type (1-6).
    - [ ] Create `RarityFilterProps` interface.
- [ ] Task: Implement TDD for `Dashboard` filtering logic.
    - [ ] Write tests in `Dashboard.test.tsx` for:
        - [ ] Default selection (3, 4, 5, 6).
        - [ ] Filtering sightings by rarity code.
        - [ ] Empty-state guard (cannot deselect last code).
- [ ] Task: Implement state and filtering logic in `Dashboard.tsx`.
    - [ ] Add `selectedRarities` state.
    - [ ] Update `displayedSightings` to include rarity filtering.
    - [ ] Implement `handleToggleRarity` with empty-state guard.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & State Management' (Protocol in workflow.md)

## Phase 2: UI Implementation (Desktop & Mobile)
Build the responsive `RarityFilter` component with inline and dropdown modes.

- [ ] Task: Implement TDD for `RarityFilter` UI component.
    - [ ] Write tests in `RarityFilter.test.tsx` for:
        - [ ] Correct rarity colors from `RARITY_COLOR_MAP` applied to each button.
        - [ ] Disabled/ignored state when only one code is selected.
        - [ ] Correct callbacks fire on toggle.
        - [ ] Desktop inline layout vs. Mobile dropdown behavior (using mock matchMedia or viewport sizing).
- [ ] Task: Implement `RarityFilter` component UI.
    - [ ] Add desktop layout: Inline toggle buttons styled with `RARITY_COLOR_MAP`.
    - [ ] Add mobile layout: Dropdown menu (active when viewport < 600px).
    - [ ] Ensure \"Field Journal\" styling (Playfair Display / Lora).
- [ ] Task: Integrate `RarityFilter` into `Dashboard.tsx`.
    - [ ] Place component between header title and \"Filter Near Me\" button.
    - [ ] Wire up `selectedRarities` and `handleToggleRarity`.
- [ ] Task: Verify responsive behavior.
    - [ ] Test CSS media queries for < 600px breakpoint.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: UI Implementation' (Protocol in workflow.md)

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