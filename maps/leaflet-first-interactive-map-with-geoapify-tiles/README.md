# Leaflet First Interactive Map with Geoapify Tiles

Build your first interactive web map using Leaflet and Geoapify raster tiles, with markers, popups, and click interaction.

## Quick Summary

- Problem: Create an interactive map with markers and user interaction from scratch.
- Solution: Use Leaflet with Geoapify raster tiles, add a draggable marker with popup, and display click coordinates.
- Stack: HTML, CSS, JavaScript, Leaflet.
- APIs: Geoapify Map Tiles API.

## What This Example Includes

- Leaflet map initialization with Geoapify raster tiles
- Retina/HiDPI display support for crisp tiles
- Interactive marker with popup
- Click-to-move marker functionality
- Coordinate display on click
- Scale control (metric and imperial)
- Source-based run from `src/index.html` (no build step)

## Use Cases

- Learn the basics of Leaflet with Geoapify tiles.
- Build a simple location picker or point-of-interest viewer.
- Create a starting point for more complex map applications.

## Live Demo

[![Open in CodePen](https://img.shields.io/badge/Open%20in-CodePen-000000?style=for-the-badge&logo=codepen&logoColor=white)](https://codepen.io/geoapify/pen/XJXRXby)

## Screenshot

![Leaflet First Interactive Map Screenshot](./screenshots/leaflet-first-interactive-map-with-geoapify-tiles-screenshot.png)

## Quick Start

Open [`src/index.html`](./src/index.html) in your browser.

No local server is required.

Note: In rare cases, browser policies or extensions can restrict `file://` access. If that happens, run a local static server and open `src/index.html` via `http://localhost`, or use your IDE's "Open with Live Server" (or similar) option.

## Input and Output

- Input: Map container element, center coordinates, zoom level, Geoapify API key.
- Output: Interactive raster map with marker, popup, scale control, and click coordinate display.

## Project Structure

| File | Purpose |
|------|---------|
| `src/index.html` | Source HTML |
| `src/script.js` | Source JavaScript (map init, marker, click handler) |
| `src/style.css` | Source CSS |

## Code Samples

### Minimal HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Leaflet + Geoapify</title>
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

const map = L.map("map").setView([51.505, -0.09], 13);

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

const marker = L.marker([51.505, -0.09]).addTo(map);
marker.bindPopup("<b>Hello, Leaflet!</b>").openPopup();

map.on("click", (e) => {
  marker.setLatLng(e.latlng).bindPopup(`${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`).openPopup();
});
```

## Customize

1. Open [`src/script.js`](./src/script.js).
2. Set your own API key in `yourAPIKey`.
3. Change map center in `setView([lat, lon], zoom)`.
4. Replace `osm-bright-grey` in tile URLs with another Geoapify style.
5. Modify marker popup content in `bindPopup()`.

API documentation:
- [Geoapify Map Tiles API](https://apidocs.geoapify.com/docs/maps/map-tiles/)

No build step is required. Edit files in `src/` and refresh the browser.

## Troubleshooting

| Problem | Likely Cause | What to Do |
|---------|--------------|------------|
| Map is blank or tiles missing | Leaflet CSS/JS failed to load | Open browser DevTools (`Console` + `Network`) and confirm CDN files load without errors. |
| Map does not load data / API responds `403` | API key is invalid, restricted, or over limits | Get your own free key at `https://myprojects.geoapify.com/`, then update `yourAPIKey` in `src/script.js`. |
| Works inconsistently from local file | Browser policy blocks some `file://` behavior | Open with IDE Live Server (or any local static server) and run from `http://localhost`. |
| Output differs from expected | Local edits introduced a regression | Compare your files with the [CodePen demo](https://codepen.io/geoapify/pen/XJXRXby) and align differences step by step. |

## APIs and Libraries

| Type | Name | Link | API Endpoint Used |
|------|------|------|-------------------|
| API | Geoapify Map Tiles API | [Map Tiles API](https://www.geoapify.com/map-tiles/) | `https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey=...` |
| Library | Leaflet | [leafletjs.com](https://leafletjs.com/) | Not applicable |

## Related Examples

| Example | Description | Link |
|---------|-------------|------|
| Leaflet OSM Tiles | Leaflet map with raster OSM tiles (minimal) | [Open](../leaflet-map-with-osm-map-tiles-by-geoapify) |
| Leaflet Vector Tiles | Leaflet with vector tiles via MapLibre plugin | [Open](../leaflet-vector-map-tiles-geoapify-maplibre-plugin) |
| MapLibre Starter | MapLibre GL JS with Geoapify vector tiles | [Open](../maplibre-geoapify-map-tiles-starter) |
| OpenLayers Map | OpenLayers with Geoapify raster tiles | [Open](../openlayers-first-interactive-map-with-geoapify-tiles) |

## Useful Links

- Geoapify API docs: [https://apidocs.geoapify.com/](https://apidocs.geoapify.com/)
- CodePen demo: [https://codepen.io/geoapify/pen/XJXRXby](https://codepen.io/geoapify/pen/XJXRXby)
- Geoapify CodePen profile: [https://codepen.io/geoapify](https://codepen.io/geoapify)

## License

MIT

**Keywords**: Leaflet tutorial, Geoapify tiles, interactive map, JavaScript map example, raster tiles, marker popup, click coordinates
