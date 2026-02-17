// 👉 Replace with your own API key. Sign up at https://www.geoapify.com/ to get one.
const apiKey = "f82ea38cb77543d59c597faaa263e714";

// Initialize the map and set its view to Chicago (lat/lon) with zoom level 16
const map = L.map("my-map").setView([41.890491, -87.654306], 16);

// Use maplibre-gl-leaflet to add Geoapify style.json
const glLayer = L.maplibreGL({
style: `https://maps.geoapify.com/v1/styles/toner-grey/style.json?apiKey=${apiKey}`
}).addTo(map);

// Attribution
// Note: style.json (Mapbox Style Spec) does not automatically provide attribution in Leaflet.
// To comply with licensing, add the required attribution manually (Geoapify, OpenMapTiles, OpenStreetMap).
map.attributionControl.addAttribution('Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors');