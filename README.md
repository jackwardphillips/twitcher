# Rare Bird Dashboard

This project is a comprehensive application for tracking and analyzing bird sightings, with a particular focus on rare bird occurrences. It integrates with external data sources like eBird, processes incoming sighting data, and provides a dashboard for visualization and analysis.

## Features

*   **eBird Data Integration:** Fetches and processes bird sighting data from the eBird platform.
*   **Rarity Detection:** Implements algorithms to identify and highlight rare bird sightings.
*   **Email Ingestion:** Processes incoming emails to capture bird sighting information.
*   **Data Enrichment:** Enriches sighting data with additional context.
*   **Interactive Dashboard:** Visualizes bird distribution, rarity trends, and sighting data.
*   **ABA Checklist Integration:** Supports integration with American Birding Association checklists.
*   **Project Management:** Utilizes a 'conductor' structure for managing project tracks and workflows.

## Technologies

*   **Backend:** Node.js, TypeScript, Express.js, Prisma (for database management), Vitest (for testing).
*   **Frontend:** React, TypeScript, Vite.
*   **Database:** PostgreSQL (implied by Prisma schema and migrations).
*   **Project Management:** Conductor framework for defining and tracking project tasks.

## Setup and Installation

### Prerequisites

*   Node.js (v16 or higher recommended)
*   npm or yarn
*   PostgreSQL database (or other compatible database if Prisma is reconfigured)

### Backend Setup

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  Set up the database:
    *   Ensure your PostgreSQL server is running.
    *   Create a database for the application.
    *   Configure your database connection string in a `.env` file (see `.env.example` for guidance if available, or refer to Prisma documentation).
    *   Run Prisma migrations:
        ```bash
        npx prisma migrate dev --name init
        ```
4.  Start the backend server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    This will typically start the frontend on `http://localhost:5173` (or a similar port).

## Usage

Once both the backend and frontend servers are running, you can access the RareBird Dashboard through your web browser. The frontend will automatically connect to the backend API.
