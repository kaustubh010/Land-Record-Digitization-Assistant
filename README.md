
🗺️ Land Record Digitization Assistant
======================================

**GeoJSON-Based Reconciliation System**

A web-based land record reconciliation system that links **GeoJSON parcel maps** with **textual ownership records** to detect inconsistencies, allow controlled edits, and maintain a complete audit trail.

This project demonstrates how spatial data and record data—maintained independently—can be reconciled programmatically and visualized interactively.
## Demo
[![🎥 Watch the Demo Video](https://img.youtube.com/vi/fZ6wJCYmu8k/maxresdefault.jpg)](https://www.youtube.com/watch?v=fZ6wJCYmu8k)

1️⃣ System Overview
-------------------

Land records are represented in two independent datasets:

1.  **Spatial Parcel Data** Stored as **GeoJSON (data.json)**, containing:
    *   Parcel geometry
    *   Plot ID
    *   Owner name (map-side)
    *   Area calculated from map

2.  **Textual Ownership Records** Stored in a **PostgreSQL database** via Prisma ORM, containing:
    *   Plot ID
    *   Owner name (record-side)
    *   Recorded area
    *   User attribution
    *   Edit history

The system compares these datasets to:
*   Detect mismatches
*   Visualize discrepancies on a map
*   Allow authorized corrections
*   Log every change for audit purposes

2️⃣ Spatial Data Format (GeoJSON)
---------------------------------

### 📂 data.json

Spatial data is provided as a **GeoJSON FeatureCollection**.

### Feature Structure

```json
{
  "type": "Feature",
  "properties": {
    "fid": 1,
    "plot_id": "1",
    "owner_name_map": "Amit",
    "area_map": 0.3910684714208958
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [ ... ]
  }
}
```

### Used Fields

| Field | Description |
|---|---|
| plot_id | Unique plot number (linking key) |
| owner_name_map | Owner name as per map |
| area_map | Area derived from parcel geometry |
| geometry | Parcel boundary polygon |

This file is loaded directly by the frontend map and backend reconciliation logic.

3️⃣ Database Schema (Prisma)
----------------------------

### 👤 User

Stores authenticated users performing uploads or edits.

```text
User
- id
- email
- name
- picture
- createdAt
- updatedAt
```

Users are linked to:
*   Uploaded parcel records
*   Change logs

### 📄 Parcel (Textual Ownership Record)

Represents **official record-side data**.

```text
Parcel
- id
- plotId
- ownerName
- areaRecord
- userId
- createdAt
- updatedAt
```

Constraints:
*   Unique per user + plot ID
*   Indexed for fast search

This table is populated via CSV upload or manual entry.

### ✏️ ChangeLog (Audit Trail)

Tracks **every modification** to parcel records.

```text
ChangeLog
- id
- parcelId
- userId
- action
- fieldName
- oldValue
- newValue
- description
- createdAt
```

Used for:
*   Traceability
*   Accountability
*   Audit verification

4️⃣ Reconciliation Logic
------------------------

Reconciliation is performed by **matching plot_id** across:
*   GeoJSON features (data.json)
*   Parcel records (Parcel table)

### Detected Conditions

| Condition | Description |
|---|---|
| Missing in records | Plot exists in GeoJSON but not in DB |
| Missing in map | Plot exists in DB but not in GeoJSON |
| Area mismatch | area_map ≠ area_record beyond threshold |
| Owner mismatch | owner_name_map ≠ owner_name |

Detected issues are surfaced in:
*   Map visualization
*   Reconciliation reports
*   Parcel detail views

5️⃣ Map Visualization Rules
---------------------------

Parcels are color-coded based on reconciliation status:

| Color | Meaning |
|---|---|
| 🟢 Green | Fully matched |
| 🔴 Red | Mismatch detected |
| ⚪ Gray | Missing data |

Clicking a parcel shows:
*   Map-side values
*   Record-side values
*   Differences

6️⃣ API Overview
----------------

### 🔍 Search Parcel

`GET /api/search?plot_id=1`

*   Locates parcel by plot ID
*   Highlights it on the map
*   Returns reconciliation status

### 📄 Fetch Parcel Details

`GET /api/parcels/{plotId}`

Returns:

```json
{
  "plotId": "1",
  "owner_map": "Amit",
  "owner_record": "Amit Kumar",
  "area_map": 0.391,
  "area_record": 0.36,
  "status": "AREA_MISMATCH"
}
```

### 📤 Upload Records (CSV)

`POST /api/parcels/upload`

Expected columns:
*   plot_id
*   owner_name
*   area

Triggers reconciliation after upload.

### ✏️ Edit Parcel Record

`PUT /api/parcels/{plotId}`

```json
{
  "ownerName": "Amit",
  "areaRecord": 0.39
}
```

✔ Automatically logged in ChangeLog

7️⃣ Sample Reconciliation Report
--------------------------------

### 📊 Summary

| Metric | Count |
|---|---|
| Total map plots | 150 |
| Total record plots | 142 |
| Fully matched | 120 |
| Area mismatches | 18 |
| Missing in records | 12 |
| Missing in map | 10 |

### ⚠️ Discrepancy List (Example)

| Plot ID | Issue | Map Value | Record Value |
|---|---|---|---|
| 1 | Area mismatch | 0.391 | 0.360 |
| 12 | Missing record | Exists | — |
| 45 | Owner mismatch | Suresh | Ramesh |

8️⃣ User Guide (For Officials)
------------------------------

### Step 1: Open Map
*   View all village plots
*   Use colors to identify issues

### Step 2: Search Plot
*   Enter plot number
*   System zooms to parcel

### Step 3: Review Differences
*   Compare map vs record values
*   Understand discrepancy type

### Step 4: Correct Record (Authorized)
*   Update owner or area
*   Save changes

### Step 5: Audit
*   View change history
*   Verify who edited what and when

9️⃣ Intended Scope
------------------

This project is designed as:
*   A **working MVP**
*   A **proof-of-concept for land digitization**
*   A **foundation for scalable land governance systems**

It demonstrates how **GeoJSON-based spatial data** and **database-backed ownership records** can be reconciled safely, transparently, and efficiently.
