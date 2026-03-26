# Track Specification: Implement core eBird alert parsing and rarity dashboard

## Overview
This track focuses on the core MVP functionality: ingesting rare bird alert emails from eBird, parsing them into structured data, and displaying them in a centralized web-based dashboard.

## Objectives
- Ingest and parse eBird rare bird alert emails.
- Store sighting data (species, location, date, observer, rarity code).
- Implement a basic web-based dashboard to display the sightings.
- Provide direct links to Discord for community context.

## Requirements
- **eBird Ingestion:** A service to read and parse the daily eBird rare bird alert email.
- **Data Storage:** Use SQLite to store parsed sighting data.
- **Dashboard UI:** A React-based web interface to display the sightings in a searchable/filterable list.
- **Discord Links:** Automatically generate links to relevant Discord channels/threads based on the sighting location or species.

## Technical Approach
- **Backend:** Node.js (Express) with TypeScript.
- **Frontend:** React (TypeScript) with Vanilla CSS.
- **Database:** SQLite with Prisma ORM.
- **Integration:** Initial parsing logic for eBird emails (simulated or via an IMAP client).

## Success Criteria
- Daily eBird alerts are successfully parsed and stored in the database.
- The dashboard displays a list of recent ABA code 4 and 5 sightings.
- Users can click on a sighting to see more details and access Discord links.
- Automated tests cover the parsing logic and core UI components (>80% coverage).