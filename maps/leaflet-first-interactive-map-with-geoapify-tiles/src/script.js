// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// 1) Create map
const map = L.map("my-map").setView([51.505, -0.09], 13);

// 2) Base tiles (Geoapify OSM Bright)
var isRetina = L.Browser.retina;
var baseUrl =
  "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey={apiKey}";
var retinaUrl =
  "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}@2x.png?apiKey={apiKey}";

L.tileLayer(isRetina ? retinaUrl : baseUrl, {
  attribution:
    'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors',
  maxZoom: 20,
  id: "osm-bright",
  apiKey: yourAPIKey
}).addTo(map);

// 3) Marker + popup
const marker = L.marker([51.505, -0.09]).addTo(map);
marker
  .bindPopup("<b>Hello, Leaflet!</b><br>Welcome to your first map.")
  .openPopup();

// 4) Scale control (metric + imperial)
L.control.scale({ metric: true, imperial: true, position: "topleft" }).addTo(map);

// 5) Click handler: show coordinates
const coordsEl = document.getElementById("coords");
map.on("click", (e) => {
  const { lat, lng } = e.latlng;
  coordsEl.textContent = `Lat: ${lat.toFixed(5)}, Lon: ${lng.toFixed(5)}`;

  // Optional: move marker to click position
  marker
    .setLatLng(e.latlng)
    .bindPopup(`You clicked at<br><b>${lat.toFixed(5)}, ${lng.toFixed(5)}</b>`)
    .openPopup();
});