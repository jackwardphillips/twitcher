# Implementation Plan - Implement core eBird alert parsing and rarity dashboard

This plan outlines the steps for building the MVP of the Rare Bird Dashboard, focusing on eBird alert ingestion and a basic dashboard interface.

## Phase 1: Project Scaffolding [checkpoint: 35d5e20]
Initial project setup and configuration for both frontend and backend.

- [x] **Task: Initialize React Frontend with Vite** (0031434)
    - [ ] Set up a new Vite project with React and TypeScript
    - [ ] Configure Vanilla CSS for styling
- [x] **Task: Initialize Node.js Backend with Express and TypeScript** (39e0c1c)
    - [ ] Set up a basic Express server with TypeScript
    - [ ] Configure initial API routes and environment variables
- [x] **Task: Set up SQLite with Prisma ORM** (3458574)
    - [ ] Initialize Prisma with SQLite
    - [ ] Define the initial `Sighting` model and run migrations
- [x] **Task: Conductor - User Manual Verification 'Project Scaffolding' (Protocol in workflow.md)** (35d5e20)

## Phase 2: eBird Alert Ingestion [checkpoint: 5edf3c4]
Building the logic to parse and store rare bird sightings from eBird emails.

- [x] **Task: Implement eBird email parsing logic (TDD)** (d5b1712)
    - [x] Write failing tests for parsing sample eBird email content (Red)
    - [x] Implement the parsing logic to successfully extract bird, location, date, and observer (Green)
- [x] **Task: Implement sighting data storage (TDD)** (5360fd3)
    - [x] Write failing tests for saving parsed sightings into the SQLite database (Red)
    - [x] Implement the storage logic using Prisma to persist sightings (Green)
- [x] **Task: Conductor - User Manual Verification 'eBird Alert Ingestion' (Protocol in workflow.md)** (5edf3c4)

## Phase 3: Dashboard Development
Creating the user interface to display and interact with the rarity data.

- [x] **Task: Create basic dashboard UI (TDD)** (9943ee2)
    - [x] Write failing tests for rendering a list of sightings in the frontend (Red)
    - [x] Implement the dashboard component to fetch and display sightings from the API (Green)
- [ ] **Task: Implement sighting details view with Discord links (TDD)**
    - [ ] Write failing tests for generating and displaying Discord links for a specific sighting (Red)
    - [ ] Implement the details view and link generation logic to pass the tests (Green)
- [ ] **Task: Conductor - User Manual Verification 'Dashboard Development' (Protocol in workflow.md)**