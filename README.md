# RESQ.AI — Operation Lost Signal

TECHUTSAV Build in a Box academic prototype for a coordinator reviewing six fictional missing-trekker cases. Not a certified rescue system.

Live demo: https://resq-ai-web-production.up.railway.app/

## Setup
Requires Node.js 22+. No dependencies or API keys.
Run npm start and open http://localhost:8080. Run npm test for 20 tests.

## Features
Explainable urgency rankings, six profiles, confidence and illustrative search radius, interactive sectors, clue review, weather rehearsal, human-confirmed assignments, status updates, activity history, JSON export, Commander Brief and attention filter.

## Architecture
public/app.js handles workspace and browser persistence. public/engine.js validates scenarios and checks assignments. public/mission-engine.js computes assessments, rankings, team eligibility and what-if comparisons. public/mission-ui.js renders screens; public/mission-actions.js validates updates. public/bonus.js generates handover summaries. Edit public/scenarios/lost-signal.json for fictional mission data, teams, hazards, constraints and weights. server.mjs serves public files using PORT or 8080. Dockerfile supports Railway.

## Model and limitations
Urgency combines normalized medical, battery, staleness and weather-exposure factors plus an age-sensitive reviewed-SOS bonus, capped at 100. Signal quality affects location confidence and sector ranking. Sector scores combine urgency, evidence and access. In-app breakdowns explain contributions. Availability, capabilities, kits and configured risk/travel/daylight limits gate assignment.

Positions, travel times, hazard multipliers, confidence and radius are illustrative assumptions. No live GPS, satellite, weather API or real dispatch. Each browser stores a separate workspace; updates are not shared. Offline reload requires a successful first visit and browser support. Export JSON preserves raw workspace data; computed scores are displayed in-app and summarized in Commander Brief. Local history is not tamper-proof auditing.

## Demo
Inspect a profile and breakdown; update battery with a note; submit and review a fictional clue; compare severe storm; confirm an eligible assignment; show history and copy Commander Brief.

## Provenance
Challenge: https://boxuser.vercel.app/. A configurable foundation was prepared before the event and adapted to the six-profile brief during the event. AI assistance was used. Disclose reuse and follow organizer rules. Git history begins with this snapshot and does not reconstruct earlier development.
