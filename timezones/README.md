# Geoapify IANA Timezone Code Examples

Use Geoapify IANA timezone code examples to find a timezone from coordinates, compare timezones, and explore timezone metadata, aliases, UTC offsets, daylight-saving states, transitions, and country associations.

## Overview

This folder contains browser-based JavaScript examples for IANA timezone lookup and timezone comparison with the [`@geoapify/iana-timezone-metadata`](https://www.npmjs.com/package/@geoapify/iana-timezone-metadata) package. The coordinate workflow also demonstrates how to combine IANA timezone metadata with Geoapify location APIs. Each example includes source code, a screenshot, and focused documentation.

## API Resources

[![Reverse Geocoding API](https://img.shields.io/badge/-Reverse%20Geocoding%20API-2f6fed?style=for-the-badge)](https://www.geoapify.com/reverse-geocoding-api/)
[![Reverse Geocoding docs](https://img.shields.io/badge/-Reverse%20Geocoding%20docs-2e7d32?style=for-the-badge)](https://apidocs.geoapify.com/docs/geocoding/reverse-geocoding/)
[![Timezone package](https://img.shields.io/badge/-Timezone%20package-f57c00?style=for-the-badge)](https://www.npmjs.com/package/@geoapify/iana-timezone-metadata)

## Code Examples

| Screenshot | Example | Description | Source Code | Live Demo |
|------------|---------|-------------|-------------|-----------|
| <img src="./interactive-iana-timezone-dst-explorer/screenshots/interactive-iana-timezone-dst-explorer-screenshot.png" alt="IANA timezone and DST explorer with coordinate map, timezone details, transitions, and country lookup tasks" width="220"> | IANA Timezone and DST Explorer | Find a timezone on a map, inspect its state at an instant, explore clock transitions, and list timezones by country. | [Open example](https://github.com/geoapify/geoapify-quickstart-examples/tree/main/timezones/interactive-iana-timezone-dst-explorer/) | [CodePen](https://codepen.io/editor/geoapify/pen/019ff96a-dca8-7c96-b829-eab19125aef8) |
| <img src="./timezone-compare-iana-timezone-offsets-and-dst/screenshots/timezone-compare-iana-timezone-offsets-and-dst-screenshot.png" alt="Timezone compare tool comparing New York and London IANA timezone offsets, local times, and DST states" width="220"> | Timezone Compare: IANA Timezones, UTC Offsets, and DST | Compare two IANA timezones at one instant, including local times, offset difference, DST states, aliases, and next transitions. | [Open example](https://github.com/geoapify/geoapify-quickstart-examples/tree/main/timezones/timezone-compare-iana-timezone-offsets-and-dst/) | [CodePen](https://codepen.io/editor/geoapify/pen/019ff968-40b1-7c29-8913-30ec3e1a2b69) |

## Geoapify API Key

The IANA Timezone and DST Explorer includes a demo Geoapify API key for its map and reverse-geocoding workflow. For your own project, create a free key at [myprojects.geoapify.com](https://myprojects.geoapify.com/) and replace the example key in `src/script.js`. The Timezone Compare example uses bundled package data and does not require an API key.

## APIs and Libraries

| Name | Description | Documentation | Used In This Example |
|------|-------------|---------------|----------------------|
| Geoapify Reverse Geocoding API | Converts selected coordinates into an address and IANA timezone identifier. | [Reverse Geocoding docs](https://apidocs.geoapify.com/docs/geocoding/reverse-geocoding/) | [IANA Timezone and DST Explorer](./interactive-iana-timezone-dst-explorer/) |
| Geoapify Map Tiles API | Provides the interactive basemap for coordinate selection. | [Map Tiles docs](https://apidocs.geoapify.com/docs/maps/map-tiles/) | [IANA Timezone and DST Explorer](./interactive-iana-timezone-dst-explorer/) |
| Geoapify Map Marker API | Generates the draggable timezone marker displayed on the map. | [Map Marker API docs](https://apidocs.geoapify.com/docs/icon/) | [IANA Timezone and DST Explorer](./interactive-iana-timezone-dst-explorer/) |
| `@geoapify/iana-timezone-metadata` | Provides canonical IANA timezone IDs, aliases, offsets, states, transitions, and country associations. | [NPM package](https://www.npmjs.com/package/@geoapify/iana-timezone-metadata) | [IANA Timezone and DST Explorer](./interactive-iana-timezone-dst-explorer/), [Timezone Compare](./timezone-compare-iana-timezone-offsets-and-dst/) |
| MapLibre GL JS | Renders the interactive map. | [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/) | [IANA Timezone and DST Explorer](./interactive-iana-timezone-dst-explorer/) |
| JavaScript `Intl.DateTimeFormat` | Formats local dates and times for the comparison display. | [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) | [Timezone Compare](./timezone-compare-iana-timezone-offsets-and-dst/) |

## Useful Links

- Geoapify API documentation: [https://apidocs.geoapify.com/](https://apidocs.geoapify.com/)
- Geoapify projects and API keys: [https://myprojects.geoapify.com/](https://myprojects.geoapify.com/)
- IANA Time Zone Database: [https://www.iana.org/time-zones](https://www.iana.org/time-zones)
