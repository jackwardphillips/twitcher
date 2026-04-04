# Technology Stack - Rare Bird Dashboard

## Frontend
- **React (TypeScript):** A robust and widely-used library for building modern, responsive user interfaces.
- **Vanilla CSS:** Leverages native browser capabilities for maximum flexibility and performance.
- **Vite:** A fast build tool for modern web projects.
- **Leaflet & React-Leaflet (Added 2026-04-03):** For interactive mapping of bird sightings with precise geospatial pins.

## Backend
- **Node.js (Express):** A reliable, high-performance environment for building the dashboard's API.
- **TypeScript:** Ensures type safety and better developer experience on the backend.

## Data Storage
- **SQLite:** A lightweight, serverless database ideal for storing sighting metadata and user preferences.
- **Prisma (ORM):** Provides type-safe database access and streamlined migrations.

## Integration & Automation
- **Playwright:** For automated web searching and scraping of bird species information and photos.
- **Axios:** For handling HTTP requests to eBird and other external APIs.
- **Concurrently:** For simultaneous execution of backend and frontend development services.

## Deployment
- **Frontend:** Vercel or Netlify for rapid, scalable frontend hosting.
- **Backend:** Render or Railway for simple and reliable backend deployment.
