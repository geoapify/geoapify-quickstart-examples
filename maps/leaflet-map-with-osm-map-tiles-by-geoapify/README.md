# Leaflet Map with OSM Map Tiles by Geoapify

A minimal Leaflet map using Geoapify OSM raster tiles with retina support.

## Quick Summary

- Problem: Display an OSM-style map quickly with Leaflet.
- Solution: Load Geoapify raster tiles with automatic retina detection.
- Stack: HTML, CSS, JavaScript, Leaflet.
- APIs: Geoapify Map Tiles API.

## What This Example Includes

- Leaflet map initialization
- Geoapify OSM-style raster tile layer
- Automatic retina/HiDPI tile selection
- Proper attribution setup
- Source-based run from `src/index.html` (no build step)

## Use Cases

- Bootstrap a new Leaflet project with OSM-style tiles.
- Learn the basics of raster tile integration.
- Use as a base layer for adding markers, routes, or overlays.

## Live Demo

[![Open in CodePen](https://img.shields.io/badge/Open%20in-CodePen-000000?style=for-the-badge&logo=codepen&logoColor=white)](https://codepen.io/geoapify/pen/gbadJzb)

## Screenshot

![Leaflet Map with OSM Tiles Screenshot](./screenshots/leaflet-map-with-osm-map-tiles-by-geoapify-screenshot.png)

## Quick Start

Open [`src/index.html`](./src/index.html) in your browser.

No local server is required.

Note: In rare cases, browser policies or extensions can restrict `file://` access. If that happens, run a local static server and open `src/index.html` via `http://localhost`, or use your IDE's "Open with Live Server" (or similar) option.

## Input and Output

- Input: Map container element, center coordinates, zoom level, Geoapify API key.
- Output: Interactive raster map with OSM-style tiles.

## Project Structure

| File | Purpose |
|------|---------|
| `src/index.html` | Source HTML |
| `src/script.js` | Source JavaScript (map init, tile layer) |
| `src/style.css` | Source CSS |

## Code Samples

### Minimal HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Leaflet OSM Tiles</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    html, body { height: 100%; margin: 0; }
    #map { height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="script.js"></script>
</body>
</html>
```

### Minimal JavaScript

```js
// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "YOUR_API_KEY";

const map = L.map("map").setView([40.760189, -111.892655], 12);

const isRetina = L.Browser.retina;
L.tileLayer(
  isRetina
    ? "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}@2x.png?apiKey={apiKey}"
    : "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey={apiKey}",
  {
    attribution: 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | © OpenMapTiles © OpenStreetMap',
    apiKey: yourAPIKey,
    maxZoom: 20
  }
).addTo(map);
```

## Customize

1. Open [`src/script.js`](./src/script.js).
2. Set your own API key in `yourAPIKey`.
3. Change map center in `setView([lat, lon], zoom)`.
4. Replace `osm-bright-grey` with another style (e.g., `osm-bright`, `dark-matter`, `positron`).

API documentation:
- [Geoapify Map Tiles API](https://apidocs.geoapify.com/docs/maps/map-tiles/)

No build step is required. Edit files in `src/` and refresh the browser.

## Troubleshooting

| Problem | Likely Cause | What to Do |
|---------|--------------|------------|
| Map is blank or tiles missing | Leaflet CSS/JS failed to load | Open browser DevTools (`Console` + `Network`) and confirm CDN files load without errors. |
| Map does not load data / API responds `403` | API key is invalid, restricted, or over limits | Get your own free key at `https://myprojects.geoapify.com/`, then update `yourAPIKey` in `src/script.js`. |
| Works inconsistently from local file | Browser policy blocks some `file://` behavior | Open with IDE Live Server (or any local static server) and run from `http://localhost`. |
| Output differs from expected | Local edits introduced a regression | Compare your files with the [CodePen demo](https://codepen.io/geoapify/pen/gbadJzb) and align differences step by step. |

## APIs and Libraries

| Type | Name | Link | API Endpoint Used |
|------|------|------|-------------------|
| API | Geoapify Map Tiles API | [Map Tiles API](https://www.geoapify.com/map-tiles/) | `https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey=...` |
| Library | Leaflet | [leafletjs.com](https://leafletjs.com/) | Not applicable |

## Related Examples

| Example | Description | Link |
|---------|-------------|------|
| Leaflet Interactive Map | Leaflet with markers and click interaction | [Open](../leaflet-first-interactive-map-with-geoapify-tiles) |
| Leaflet Vector Tiles | Leaflet with vector tiles via MapLibre plugin | [Open](../leaflet-vector-map-tiles-geoapify-maplibre-plugin) |
| MapLibre Starter | MapLibre GL JS with Geoapify vector tiles | [Open](../maplibre-geoapify-map-tiles-starter) |

## Useful Links

- Geoapify API docs: [https://apidocs.geoapify.com/](https://apidocs.geoapify.com/)
- CodePen demo: [https://codepen.io/geoapify/pen/gbadJzb](https://codepen.io/geoapify/pen/gbadJzb)
- Geoapify CodePen profile: [https://codepen.io/geoapify](https://codepen.io/geoapify)

## License

MIT

**Keywords**: Leaflet, OSM tiles, Geoapify raster tiles, JavaScript map, retina support, quickstart
