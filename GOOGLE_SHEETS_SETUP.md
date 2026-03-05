# Google Sheets Setup Guide

How to create and connect the three data sheets to the OOS graphs.

---

## 1. Create the sheets

Create three separate Google Sheets — one per service:

| Sheet | Used by |
|---|---|
| Music Therapy OOS | `music_therapy_oos_graph.html` |
| Art Therapy OOS | `art_therapy_oos_graph.html` |
| Spiritual Care OOS | `spiritual_care_oos_graph.html` |

---

## 2. Set up the column structure

Each sheet must use **exactly these column headers in row 1**:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Year | Month | New | Review | Total | Notes |

Rules:
- **Year** — four-digit year, e.g. `2025`
- **Month** — three-letter abbreviation: `Jan`, `Feb`, `Mar`, `Apr`, `May`, `Jun`, `Jul`, `Aug`, `Sep`, `Oct`, `Nov`, `Dec`
- **New** — number of new sessions. Leave blank if unknown.
- **Review** — number of review sessions. Leave blank if unknown.
- **Total** — total sessions for the month. Always fill this in.
- **Notes** — free text, ignored by the graph.

Example rows:

```
Year  Month  New  Review  Total  Notes
2024  Jul    36            36
2025  Jan    7             7
2025  Jul    3    21       24
```

---

## 3. Publish the sheet as CSV

Each sheet needs to be published so the graph can read it.

1. Open the sheet in Google Sheets
2. Go to **File → Share → Publish to web**
3. In the first dropdown, select the sheet tab (e.g. "Sheet1")
4. In the second dropdown, select **Comma-separated values (.csv)**
5. Click **Publish** and confirm
6. Copy the URL that appears — it will look like:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/pub?gid=SHEET_GID&single=true&output=csv
   ```

---

## 4. Paste the URL into the graph file

Open the relevant HTML file and find this line near the top of the `<script>` section:

```javascript
const SHEET_CSV_URL = ""; // paste published CSV URL here
```

Paste the CSV URL between the quotes:

```javascript
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/YOUR_ID/pub?gid=0&single=true&output=csv";
```

Repeat for each of the three HTML files with their respective sheet URLs.

---

## 5. Test it

Open the HTML file in a browser. The graph should load data from the sheet automatically. If it shows an error, check:

- The sheet is published (step 3)
- The URL is pasted correctly with no extra spaces
- The column headers match exactly (case-sensitive): `Year`, `Month`, `New`, `Review`, `Total`

Use the **Refresh** button on the graph to reload data without reopening the page.

---

## Updating data going forward

See `NANCY_GUIDE.md` for the day-to-day update process — it's just adding a row to the sheet.
