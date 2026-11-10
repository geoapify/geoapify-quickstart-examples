# Geoapify Places API Code Examples

Use Geoapify Places API examples to search points of interest by category, visualize places on maps, and build nearby place search interfaces.

## Overview

This folder contains browser-based JavaScript examples for Places API category search, nearest-place lookup, dynamic markers, and GeoJSON point rendering. Each example includes source code, a screenshot, and a focused README with setup notes and code samples.

## API Resources

[![Places API](https://img.shields.io/badge/-Places%20API-2f6fed?style=for-the-badge)](https://www.geoapify.com/places-api/)
[![Places docs](https://img.shields.io/badge/-Places%20docs-2e7d32?style=for-the-badge)](https://apidocs.geoapify.com/docs/places/)
[![Places playground](https://img.shields.io/badge/-Places%20playground-f57c00?style=for-the-badge)](https://apidocs.geoapify.com/playground/places/)

## Live Demo

Each CodePen demo is linked from the `Live Demo` column in the code examples table.

## Code Examples

| Screenshot | Example | Description | Source Code | Live Demo |
|------------|---------|-------------|-------------|-----------|
| <img src="./leaflet-demo-geoapify-places-api-category-search-with-dynamic-markers/screenshots/leaflet-demo-geoapify-places-api-category-search-with-dynamic-markers-screenshot.png" alt="Leaflet Places API category search with toggle controls and dynamic markers" width="220"> | Leaflet Demo: Geoapify Places API Category Search with Dynamic Markers | Search for places by multiple categories on map pan and zoom with toggle buttons, rate-limited requests, and dynamic markers. | [Open example](https://github.com/geoapify/geoapify-quickstart-examples/tree/main/places-api/leaflet-demo-geoapify-places-api-category-search-with-dynamic-markers/) | [CodePen](https://codepen.io/geoapify/pen/MYKRMBr) |
| <img src="./maplibre-nearest-restaurants-with-type-markers/screenshots/maplibre-nearest-restaurants-with-type-markers-screenshot.png" alt="MapLibre nearby restaurant finder with cuisine-based custom markers" width="220"> | Nearby Restaurant Search on a MapLibre Map with Geoapify Places API | Search the 20 nearest restaurants from a clicked map point and display cuisine-based custom markers with place details. | [Open example](https://github.com/geoapify/geoapify-quickstart-examples/tree/main/places-api/maplibre-nearest-restaurants-with-type-markers/) | [CodePen](https://codepen.io/geoapify/pen/emgBqMw) |
| <img src="./visualizing-geojson-points-with-leaflet-and-geoapify-places-api/screenshots/visualizing-geojson-points-with-leaflet-and-geoapify-places-api-screenshot.png" alt="Leaflet map showing GeoJSON points returned by the Geoapify Places API" width="220"> | Visualizing GeoJSON Points with Leaflet and Geoapify Places API | Fetch places by category from Geoapify Places API and display them as Leaflet markers with custom icons and popups. | [Open example](https://github.com/geoapify/geoapify-quickstart-examples/tree/main/places-api/visualizing-geojson-points-with-leaflet-and-geoapify-places-api/) | [CodePen](https://codepen.io/geoapify/pen/zxraMEp) |
| <img src="./maplibre-find-nearest-brand-stores-places-name-search/screenshots/maplibre-find-nearest-brand-stores-places-name-search-screenshot.png" alt="MapLibre map with the nearest Starbucks stores inside a 1 km search circle and a result list with distances" width="220"> | Find the Nearest Stores of a Brand | Search places by brand name with the Places API `name` parameter inside a chosen radius, with optional walking times from the Route Matrix API. | [Open example](https://github.com/geoapify/geoapify-quickstart-examples/tree/main/places-api/maplibre-find-nearest-brand-stores-places-name-search/) | [CodePen](https://codepen.io/editor/geoapify/pen/01a1c4f9-76ba-752a-806c-d070e041e359) |
| <img src="./maplibre-nearest-ev-charging-stations-connector-types/screenshots/maplibre-nearest-ev-charging-stations-connector-types-screenshot.png" alt="MapLibre map with the nearest EV charging stations and a list of their operators and connector types" width="220"> | Nearest EV Charging Stations and Connector Types | Find the nearest EV charging stations from a clicked point, list their operators and connector types, and optionally add driving times from the Route Matrix API. | [Open example](https://github.com/geoapify/geoapify-quickstart-examples/tree/main/places-api/maplibre-nearest-ev-charging-stations-connector-types/) | [CodePen](https://codepen.io/editor/geoapify/pen/01a1c50c-cb81-7565-b4e5-8f94a1e441bb) |

## Geoapify API Key

These examples include demo Geoapify API keys for quick testing. For your own project, create a free API key at [myprojects.geoapify.com](https://myprojects.geoapify.com/) and replace the example key in the relevant `src/script.js` file.

## APIs and Libraries

| Name | Description | Documentation | Used In This Example |
|------|-------------|---------------|----------------------|
| Geoapify Places API | Searches places and points of interest by category, name, geometry, radius, and proximity. | [Places API docs](https://apidocs.geoapify.com/docs/places/) | [Leaflet Category Search](./leaflet-demo-geoapify-places-api-category-search-with-dynamic-markers/), [Nearby Restaurant Search](./maplibre-nearest-restaurants-with-type-markers/), [Visualizing GeoJSON Points](./visualizing-geojson-points-with-leaflet-and-geoapify-places-api/), [Nearest Brand Stores](./maplibre-find-nearest-brand-stores-places-name-search/), [Nearest EV Charging Stations](./maplibre-nearest-ev-charging-stations-connector-types/) |
| Geoapify Route Matrix API | Calculates travel times and distances from one or more sources to many targets in one request. | [Route Matrix API docs](https://apidocs.geoapify.com/docs/route-matrix/) | [Nearest Brand Stores](./maplibre-find-nearest-brand-stores-places-name-search/) (walking), [Nearest EV Charging Stations](./maplibre-nearest-ev-charging-stations-connector-types/) (driving) |
| Geoapify Marker Icon API | Generates custom place markers and category icons. | [Marker Icon docs](https://apidocs.geoapify.com/docs/icon/) | [Leaflet Category Search](./leaflet-demo-geoapify-places-api-category-search-with-dynamic-markers/), [Nearby Restaurant Search](./maplibre-nearest-restaurants-with-type-markers/), [Visualizing GeoJSON Points](./visualizing-geojson-points-with-leaflet-and-geoapify-places-api/) |
| Geoapify Map Tiles API | Provides map styles and tiles for Leaflet and MapLibre examples. | [Map Tiles docs](https://apidocs.geoapify.com/docs/maps/map-tiles/) | [Leaflet Category Search](./leaflet-demo-geoapify-places-api-category-search-with-dynamic-markers/), [Nearby Restaurant Search](./maplibre-nearest-restaurants-with-type-markers/), [Visualizing GeoJSON Points](./visualizing-geojson-points-with-leaflet-and-geoapify-places-api/), [Nearest Brand Stores](./maplibre-find-nearest-brand-stores-places-name-search/), [Nearest EV Charging Stations](./maplibre-nearest-ev-charging-stations-connector-types/) |
| Leaflet | Renders interactive raster-tile maps and markers. | [Leaflet docs](https://leafletjs.com/) | [Leaflet Category Search](./leaflet-demo-geoapify-places-api-category-search-with-dynamic-markers/), [Visualizing GeoJSON Points](./visualizing-geojson-points-with-leaflet-and-geoapify-places-api/) |
| MapLibre GL JS | Renders interactive vector maps in browser examples. | [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/) | [Nearby Restaurant Search](./maplibre-nearest-restaurants-with-type-markers/), [Nearest Brand Stores](./maplibre-find-nearest-brand-stores-places-name-search/), [Nearest EV Charging Stations](./maplibre-nearest-ev-charging-stations-connector-types/) |

## Useful Links

- Geoapify API documentation: [https://apidocs.geoapify.com/](https://apidocs.geoapify.com/)
- Geoapify projects and API keys: [https://myprojects.geoapify.com/](https://myprojects.geoapify.com/)
- Geoapify CodePen examples: [https://codepen.io/geoapify](https://codepen.io/geoapify)
