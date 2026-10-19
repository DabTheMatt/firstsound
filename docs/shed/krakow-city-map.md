# SHED CITY 01 — Kraków Old Town map

The CITY scene reads one checked-in file, `src/shed/city/krakowOldTown.json`. The page does not call a map service and does not need an API key.

## Source

- Dataset: OpenStreetMap
- Retrieved: 2026-10-19
- OSM base timestamp in the extract: 2026-10-19T20:29:21Z
- Endpoint used once, while building the file: `https://overpass.openstreetmap.fr/api/interpreter`
- License: Open Database License 1.0 — https://opendatacommons.org/licenses/odbl/1-0/
- Attribution required in the interface: © OpenStreetMap contributors
- https://www.openstreetmap.org/copyright

## Coverage

Kraków Old Town, primarily the area enclosed by Planty.

Bounding box of the Overpass extract (west, south, east, north): `19.9275, 50.0564, 19.9472, 50.0672`.

Named geometry kept from that extract:

- Rynek Główny
- Mały Rynek and Plac Mariacki
- Sukiennice
- Bazylika Mariacka (St. Mary’s Basilica)
- Brama Floriańska
- Wieża Ratuszowa
- Kościół św. Wojciecha
- Floriańska, Grodzka, and the other named streets whose midpoint lies inside the Planty hull
- The Planty park polygon (OSM way 1221128266)

## Processing

`scripts/build-krakow-map.mjs` is the reproducible build. It is not part of the page load or the production bundle step.

1. Download ways for highways, the Planty park, squares, places of worship, historic gates, and building footprints.
2. Project WGS84 longitude and latitude into local equirectangular meters. Origin longitude 19.931, latitude 50.0668. X grows east. Y grows south so it matches SVG.
3. Simplify with Douglas–Peucker: streets 2.2 m, Planty 3.5 m, footprints 1.4 m.
4. Keep a feature when its midpoint is inside the convex hull of Planty.
5. Choose a small set of virtual plots from real building footprints. Geographic seeds only decide which footprint is eligible. The ring stored for a plot is the simplified OSM way.
6. Reject a footprint when it meets a street centerline, a public square, or a protected landmark footprint (Sukiennice, St. Mary’s, St. Florian’s Gate, the Town Hall Tower, St. Adalbert’s), or when it is a church, university, or other named institution.

Plot ids (`plot-01`, …) are prototype ids. They are not cadastral parcel numbers. The interface says so.

## Scene coordinates

Persistent building position is a `plotId`. The plot’s geometry stays in map meters. The camera pan and zoom are a transform around the sheet and are not written into the city document.
