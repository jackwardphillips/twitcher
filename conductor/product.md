# Initial Concept

I want to build a dashboard that will track ABA code 4 and 5 rare bird alerts. Currently, once a day, I get an email from ebird with a list of all the rare birds and a truncated list of the sightings. I look through it, decide if any are relevant to me, and if they are, go to discord where people are usually chatting about the bird. i also may do some web searching to get some general info about it. i want to put that all in one. my idea right now is a dashboard.

---

# Product Definition - Rare Bird Dashboard

## Vision
A centralized, web-based dashboard designed for ABA rare bird seekers and efficiency-oriented birders (initially for personal use) to streamline the process of tracking and researching ABA code 4 and 5 rare bird alerts.

## Target Audience
- **ABA Rare Bird Seekers:** Enthusiastic birders who prioritize tracking and seeing ABA code 4 and 5 rarities.
- **Efficiency-oriented Birders:** Users who want a fast, consolidated view of information to make quick decisions.
- **Personal Use:** Initially optimized for the creator's specific workflow.

## Goals
- **Centralize Information:** Consolidate data from eBird alerts, Discord discussions, and web searches into a single interface.
- **Geospatial Awareness:** Provide precise mapping and proximity-based filtering to help users find rarities near them.
- **Informed Decision-Making:** Provide enough context for users to quickly decide if a sighting is worth investigating.
- **Stay Updated on Rarities:** Ensure users stay current with the latest high-priority rarity alerts.

## Key Features
- **Rarity Alert Dashboard:** A summarized, interactive list of recent ABA code 4 and 5 bird sightings.
- **ABA Rarity Lookup:** Integrated ABA Checklist for accurate rarity code identification (1-6) across all species.
- **Interactive Map:** A top-down geospatial view of sightings with rarity-coded markers.
- **Rarity Code Filter (Added 2026-04-12):** Multi-select filter for ABA rarity codes 1-6, allowing users to toggle visibility of different rarity tiers across the dashboard and map.
- **"Near Me" Filter:** One-touch filtering to see sightings within a 50km radius of the user's current location.
- **Sighting Streaks:** Visual indicators of how many consecutive days a species has been reported at a specific location.
- **Incident-Based Clustering (Updated 2026-04-24):** Automatically groups multiple sightings of the same species into a single "Incident" using velocity-aware logic (25km base radius + expansion for moving observers). This prevents fragmentation of sightings from ships or traveling birds while maintaining high precision for stationary reports.
- **Automated Email Ingestion:** Active IMAP polling for eBird alerts (ABA Rarities) to automatically ingest and parse sightings.
- **Chase Intel Summaries (Added 2026-04-16):** AI-generated (Groq/Gemini) 1-2 sentence summaries of observer comments, highlighting precise location cues and behavioral patterns to help birders plan their chase.
- **Platform Integration:** Direct links or snippets from Discord community discussions.
- **Automated Bird Research:** Automated web searching and AI summarization to gather additional information, photos, and context for rare species.

## Technical Preferences
- **Platform:** Web-Based Application for easy access across devices.