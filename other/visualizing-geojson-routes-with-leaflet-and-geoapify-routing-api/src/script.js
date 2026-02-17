// 👉 Replace with your own API key. Sign up at https://www.geoapify.com/ to get one.
const yourAPIKey = "f82ea38cb77543d59c597faaa263e714";

// Initialize the map and set its view to Jacksonville, US(lat/lon) with zoom level 12
const map = L.map("my-map").setView([30.332039, -81.601305], 12);

// Retina displays require different map tiles quality
var isRetina = L.Browser.retina;
var baseUrl =
  "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey={apiKey}";
var retinaUrl =
  "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}@2x.png?apiKey={apiKey}";

// Add Geoapify tile layer with Retina support

// ℹ️ Notes:
// 1. You can choose different map styles (e.g., osm-bright, osm-bright-grey, dark-matter, positron, etc.)
// Check available styles and previews here: https://apidocs.geoapify.com/docs/maps/map-tiles/
// 2. To change the style, replace "osm-bright-grey" in the baseUrl/retinaUrl with the desired style name.
// 3. Leaflet by default uses raster map tiles (ZXY) as the base layer (PNG or JPG images).
// Vector maps require additional plugins (like maplibre-gl-leaflet).

L.tileLayer(isRetina ? retinaUrl : baseUrl, {
  attribution:
    'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors',
  maxZoom: 20,
  id: "osm-bright",
  apiKey: yourAPIKey
}).addTo(map);

const routingUrl =
  "https://api.geoapify.com/v1/routing?waypoints=30.354201207772732,-81.68336396905863|30.350974934149136,-81.64690457623806|30.329522527250134,-81.63135590156253&mode=drive&apiKey=" +
  yourAPIKey;

// Create custom panes to control z-index ordering (shadow below, route above)
map.createPane("route-shadow");
map.getPane("route-shadow").style.zIndex = 399;
map.createPane("route-line");
map.getPane("route-line").style.zIndex = 400;
map.createPane("route-waypoints");
map.getPane("route-waypoints").style.zIndex = 410;
map.createPane("route-markers");
map.getPane("route-markers").style.zIndex = 420;


// --- Marker icons (Geoapify Marker Icon API) ---
const mk = (icon, color) =>
  L.icon({
    iconUrl: `https://api.geoapify.com/v2/icon/?type=awesome&size=48&color=${encodeURIComponent(
      color   )}&icon=${icon}&iconType=lucide&contentSize=20&noWhiteCircle&scaleFactor=2&apiKey=${yourAPIKey}`,
    iconSize: [36, 53],
    iconAnchor: [18, 48],
    popupAnchor: [0, -50]
  });

const startIcon = mk("map-pin", "#0f9d58"); // green
const viaIcon = mk("circle", "#4285f4"); // blue
const endIcon = mk("flag", "#db4437"); // red

// --- Fetch route GeoJSON ---
fetch(routingUrl)
  .then((result) => result.json())
  .then((routeData) => {
    const routeFeature = routeData.features[0];
    // --- Summary (distance/time) ---
    const distanceMeters = routeFeature.properties?.distance;
    const timeSeconds = routeFeature.properties?.time;
    const fmtKm = (m) => (m / 1000).toFixed(1) + " km";
    const fmtMin = (s) => Math.round(s / 60) + " min";

    document.getElementById("summary").textContent = `Distance: ${fmtKm(
      distanceMeters
    )} · Time: ${fmtMin(timeSeconds)} · Mode: ${routeFeature.properties?.mode}`;

    generateTurnByTurnPointsAndInstructions(routeFeature);
    drawRoute(routeFeature);
    drawWaypoints(routeFeature);
  });

function generateTurnByTurnPointsAndInstructions(routeFeature) {
  const steps = [];
  (routeFeature.properties?.legs || []).forEach((leg) => {
    (leg.steps || []).forEach((step) => {
      const text = step.instruction?.text || "";
      const d = step.distance;
      const t = step.time;
      const fromIdx = step.from_index;
      const coords = routeFeature.geometry?.coordinates?.flat?.() || [];
      const coord = coords[fromIdx] || null;

      if (coord) {
        steps.push({ text, d, t, coord });
      }
    });
  });

  // --- Populate the turn-by-turn list ---
  const instructionsListEl = document.getElementById("instructions");
  instructionsListEl.innerHTML = "";
  steps.forEach((s, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${idx + 1}.</strong> ${s.text}<br>
      <small>${s.d.toFixed(0)} m · ${Math.round(s.t)} s</small>`;
    instructionsListEl.appendChild(li);
  });

  // --- Add small white circle markers for each step ---
  const markerStyle = {
    radius: 4,
    fillColor: "#ffffff",
    color: "#1976d2",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.9,
    pane: "route-waypoints",
  };

  steps.forEach((s) => {
    const lat = s.coord[1];
    const lon = s.coord[0];
    L.circleMarker([lat, lon], markerStyle)
      .addTo(map)
      .bindPopup(s.text);
  });
}

function drawRoute(routeFeature) {
  // --- Route geometry -> Leaflet layers with "shadow" + "line" styling ---
  // We can let Leaflet render GeoJSON directly twice (shadow, then main line).
  const shadow = L.geoJSON(routeFeature, {
    pane: "route-shadow",
    style: {
      color: "#000000",
      opacity: 0.25,
      weight: 10,
      lineCap: "round",
      lineJoin: "round"
    }
  }).addTo(map);

  const line = L.geoJSON(routeFeature, {
    pane: "route-line",
    style: {
      color: "#1976d2",
      opacity: 0.95,
      weight: 5,
      lineCap: "round",
      lineJoin: "round"
    }
  }).addTo(map);
}

function drawWaypoints(routeFeature) {
  // --- Waypoint markers (start, via, end) ---
  const waypoints = routeFeature.properties?.waypoints || [];
  waypoints.forEach((wp, i) => {
    const lat = wp.location[1],
      lon = wp.location[0]; // GeoJSON lon,lat -> Leaflet lat,lon
    const isFirst = i === 0;
    const isLast = i === waypoints.length - 1;
    const icon = isFirst ? startIcon : isLast ? endIcon : viaIcon;
    L.marker([lat, lon], { icon, pane: "route-markers" })
      .addTo(map)
      .bindPopup(isFirst ? "Start" : isLast ? "Destination" : "Via point");
  });
}