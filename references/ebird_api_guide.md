# eBird API 2.0 — Agent Reference Guide

> **What is eBird?** eBird is Cornell Lab of Ornithology's global bird observation database. The API gives you read access to hundreds of millions of real bird sightings, hotspot data, taxonomy, and more.

---

## Authentication

Every request (with a few exceptions) requires an API key tied to your eBird account.

**Get a key:** https://ebird.org/api/keygen

**Send it one of two ways:**

```http
# Preferred: HTTP header
x-ebirdapitoken: YOUR_API_KEY

# Alternative: query parameter
?key=YOUR_API_KEY
```

**Base URL:** `https://api.ebird.org/v2/`

**Default response format:** JSON

---

## Quick-start (Python)

```python
import os
import requests

API_KEY = os.environ["EBIRD_API_KEY"]
HEADERS = {"x-ebirdapitoken": API_KEY}
BASE = "https://api.ebird.org/v2"

def get(path, params=None):
    r = requests.get(f"{BASE}{path}", headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

# Recent observations in New York state
obs = get("/data/obs/US-NY/recent")
```

> ⚠️ **Be a good citizen.** Don't bulk-download checklists for entire continents. Excessive use can get your key banned. If you're building something big, contact eBird first.

---

## Key Concepts

| Term | Meaning |
|---|---|
| **Region code** | Hierarchical geographic code: `US` → `US-NY` → `US-NY-061` (country → state → county) |
| **Location ID** | Specific eBird hotspot or personal location, e.g. `L227544` |
| **Species code** | Short alpha code for a species, e.g. `amecro` = American Crow, `norcar` = Northern Cardinal |
| **Checklist / Sub ID** | Unique ID for a submitted checklist, e.g. `S22536787` |
| `back` | How many days back to search (max: 30, default: 14) |
| `maxResults` | Cap on returned records |
| `detail` | `simple` (default) or `full` — full includes observer/checklist info |
| `provisional` | Include unreviewed observations (default: false) |
| `hotspot` | Only include hotspot locations (default: false) |

---

## Endpoint Groups

### 1. Observations

#### Recent observations in a region
```
GET /data/obs/{regionCode}/recent
```
Returns the most recent sightings within a region.

**Params:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `back` | int | 14 | Days back (1–30) |
| `cat` | string | all | Taxonomy category filter: `species`, `issf`, `slash`, etc. |
| `maxResults` | int | — | Cap results |
| `includeProvisional` | bool | false | Include unreviewed sightings |
| `hotspot` | bool | false | Hotspot locations only |
| `detail` | string | simple | `simple` or `full` |
| `r` | string | — | Comma-separated list of up to 10 sub-region codes |

```python
obs = get("/data/obs/US-NY/recent", {"back": 7, "maxResults": 50})
```

---

#### Recent observations of a species in a region
```
GET /data/obs/{regionCode}/recent/{speciesCode}
```
Same params as above. Great for tracking where a specific species has been seen lately.

```python
# American Robin sightings in New York
obs = get("/data/obs/US-NY/recent/amerob")
```

---

#### Recent nearby observations
```
GET /data/obs/geo/recent
```
Observations within a radius of a lat/lng point.

**Params:**
| Param | Type | Required | Notes |
|---|---|---|---|
| `lat` | float | ✅ | Latitude |
| `lng` | float | ✅ | Longitude |
| `dist` | int | — | Radius in km (1–50, default: 25) |
| `back` | int | — | Days back |
| `maxResults` | int | — | Cap results |
| `includeProvisional` | bool | — | |
| `hotspot` | bool | — | |

```python
# Birds seen near Central Park, NYC
obs = get("/data/obs/geo/recent", {"lat": 40.7829, "lng": -73.9654, "dist": 5})
```

---

#### Recent nearby observations of a species
```
GET /data/obs/geo/recent/{speciesCode}
```
Same geo params as above but filtered to one species.

---

#### Notable observations in a region
```
GET /data/obs/{regionCode}/recent/notable
```
Returns rare or unusual sightings flagged by eBird reviewers.

**Params:** `back`, `maxResults`, `detail`, `hotspot`

```python
# Rare birds in New York State
rarities = get("/data/obs/US-NY/recent/notable", {"back": 14})
```

---

#### Notable nearby observations
```
GET /data/obs/geo/recent/notable
```
Same as above but geo-based. Params: `lat`, `lng`, `dist`, `back`, `maxResults`, `detail`.

---

