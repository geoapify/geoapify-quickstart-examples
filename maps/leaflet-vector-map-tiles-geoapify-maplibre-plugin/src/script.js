// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// Initialize the map and set its view to Chicago (lat/lon) with zoom level 16
const map = L.map("my-map").setView([41.890491, -87.654306], 16);

// Use maplibre-gl-leaflet to add Geoapify style.json
const glLayer = L.maplibreGL({
style: `https://maps.geoapify.com/v1/styles/toner-grey/style.json?apiKey=${yourAPIKey}`
}).addTo(map);

// Attribution
// Note: style.json (Mapbox Style Spec) does not automatically provide attribution in Leaflet.
// To comply with licensing, add the required attribution manually (Geoapify, OpenMapTiles, OpenStreetMap).
map.attributionControl.addAttribution('Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors');