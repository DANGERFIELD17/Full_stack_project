# Local Community Problem Reporting System

A lightweight full-stack web application for reporting local community issues.

## Features
- Submit a new problem report (title, description, location, category)
- View all submitted reports in a live dashboard
- Update report status (open, inProgress, resolved) from the UI
- Filter reports by status, category, and text search
- View real-time report stats (total, open, inProgress, resolved)
- Server-side validation for required fields, category values, and field lengths

## API overview
- `GET /api/reports`: List reports
- `GET /api/reports?status=open&category=road&q=street`: Filter reports
- `GET /api/reports/:id`: Get a specific report
- `GET /api/reports/stats`: Get report counts by status
- `POST /api/reports`: Create a report
- `PATCH /api/reports/:id/status`: Update report status

## Run locally
```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Run tests
```bash
npm test
```