#### Historic observations on a date
```
GET /data/obs/{regionCode}/historic/{y}/{m}/{d}
```
What was seen in a region on a specific past date.

**Params:** `maxResults`, `detail`, `includeProvisional`, `hotspot`, `cat`, `r`

```python
obs = get("/data/obs/US-NY/historic/2023/5/14")
```

---

#### Nearest locations with a species
```
GET /data/nearest/geo/recent/{speciesCode}
```
Find the closest place(s) to a coordinate where a species was recently seen.

**Params:**
| Param | Type | Required |
|---|---|---|
| `lat` | float | ✅ |
| `lng` | float | ✅ |
| `back` | int | — |
| `maxResults` | int | — |
| `dist` | int | — |
| `includeProvisional` | bool | — |
| `hotspot` | bool | — |

```python
# Where's the nearest Snowy Owl to NYC?
nearest = get("/data/nearest/geo/recent/snowie", {"lat": 40.71, "lng": -74.01})
```

---

### 2. Hotspots

Hotspots are named public birding locations with a unique Location ID (`L...`).

#### Hotspots in a region
```
GET /ref/hotspot/{regionCode}
```
List all hotspots in a country, state, or county.

**Params:**
| Param | Default | Notes |
|---|---|---|
| `back` | — | Only return hotspots visited in last N days |
| `fmt` | json | `json` or `csv` |

```python
hotspots = get("/ref/hotspot/US-NY")
```

---

#### Nearby hotspots
```
GET /ref/hotspot/geo
```
Find hotspots within a radius of a coordinate.

**Params:** `lat` ✅, `lng` ✅, `dist` (default 25 km), `back`, `fmt`

```python
spots = get("/ref/hotspot/geo", {"lat": 40.78, "lng": -73.97, "dist": 10})
```

---

#### Hotspot info
```
GET /ref/hotspot/info/{locId}
```
Get metadata (name, coordinates, country/state) for a specific hotspot.

```python
info = get("/ref/hotspot/info/L128129")  # Central Park
```

---

### 3. Taxonomy

#### eBird taxonomy
```
GET /ref/taxonomy/ebird
```
The full eBird species list. No API key required.

**Params:**
| Param | Notes |
|---|---|
| `cat` | Filter: `species`, `issf`, `slash`, `form`, `spuh`, `hybrid`, `domestic`, `intergrade` |
| `locale` | Language for common names (default: `en`) |
| `species` | Comma-separated species codes to retrieve |
| `version` | Taxonomy version year |
| `fmt` | `json` or `csv` |

```python
# All species in Spanish
taxonomy = get("/ref/taxonomy/ebird", {"cat": "species", "locale": "es"})
```

---

#### Taxonomy versions
```
GET /ref/taxonomy/versions
```
List of all available eBird taxonomy versions.

---

#### Taxa locale codes
```
GET /ref/taxa-locales/ebird
```
List of supported locale codes for common name translations.

---

### 4. Region Info

#### Region info
```
GET /ref/region/info/{regionCode}
```
Bounding box and display name for a region.

```python
info = get("/ref/region/info/US-NY-061")  # Tompkins County, NY
# Returns: {"result": "Tompkins, New York, United States", "minX": ..., "maxX": ..., ...}
```

---

#### Sub-region list
```
GET /ref/region/list/{regionType}/{parentRegionCode}
```
List sub-regions within a parent region.

**regionType options:** `country`, `subnational1` (states/provinces), `subnational2` (counties)

```python
# All US states
states = get("/ref/region/list/subnational1/US")

# All counties in New York
counties = get("/ref/region/list/subnational2/US-NY")
```

---

#### Adjacent regions
```
GET /ref/adjacent/{regionCode}
```
Get a list of regions that share a border. Works at the country and subnational1 level.

---

### 5. Checklists & Visits

#### Checklist feed (recent visits)
```
GET /product/lists/{regionCode}
```
Most recent checklists submitted to a region or location.

**Params:** `maxResults` (default 10, max 200)

```python
recent_lists = get("/product/lists/US-NY", {"maxResults": 20})
```

---

#### Get a checklist
```
GET /product/checklist/view/{subId}
```
Full details of a single checklist, including all species and counts.

```python
checklist = get("/product/checklist/view/S22536787")
```

---

#### Checklist feed for a date
```
GET /product/lists/{regionCode}/{y}/{m}/{d}
```
Checklists submitted to a region on a specific date.

**Params:** `maxResults` (max 200), `sortKey` (`obs_dt` or `creation_dt`)

---

