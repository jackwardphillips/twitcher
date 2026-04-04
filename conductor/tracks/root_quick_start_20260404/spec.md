# Track Specification: Project Root Quick Start

## Overview
Implement a project-level `package.json` and a "quick start" command (`npm start`) to launch both the backend and frontend simultaneously. This simplifies the development workflow on Windows by removing the need to manage multiple terminals manually.

## Functional Requirements
- **Unified Start Command:** Add a root `package.json` with an `npm start` script.
- **Concurrent Execution:** Use `concurrently` to run `npm start` (or `npm run dev`) in both the `backend/` and `frontend/` directories.
- **Terminal Consolidation:** Stream stdout/stderr from both processes into a single terminal window with color-coded prefixes.
- **Process Management:** Ensure that terminating the root process (`Ctrl+C`) correctly kills both child processes.

## Technical Approach
- **Tooling:** Use `concurrently` as a dev dependency in the project root.
- **Scripts:**
    - `npm start`: Executes `concurrently "npm run dev --prefix backend" "npm run dev --prefix frontend"`.
    - `npm run install:all`: A convenience script to run `npm install` in both subdirectories.

## Acceptance Criteria
- Running `npm start` from the root directory launches both the backend and frontend.
- The dashboard is accessible at the default Vite port (usually http://localhost:5173).
- The backend API is reachable by the frontend.
- Both processes terminate cleanly when the user stops the root command.

## Out of Scope
- Docker Compose setup.
- Automatic database migrations/seeding (assumed to be done already).
- Production build orchestration.
