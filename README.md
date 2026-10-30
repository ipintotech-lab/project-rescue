# project-rescue
Rescue map and cordoned rescue teams

## First Light mock (presentation demo)

A simulated, offline demo of the SAR Multi-Team Platform. Run it with `npm start`, then open http://localhost:3000.

- **Site:** a 600 × 360 m block of Los Corales, Caraballeda, La Guaira, Venezuela, around a street corner shown in news photos of the collapse, after the M7.2 and M7.5 earthquakes of 24 Jun 2026. The streets and building footprints are real, from OpenStreetMap. Building damage grades are real, from Copernicus EMS EMSR884 (6 Jul 2026). Both are credited on the map and in the plans.
- **What is simulated:** the response unit (MIA-1, airlifted from Miami, with T+ counted from its arrival), the teams, sensor indications, conflicts, hazards and access routes. Focus buildings are labelled B1–B6 rather than by their real names, and every indication is prefixed "Simulated ·".
- **Views:** National readiness, Event workspace (Map / Drone media / Building plans / Digital twin), Teams & coordination, Scenario.
- **Presenter keys:**
  - `→` / `Space` next step, `←` previous step.
  - `Home` restarts the demo.
  - `P` toggles present mode, `F` toggles fullscreen, `Esc` exits.
- **Imagery:**
  - Upload before/after images under the map. They must be top-down, north up and cropped to the mapped area, so footprints, sectors and routes line up.
  - Upload oblique drone photos or video in Drone media. These are shown without overlays.
  - Set each image's source, capture time and verification status (Unverified, Confirmed by team, Superseded). Empty slots show a labelled placeholder.
  - Uploads stay in that browser (IndexedDB) and are never sent to the server. Use only footage you have rights to, not news imagery.
  - To ship images with the demo instead, set `images.before` and `images.after` in `dist/scenario.json` to paths of 1000×600 images.
- **Evidence labels:** every item is marked as one of three classes:
  - **Observed:** from sensors or imagery.
  - **Human report:** from teams on the ground, including hazards and routes.
  - **AI suggestion:** computed and unverified, such as search priority and the Phase 2 score.
  
  Imagery is never used to claim that people are trapped, that a route is safe or that a structure is stable.
- **Building plans** is an exploded view: the street plan at the base and every floor of the chosen building stacked above it. It can be saved as PNG or SVG.
- **Saved scenarios:** a scenario saved earlier in the Scenario tab overrides the default. Click "Reset to default" there to get Caraballeda back.