### 6. Statistics

#### Top 100
```
GET /product/top100/{regionCode}/{y}/{m}/{d}
```
The top 100 observers in a region on a specific date, ranked by species count or checklist count.

**Params:**
| Param | Notes |
|---|---|
| `rankedBy` | `spp` (species, default) or `cl` (checklists) |
| `maxResults` | Default 100 |

```python
# Big Day leaderboard for New York on May 11, 2024
top = get("/product/top100/US-NY/2024/5/11")
```

---

#### Species list for a region
```
GET /product/spplist/{regionCode}
```
Returns all species codes ever reported from a region (no extra params needed).

```python
all_species = get("/product/spplist/US-NY")
```

---

#### Species stats for a location on a date
```
GET /product/stats/{locId}/{y}/{m}/{d}
```
Number of checklists, contributors, and species for a location on a date.

---

## Observation Response Fields

A typical observation object looks like this:

```json
{
  "speciesCode": "norcar",
  "comName": "Northern Cardinal",
  "sciName": "Cardinalis cardinalis",
  "locId": "L128129",
  "locName": "Central Park",
  "obsDt": "2024-03-15 08:30",
  "howMany": 3,
  "lat": 40.7829,
  "lng": -73.9654,
  "obsValid": true,
  "obsReviewed": false,
  "locationPrivate": false,
  "subId": "S166123456"
}
```

With `detail=full`, you also get: `firstName`, `lastName`, `userDisplayName`, `checklistId`, `presenceNoted`, `hasComments`, `hasRichMedia`, and full location hierarchy (country, state, county names/codes).

---

## Locales for Common Names

Pass `locale` to observation and taxonomy endpoints to get common names in other languages.

```python
# French common names
obs = get("/data/obs/CA-QC/recent", {"locale": "fr"})
```

Some useful locale codes: `en` (English), `es` (Spanish), `fr` (French), `de` (German), `pt` (Portuguese), `zh` (Chinese), `ja` (Japanese).

Full list: `GET /ref/taxa-locales/ebird`

---

## Region Code Cheat Sheet

| Level | Format | Example |
|---|---|---|
| Country | 2-letter ISO | `US`, `CA`, `GB`, `MX` |
| State/Province | `CC-SS` | `US-NY`, `CA-ON`, `MX-OAX` |
| County | `CC-SS-NNN` | `US-NY-061` |
| Hotspot/Location | `L` + digits | `L128129` |

---

## Tips for Agents

- **Start broad, then narrow.** Use region codes to get a feel for what's around, then drill into specific locations or species.
- **Species codes are short and lowercase.** They're not always obvious — use the taxonomy endpoint or look them up in responses. `amecro` = American Crow, `tenwar` = Tennessee Warbler.
- **`back` maxes out at 30.** For older data, use the historic observations endpoint.
- **Location IDs start with `L`.** Region codes do not. They work in different endpoints.
- **Provisional vs. reviewed.** `obsValid: true` means the record passed review. Use `includeProvisional: false` (default) for cleaner data; set to `true` if you want fresher but unreviewed sightings.
- **Rate limiting.** Be conservative with requests. Don't loop over all counties in a country in a tight loop.
- **Deprecated fields.** Any field with `ID` in ALL CAPS (e.g., `locID`, `subID`) is deprecated. Prefer lowercase alternatives (`locId`, `subId`).

---

## Error Handling

```python
import requests

def get(path, params=None):
    try:
        r = requests.get(
            f"https://api.ebird.org/v2{path}",
            headers={"x-ebirdapitoken": os.environ["EBIRD_API_KEY"]},
            params=params,
            timeout=30  # always set a timeout — eBird can occasionally hang
        )
        r.raise_for_status()
        return r.json()
    except requests.exceptions.Timeout:
        raise RuntimeError("eBird API timed out")
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"eBird API error {r.status_code}: {r.text}") from e
```

Common HTTP errors:
- `400` — Bad request (invalid param)
- `403` — Missing or invalid API key
- `404` — Region/species code not found

---

## Useful Links

- **Official docs (Postman):** https://documenter.getpostman.com/view/664302/S1ENwy59
- **Get an API key:** https://ebird.org/api/keygen
- **Python wrapper:** `pip install ebird-api` → https://pypi.org/project/ebird-api/
- **eBird taxonomy info:** https://science.ebird.org/en/use-ebird-data/the-ebird-taxonomy
- **Terms of use:** https://www.birds.cornell.edu/home/ebird-data-access-terms-of-use/
