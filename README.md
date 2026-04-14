# Geoapify Quickstart Examples

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Ready-to-run code examples for **Geoapify Location Platform APIs**. Simple, frontend-focused demos that you can download and run immediately. Perfect for learning and prototyping.

## 🎯 Purpose

This repository provides **quickstart examples** for Geoapify APIs:
- ✅ **Simple & focused**: Each example demonstrates one concept
- ✅ **Ready to run**: Just open `src/index.html` in your browser
- ✅ **Well-documented**: Every example includes a README
- ✅ **SEO-friendly**: Easy to find via search engines

### How This Differs from Other Repositories

| Repository | Purpose | Complexity |
|------------|---------|------------|
| **geoapify-quickstart-examples** (this repo) | Simple source-based demos for learning | Beginner-friendly |
| [maps-api-code-samples](https://github.com/geoapify/maps-api-code-samples) | Production-ready examples with build tools | Intermediate/Advanced |

## 🚀 Quick Start

1. **Browse examples** below by category
2. **Clone or download** an example folder
3. **Open `src/index.html`** in your browser

No build tools, no server required, just double-click and run!

Note: In rare cases, browser policies or extensions can restrict `file://` access. If that happens, run a local static server and open `src/index.html` via `http://localhost`, or use your IDE's "Open with Live Server" (or similar) option.

## 📦 Examples by Category

### 🗺️ Maps (10 examples)

Map setup, tiles, visualization fundamentals, and utility demos.

| Example | Description | Library | APIs |
|---------|-------------|---------|------|
| [MapLibre Map Tiles Starter](./maps/maplibre-geoapify-map-tiles-starter) | Basic MapLibre GL map with Geoapify tiles | MapLibre GL | Map Tiles |
| [Leaflet OSM Tiles](./maps/leaflet-map-with-osm-map-tiles-by-geoapify) | Leaflet map with raster OSM tiles | Leaflet | Map Tiles |
| [Leaflet Vector Tiles](./maps/leaflet-vector-map-tiles-geoapify-maplibre-plugin) | Leaflet with vector tiles via MapLibre plugin | Leaflet | Map Tiles |
| [Understanding Map Zoom Levels](./maps/understanding-map-zoom-levels-and-the-xyz-tile-system) | Visual explanation of XYZ tile system | JavaScript | Map Tiles |
| [Lat/Lon to Pixels](./maps/maplibre-geoapify-lat-lon-to-pixels-with-map-project) | Convert coordinates to screen pixels | MapLibre GL | Map Tiles |
| [Country Geometry & Projection](./maps/maplibre-country-geometry-projection-drag) | Drag and project country boundaries | MapLibre GL | Map Tiles |
| [Leaflet First Map](./maps/leaflet-first-interactive-map-with-geoapify-tiles) | Basic Leaflet map setup | Leaflet | Map Tiles |
| [OpenLayers First Map](./maps/openlayers-first-interactive-map-with-geoapify-tiles) | Basic OpenLayers map setup | OpenLayers | Map Tiles |
| [Custom Markers & Popups](./maps/maplibre-custom-markers-popups-with-geoapify-place-details) | Rich place details in popups | MapLibre GL | Places API |
| [BBox Calculator](./maps/bbox-width-height-calculator-in-web-mercator-maplibre-geoapify) | Calculate bounding box dimensions | MapLibre GL | Map Tiles |

### 🚗 Routing API (10 examples)

Route calculation, visualization, and interactive routing features.

| Example | Description | Library | APIs |
|---------|-------------|---------|------|
| [Route Visualization - Leaflet](./routing-api/route-visualization-leaflet-styling) | Customize route appearance and markers | Leaflet | Routing API, Map Marker API |
| [Route Visualization - MapLibre](./routing-api/route-visualization-maplibre-gl-styling) | Route styling controls for MapLibre | MapLibre GL | Routing API, Map Marker API |
| [Multiple Routes - Leaflet](./routing-api/multiple-routes-leaflet-plain) | Display multiple route alternatives | Leaflet | Routing API |
| [Multiple Routes - Leaflet + Polyline Offset](./routing-api/multiple-routes-leaflet-polylineoffset) | Offset overlapping routes | Leaflet | Routing API |
| [Multiple Routes - Leaflet + Turf](./routing-api/multiple-routes-leaflet-turf-offset) | Offset routes using Turf.js | Leaflet | Routing API |
| [Multiple Routes - MapLibre](./routing-api/multiple-routes-maplibre-gl-visualization) | Multiple routes with MapLibre GL | MapLibre GL | Routing API |
| [Waypoints Collection](./routing-api/waypoints-collection-autocomplete-map) | Collect waypoints with autocomplete & drag | Leaflet | Routing API, Geocoding API |
| [Route Drag & Edit - Leaflet](./routing-api/route-drag-edit-leaflet) | Interactive route editing | Leaflet | Routing API |
| [Route Drag & Edit - MapLibre](./routing-api/route-drag-edit-maplibre) | Drag waypoints to recalculate route | MapLibre GL | Routing API |
| [Visualize GeoJSON Routes](./routing-api/visualizing-geojson-routes-with-leaflet-and-geoapify-routing-api) | Routes on map | Leaflet | Routing API |

### ⏱️ Isoline API (2 examples)

Travel time and distance isolines (isochrones), including GeoJSON polygon visualization.

| Example | Description | Library | APIs |
|---------|-------------|---------|------|
| [Multi-Range Isochrones](./isoline-api/geoapify-isoline-api-maplibre-gl-multi-range-isochrones-with-toggle-ranges) | Toggle multiple isoline ranges | MapLibre GL | Isoline API |
| [Visualize GeoJSON Polygons](./isoline-api/visualizing-geojson-polygons-with-leaflet-and-geoapify-isoline-api) | Isoline polygons on map | Leaflet | Isoline API |

### 📍 Places API (2 examples)

Category search and GeoJSON visualization with Places API data.

| Example | Description | Library | APIs |
|---------|-------------|---------|------|
| [Places API with Dynamic Markers](./places-api/leaflet-demo-geoapify-places-api-category-search-with-dynamic-markers) | Category search with custom markers | Leaflet | Places API |
| [Visualize GeoJSON Points](./places-api/visualizing-geojson-points-with-leaflet-and-geoapify-places-api) | Places API results on map | Leaflet | Places API |

### 📮 Geocoding API (3 examples)

Reverse geocoding and coordinate-to-address lookups.

| Example | Description | Library | APIs |
|---------|-------------|---------|------|
| [City, Postcode, Street, Address By Coordinates](./geocoding-api/how-to-get-city-postcode-street-address-by-coordinates) | Reverse geocoding levels with request and JSON inspector | MapLibre GL | Geocoding API, Map Tiles |
| [Reverse Geocoding City Boundaries Size Comparison](./geocoding-api/reverse-geocoding-city-boundaries-size-comparison-drag) | Reverse geocode city boundaries, drag them, and compare apparent size | MapLibre GL | Geocoding API, Place Details API, Map Tiles |
| [Returned Address Can Differ Slightly From Clicked Map Point](./geocoding-api/why-can-returned-address-differ-slightly-from-clicked-map-point) | Compare clicked vs returned coordinates, inspect distances, and draw direct vs great-circle path | MapLibre GL | Geocoding API, Geometry Operation API, Map Tiles |

### 🔍 Geocoder & Autocomplete (10 examples)

Address search, autocomplete, and geocoding.

| Example | Description | Library | APIs |
|---------|-------------|---------|------|
| [Leaflet Integration](./geocoder-autocomplete/leaflet-integration-address-search-and-markers-on-interactive-map) | Address search with map markers | Leaflet | Geocoding API |
| [MapLibre Integration](./geocoder-autocomplete/maplibre-gl-integration-vector-maps-and-reverse-geocoding-on-click) | Autocomplete + reverse geocoding | MapLibre GL | Geocoding API |
| [Address Form with Map](./geocoder-autocomplete/address-form-map-combined-address-search-with-interactive-map) | Combined address form & map picker | Leaflet | Geocoding API |
| [One-Field Address Form](./geocoder-autocomplete/one-field-address-form-single-field-autocomplete-input) | Single-field verified address input | Autocomplete | Geocoding API |
| [Autocomplete Type Filters](./geocoder-autocomplete/autocomplete-types-filter-results-by-location-type) | Filter results by location type | Autocomplete | Geocoding API |
| [Filters & Bias Demo](./geocoder-autocomplete/filters-bias-demonstrates-filter-and-bias-customization) | Customize filters and bias | Autocomplete | Geocoding API |
| [Events Showcase](./geocoder-autocomplete/events-showcase-demonstrates-available-events-and-callbacks) | Available events and callbacks | Autocomplete | Geocoding API |
| [Places List - Built-in UI](./geocoder-autocomplete/leaflet-built-in-places-list-category-search-with-default-ui) | Category search with default UI | Leaflet | Places API |
| [Places List - Custom UI](./geocoder-autocomplete/leaflet-custom-places-list-custom-ui-for-places-results) | Custom UI for places results | Leaflet | Places API |
| [Places Search - No Map](./geocoder-autocomplete/places-search-no-map-category-search-with-built-in-list) | Standalone category search | Autocomplete | Places API |

## 📖 Documentation

Each example folder contains:
- `src/`: Source files (editable HTML, JS, CSS)
- `README.md`: Documentation with API links

## 🔧 Development

Want to modify examples? Edit files in `src/` and refresh the browser.

## 🔗 Useful Links

- 🌐 [Geoapify Website](https://www.geoapify.com/)
- 📚 [API Documentation](https://apidocs.geoapify.com/)
- 🔑 [Get Your API Key](https://myprojects.geoapify.com/)
- ✏️ [CodePen Demos](https://codepen.io/geoapify)
- 🧑‍💻 [Advanced Examples](https://github.com/geoapify/maps-api-code-samples)

## 📝 License

MIT License - see [MIT License](https://opensource.org/licenses/MIT) for details.

## 🙋 Questions or Feedback?

- 📧 Email: info@geoapify.com
- 💬 Open an issue in this repository

---

**Keywords**: Geoapify, Maps API, Routing API, Isoline API, Isochrone, Geocoding API, Places API, MapLibre GL JS, Leaflet, OpenLayers, JavaScript map examples, location-based services, interactive maps
