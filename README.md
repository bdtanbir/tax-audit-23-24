# tax-audit-23-24

A one-page Vue app to check whether a TIN is on the tax audit selection list
for **assessment year 2023-2024, Sylhet zone** (562 TINs, 22 tax circles).

## Features

- **Single TIN check** – type a 12-digit TIN (Bangla or English digits, spaces/dashes allowed) and see instantly if it is on the list, with circle and serial number
- **Bulk check** – paste many TINs at once and export the matches as CSV
- **By tax circle** – count per circle, click to filter
- **Full list** – search by any part of a TIN, filter by circle, sort, copy, export CSV
- Mobile friendly, light and dark mode

## Run locally

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

## Data

The list lives in `src/data/tins.json`, extracted from the published PDF.
This is an unofficial helper tool — please confirm with your tax circle office.
