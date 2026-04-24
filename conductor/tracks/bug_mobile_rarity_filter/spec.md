# Specification - Bug: Mobile Rarity Filter

The mobile rarity filter currently relies on a CSS `:hover` state to display the dropdown menu. This is unreliable on touch devices where hover states are either non-existent or sticky.

## Requirements

- Replace the hover-based dropdown with a click-triggered dropdown.
- Ensure the dropdown closes when a selection is made or when clicking outside.
- Maintain the current aesthetic and accessibility (ARIA roles).
- The "active" state of the dropdown should be managed via React state.

## Proposed Changes

### Frontend

- **RarityFilter.tsx**:
    - Add `isOpen` state to track the dropdown visibility.
    - Add a toggle function to the dropdown trigger button.
    - Use `isOpen` to conditionally render or apply a class to the `.dropdown-menu`.
    - Add a `useEffect` listener to close the dropdown when clicking outside the component.
- **App.css**:
    - Remove `.custom-dropdown:hover .dropdown-menu { display: block; }`.
    - Add a class (e.g., `.dropdown-menu.open`) to handle visibility when `isOpen` is true.

## Verification Plan

- **Automated Tests**:
    - Update `RarityFilter.test.tsx` to verify clicking the trigger opens the menu.
    - Verify clicking an option toggles the rarity and (optionally) closes the menu.
- **Manual Verification**:
    - Test on mobile viewport in browser dev tools.
    - Verify touch-like behavior (click to open, click to select, click outside to close).
