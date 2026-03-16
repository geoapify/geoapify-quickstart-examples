# Visualizing GeoJSON Routes with Leaflet and Geoapify Routing API

Fetch routes from Geoapify Routing API and render them on a Leaflet map with turn-by-turn instructions, waypoint markers, and summary information.

## Quick Summary

- Problem: Display driving directions with route geometry and turn-by-turn navigation.
- Solution: Use Geoapify Routing API to get route GeoJSON, render with Leaflet, and display instructions.
- Stack: HTML, CSS, JavaScript, Leaflet.
- APIs: Geoapify Routing API, Geoapify Marker Icon API, Geoapify Map Tiles API.

## What This Example Includes

- Leaflet map with Geoapify raster tiles
- Routing API call with multiple waypoints
- GeoJSON route rendering with shadow effect
- Turn-by-turn instruction list
- Distance and time summary
- Custom waypoint markers (start, via, end)
- Source-based run from `src/index.html` (no build step)

## Use Cases

- Build driving directions interface with step-by-step instructions.
- Display route previews with distance and duration estimates.
- Learn how to parse and render Routing API responses.

## Live Demo

[![Open in CodePen](https://img.shields.io/badge/Open%20in-CodePen-000000?style=for-the-badge&logo=codepen&logoColor=white)](https://codepen.io/geoapify/pen/ogbyJeN)

## Screenshot

![Route Visualization Screenshot](./screenshots/visualizing-geojson-routes-with-leaflet-and-geoapify-routing-api-screenshot.png)

## Quick Start

Open [`src/index.html`](./src/index.html) in your browser.

No local server is required.

Note: In rare cases, browser policies or extensions can restrict `file://` access. If that happens, run a local static server and open `src/index.html` via `http://localhost`, or use your IDE's "Open with Live Server" (or similar) option.

## Input and Output

- Input: Waypoint coordinates (lat,lon pairs), travel mode, Geoapify API key.
- Output: Interactive map with route line, waypoint markers, turn-by-turn instructions, distance/time summary.

## Project Structure

| File | Purpose |
|------|---------|
| `src/index.html` | Source HTML |
| `src/script.js` | Source JavaScript (routing API call, rendering logic) |
| `src/style.css` | Source CSS |

## Code Samples

### Minimal HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Route Visualization</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <style>
    #map { height: 500px; }
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

const map = L.map("map").setView([52.52, 13.405], 11);
L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${yourAPIKey}`).addTo(map);

map.createPane("route-shadow");
map.getPane("route-shadow").style.zIndex = 399;

const waypoints = "52.5,13.3|52.55,13.5";
fetch(`https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=${yourAPIKey}`)
  .then((r) => r.json())
  .then((data) => {
    if (!data.features?.[0]) return;
    L.geoJSON(data.features[0], { pane: "route-shadow", style: { color: "#000", opacity: 0.25, weight: 10 } }).addTo(map);
    L.geoJSON(data.features[0], { style: { color: "#1976d2", weight: 5 } }).addTo(map);
    
    const startIcon = L.icon({ iconUrl: `https://api.geoapify.com/v2/icon/?type=awesome&color=%230f9d58&icon=map-pin&apiKey=${yourAPIKey}`, iconSize: [36, 53], iconAnchor: [18, 48] });
    L.marker([52.5, 13.3], { icon: startIcon }).addTo(map);
  });
```

## Customize

1. Open [`src/script.js`](./src/script.js).
2. Set your own API key in `yourAPIKey`.
3. Modify the `routingUrl` waypoints for different locations.
4. Change `mode=drive` to `walk`, `bicycle`, or `transit`.
5. Adjust route styling in `drawRoute()` function.

API documentation:
- [Geoapify Routing API](https://apidocs.geoapify.com/docs/routing/)
- [Geoapify Map Tiles API](https://apidocs.geoapify.com/docs/maps/map-tiles/)
- [Geoapify Marker Icon API](https://apidocs.geoapify.com/docs/icon/)

No build step is required. Edit files in `src/` and refresh the browser.

## Troubleshooting

| Problem | Likely Cause | What to Do |
|---------|--------------|------------|
| Map is blank or tiles missing | Leaflet CSS/JS failed to load | Open browser DevTools (`Console` + `Network`) and confirm CDN files load without errors. |
| Map does not load data / API responds `403` | API key is invalid, restricted, or over limits | Get your own free key at `https://myprojects.geoapify.com/`, then update `yourAPIKey` in `src/script.js`. |
| Works inconsistently from local file | Browser policy blocks some `file://` behavior | Open with IDE Live Server (or any local static server) and run from `http://localhost`. |
| Output differs from expected | Local edits introduced a regression | Compare your files with the [CodePen demo](https://codepen.io/geoapify/pen/ogbyJeN) and align differences step by step. |

## APIs and Libraries

| Type | Name | Link | API Endpoint Used |
|------|------|------|-------------------|
| API | Geoapify Routing API | [Routing API](https://www.geoapify.com/routing-api/) | `https://api.geoapify.com/v1/routing?waypoints=...&mode=drive&apiKey=...` |
| API | Geoapify Marker Icon API | [Marker Icon API](https://www.geoapify.com/map-marker-icon-api/) | `https://api.geoapify.com/v2/icon/?type=awesome&...` |
| API | Geoapify Map Tiles API | [Map Tiles API](https://www.geoapify.com/map-tiles/) | `https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey=...` |
| Library | Leaflet | [leafletjs.com](https://leafletjs.com/) | Not applicable |

## Related Examples

| Example | Description | Link |
|---------|-------------|------|
| Route Styling Leaflet | Interactive route styling controls | [Open](../route-visualization-leaflet-styling) |
| Route Drag Edit | Add via points by dragging the route | [Open](../route-drag-edit-leaflet) |
| Multiple Routes | Visualize multiple routes with offset | [Open](../multiple-routes-leaflet-polylineoffset) |

## Useful Links

- Geoapify API docs: [https://apidocs.geoapify.com/](https://apidocs.geoapify.com/)
- CodePen demo: [https://codepen.io/geoapify/pen/ogbyJeN](https://codepen.io/geoapify/pen/ogbyJeN)
- Geoapify CodePen profile: [https://codepen.io/geoapify](https://codepen.io/geoapify)

## License

MIT

**Keywords**: Geoapify Routing API, Leaflet route, GeoJSON visualization, turn-by-turn directions, driving route, waypoint markers
