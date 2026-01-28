# RTOScope Web Dashboard

Real-time scheduling dashboard for the RTOScope Unity flight simulator.  
This web app visualizes the simulator's RTOS kernel state and task scheduling in a compact, terminal-style UI. The Unity project already documents the simulator itself; this repo focuses on the live web dashboard.

## Features
- Live kernel status: scheduler, ticks, virtual time, CPU utilization, idle time, ready queue, context switches, current task
- Task table with priority, step progress, period, CPU usage, and deadline miss count
- Gantt chart of recent execution history (last 10 seconds) with color-coded legend
- Lightweight, no framework, single-page UI

## Tech Stack
- Frontend: Vanilla HTML/CSS/JS (`public/`)
- Backend: Minimal Node.js HTTP server (`server.js`)

## Run Locally
1) Install Node.js 18+  
2) Start the server:
```bash
node server.js
```
3) Open the dashboard:
```
http://localhost:8080
```

## Data Flow
- Unity (or any client) POSTs JSON to `POST /ingest`
- The dashboard polls `GET /status` every 200ms and updates the UI

Example payload shape (simplified):
```json
{
  "schedulerName": "Priority",
  "state": "Running",
  "ticks": 12345,
  "virtualTime": 12.345,
  "cpuUtilization": 67.8,
  "idleTime": 1.234,
  "readyTaskCount": 6,
  "contextSwitchCount": 987,
  "currentTaskName": "FlightControlTask",
  "tasks": [
    {
      "name": "FlightControlTask",
      "state": "Running",
      "priority": 0,
      "currentStep": 2,
      "totalSteps": 4,
      "periodMs": 10,
      "cpuUsage": 12.3,
      "missCount": 0
    }
  ],
  "idle": { "name": "IdleTask", "state": "Ready" }
}
```

## Project Structure
```
public/
  index.html      # Dashboard layout
  styles.css      # Terminal-style UI
  app.js          # Polling + render + Gantt chart
server.js         # HTTP server + ingest/status endpoints
```

## License
Educational project for KAIST Mad Camp 2025 Winter (Week 3).
