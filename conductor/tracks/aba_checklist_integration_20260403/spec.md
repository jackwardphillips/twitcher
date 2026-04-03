# Specification - ABA Checklist Integration

### Overview
This track focuses on integrating the ABA Checklist CSV into the application to create a comprehensive species rarity code lookup. This will involve parsing the CSV, storing the data, and making it available for future filtering logic.

### Goals
- **Ingest ABA Checklist:** Parse the provided ABA Checklist CSV file.
- **Store Rarity Codes:** Store all ABA codes (1-6) associated with each species.
- **Build Species Rarity Lookup:** Create a mechanism to query species rarity codes efficiently.
- **Prepare for Future Filtering:** Ensure the stored data supports future filtering capabilities (e.g., code 3+ within X miles).

### Functional Requirements
- **CSV Parsing:** Implement logic to read and parse the `ABA_Checklist-8.19.csv` file.
- **Data Mapping:** Map CSV columns (common name, scientific name, ABA code) to a suitable data structure.
- **Database Storage:** Store the parsed ABA rarity data in the SQLite database using Prisma.
- **Rarity Code Lookup:** Provide a function or service to retrieve rarity codes for a given species.

### Non-Functional Requirements
- **Data Integrity:** Ensure accurate mapping of ABA codes to species.
- **Performance:** The lookup mechanism should be efficient for quick retrieval.

### Acceptance Criteria
- The ABA Checklist CSV is successfully parsed.
- ABA rarity codes (1-6) for all species in the CSV are stored in the database.
- A lookup function can retrieve the ABA code(s) for a given species (common or scientific name).
- Future filtering logic for rarity codes can be built upon the stored data.

### Out of Scope
- Implementation of any filtering logic based on rarity codes (e.g., code 3+ within X miles).
- Real-time updates or automated fetching of the ABA Checklist CSV.
