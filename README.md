# Spatial Instruction Pilot — S1–S4

This static site is the participant-ready pilot controller for four 3D spatial-instruction scenarios plus one final neutral baseline trial. The root route is the participant launcher; the four study scenes live at `s1.html` through `s4.html`. No S5 is included.

## Participant flow

- `index.html` creates one anonymous participant ID and keeps it stable in browser storage.
- The S1–S4 order is deterministic and counterbalanced for that participant, so reloads and resumed sessions do not redraw assignments.
- S1–S4 always use their experimental manipulation. Cue target identity, cue side, and cue A/B label remain independently deterministic.
- One neutral equal-visibility baseline (`B0`) is always the fifth and final trial.
- The launcher resumes at the first unfinished trial and shows progress through all five trials.
- S1–S4 use the same Q1–Q4 wording, factor list, response-time fields, and completion behavior.

The four guaranteed manipulations are:

| Scene | Participant condition |
| --- | --- |
| S1 | Visibility history differs |
| S2 | Heading alignment differs |
| S3 | Full future-action instruction is present |
| S4 | Distance differs |
| B0 | Final equal-visibility neutral baseline |

## Local preview

Serve `dist` with a static web server and open the root route. For example:

```powershell
python -m http.server 4173 --directory dist
```

- Participant launcher: `http://127.0.0.1:4173/`
- Researcher launcher controls: `http://127.0.0.1:4173/?admin=1`
- Internal balance dashboard: `http://127.0.0.1:4173/dashboard.html`
- Individual scenes: `http://127.0.0.1:4173/s1.html` through `s4.html`

## Debug parameters

All four scenes accept the same researcher parameters:

- `debug=1` displays the resolved assignment.
- `condition=experimental|baseline` overrides the scenario condition.
- `cue=target-1|target-2` overrides the cue target identity.
- `side=left|right` overrides the cue target side.
- `label=A|B` overrides the cue target label.
- `pid=...` overrides the participant ID for a test run.
- `preview=1` opens the scene-specific researcher controls and implies debug mode.
- `save=1` explicitly allows a debug response to be stored. Debug responses are otherwise excluded.

Example:

```text
s2.html?debug=1&condition=baseline&cue=target-2&side=right&label=B
```

## Data and exports

The unified browser-storage key is `vln_pilot_v4`, with schema version `pilot-v4`. Each response records:

- anonymous participant ID and scenario;
- condition, cue target identity, cue side, cue label, and the non-cue mappings;
- Q1, Q2, Q3 free text, Q4 factors, and optional Other text;
- observation, response, and questionnaire timings;
- completion timestamp, debug status, and scene metrics.

JSON and CSV exports are available from the researcher launcher (`?admin=1`) and the dashboard. Researcher mode also exposes the new-participant control; these controls are hidden from the normal participant route. The dashboard reports condition counts, cue-side balance, A/B-label balance, cue-identity balance, completion counts, debug records, and cue-choice rates.

Browser storage is device-local. For multi-device data collection, export and merge files after each session or connect the same schema to a server-side endpoint before launch.

## Validation

Run the browser smoke test against a local server:

```powershell
node scripts/test-pilot.mjs http://127.0.0.1:4173
```

The scene capture helpers in `scripts/` use the standardized debug parameters and generate the existing validation artifacts for S2–S4.

Three.js is bundled with the static site, so scene startup does not depend on an external CDN.
