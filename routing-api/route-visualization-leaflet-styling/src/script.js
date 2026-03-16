/* Geoapify Routing API — Route Visualization Demo
   Demonstrates route styling controls and marker customization.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */

const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// ─────────────────────────────────────────────────────────────
// Waypoints: Paris landmarks (all on north side of Seine)
// ─────────────────────────────────────────────────────────────
const waypoints = [
    {lat: 48.8738, lon: 2.2950, name: "Arc de Triomphe"},
    {lat: 48.8698, lon: 2.3075, name: "Champs-Élysées"},
    {lat: 48.8606, lon: 2.3376, name: "Louvre Museum"},
    {lat: 48.8675, lon: 2.3634, name: "Place de la République"}
];

// Marker colors (URL-encoded hex values)
const MARKER_COLORS = ["%234CAF50", "%232196F3", "%23FF9800", "%23E91E63"];

// Default UI settings
const DEFAULTS = {
    routeColor: "#2196F3",
    routeWidth: 6,
    routeOpacity: 0.8,
    showShadow: true,
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    markerType: "awesome",
    markerSize: 48,
    markerShadow: true
};

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────
let routeLayer = null;
let shadowLayer = null;
let markers = [];
let routeFeature = null;

// ─────────────────────────────────────────────────────────────
// Map initialization
// ─────────────────────────────────────────────────────────────
const map = L.map("map", {zoomControl: false}).setView([48.8606, 2.3376], 13);
L.control.zoom({position: "bottomright"}).addTo(map);

// Custom panes for proper z-index layering (shadow below route)
map.createPane("route-shadow");
map.getPane("route-shadow").style.zIndex = 399;
map.createPane("route-line");
map.getPane("route-line").style.zIndex = 400;

// Geoapify map tiles
L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey=${yourAPIKey}`, {
    attribution: '© <a href="https://www.geoapify.com/">Geoapify</a> © OpenMapTiles © OpenStreetMap',
    maxZoom: 20
}).addTo(map);

// ─────────────────────────────────────────────────────────────
// Routing API
// ─────────────────────────────────────────────────────────────

// Build routing URL (waypoint format: lat,lon separated by |)
const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${waypoints.map(w => `${w.lat},${w.lon}`).join("|")}&mode=drive&apiKey=${yourAPIKey}`;

function fetchRoute() {
    fetch(routingUrl)
        .then(res => res.json())
        .then(data => {
            if (data.features?.length > 0) {
                routeFeature = data.features[0];
                renderRoute(routeFeature);
                renderMarkers();
                fitBounds();
            }
        });
}

// ─────────────────────────────────────────────────────────────
// Route rendering
// ─────────────────────────────────────────────────────────────
function renderRoute(feature) {
    if (routeLayer) map.removeLayer(routeLayer);
    if (shadowLayer) map.removeLayer(shadowLayer);

    const routeColor = document.getElementById("route-color").value;
    const routeWidth = parseInt(document.getElementById("route-width").value);
    const routeOpacity = parseFloat(document.getElementById("route-opacity").value);
    const showShadow = document.getElementById("show-shadow").checked;
    const shadowColor = document.getElementById("shadow-color").value;
    const shadowOpacity = parseFloat(document.getElementById("shadow-opacity").value);

    // Shadow layer (rendered first, appears below)
    if (showShadow) {
        shadowLayer = L.geoJSON(feature, {
            pane: "route-shadow",
            style: {
                color: shadowColor,
                weight: routeWidth + 4,
                opacity: shadowOpacity,
                lineCap: "round",
                lineJoin: "round"
            }
        }).addTo(map);
    }

    // Main route layer
    routeLayer = L.geoJSON(feature, {
        pane: "route-line",
        style: {
            color: routeColor,
            weight: routeWidth,
            opacity: routeOpacity,
            lineCap: "round",
            lineJoin: "round"
        }
    }).addTo(map);
}

// ─────────────────────────────────────────────────────────────
// Marker Icon API (v2)
// Docs: https://apidocs.geoapify.com/docs/icon/
// ─────────────────────────────────────────────────────────────
function renderMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const markerType = document.getElementById("marker-type").value;
    const markerSize = parseInt(document.getElementById("marker-size").value);
    const markerShadow = document.getElementById("marker-shadow").checked;

    waypoints.forEach((wp, idx) => {
        const color = MARKER_COLORS[idx % MARKER_COLORS.length];
        const shadowParam = markerShadow ? "" : "&noShadow";
        const icon = createMarkerIcon(markerType, color, idx + 1, markerSize, shadowParam);

        const marker = L.marker([wp.lat, wp.lon], {icon})
            .bindPopup(`<strong>${wp.name}</strong><br>Waypoint ${idx + 1}`)
            .addTo(map);

        markers.push(marker);
    });
}

function createMarkerIcon(type, color, number, size, shadowParam) {
    // scaleFactor=2 provides high-resolution icons for retina displays

    if (type === "circle") {
        return L.icon({
            iconUrl: `https://api.geoapify.com/v2/icon?type=circle&color=${color}&text=${number}&size=${size}&contentSize=${Math.round(size * 0.55)}&scaleFactor=2${shadowParam}&apiKey=${yourAPIKey}`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            popupAnchor: [0, -size / 2]
        });
    }

    if (type === "material") {
        return L.icon({
            iconUrl: `https://api.geoapify.com/v2/icon?type=material&color=${color}&text=${number}&size=${size}&contentSize=${Math.round(size * 0.35)}&scaleFactor=2${shadowParam}&apiKey=${yourAPIKey}`,
            iconSize: [size * 0.65, size],
            iconAnchor: [size * 0.325, size],
            popupAnchor: [0, -size]
        });
    }

    // Default: awesome (classic map pin)
    return L.icon({
        iconUrl: `https://api.geoapify.com/v2/icon?type=awesome&color=${color}&text=${number}&size=${size}&contentSize=${Math.round(size * 0.4)}&noWhiteCircle&scaleFactor=2${shadowParam}&apiKey=${yourAPIKey}`,
        iconSize: [size * 0.75, size],
        iconAnchor: [size * 0.375, size - 3],
        popupAnchor: [0, -size + 5]
    });
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
function fitBounds() {
    const bounds = L.latLngBounds(waypoints.map(w => [w.lat, w.lon]));
    map.fitBounds(bounds, {padding: [50, 50]});
}

// ─────────────────────────────────────────────────────────────
// UI Event Listeners
// ─────────────────────────────────────────────────────────────
document.getElementById("route-color").addEventListener("input", (e) => {
    document.getElementById("route-color-value").textContent = e.target.value.toUpperCase();
    if (routeFeature) renderRoute(routeFeature);
});

document.getElementById("route-width").addEventListener("input", (e) => {
    document.getElementById("width-value").textContent = e.target.value;
    if (routeFeature) renderRoute(routeFeature);
});

document.getElementById("route-opacity").addEventListener("input", (e) => {
    document.getElementById("opacity-value").textContent = e.target.value;
    if (routeFeature) renderRoute(routeFeature);
});

document.getElementById("show-shadow").addEventListener("change", () => {
    if (routeFeature) renderRoute(routeFeature);
});

document.getElementById("shadow-color").addEventListener("input", (e) => {
    document.getElementById("shadow-color-value").textContent = e.target.value.toUpperCase();
    if (routeFeature) renderRoute(routeFeature);
});

document.getElementById("shadow-opacity").addEventListener("input", (e) => {
    document.getElementById("shadow-opacity-value").textContent = e.target.value;
    if (routeFeature) renderRoute(routeFeature);
});

document.getElementById("marker-type").addEventListener("change", renderMarkers);

document.getElementById("marker-size").addEventListener("input", (e) => {
    document.getElementById("marker-size-value").textContent = e.target.value;
    renderMarkers();
});

document.getElementById("marker-shadow").addEventListener("change", renderMarkers);

// Reset to defaults
document.getElementById("reset-btn").addEventListener("click", () => {
    document.getElementById("route-color").value = DEFAULTS.routeColor;
    document.getElementById("route-color-value").textContent = DEFAULTS.routeColor;
    document.getElementById("route-width").value = DEFAULTS.routeWidth;
    document.getElementById("width-value").textContent = DEFAULTS.routeWidth;
    document.getElementById("route-opacity").value = DEFAULTS.routeOpacity;
    document.getElementById("opacity-value").textContent = DEFAULTS.routeOpacity;
    document.getElementById("show-shadow").checked = DEFAULTS.showShadow;
    document.getElementById("shadow-color").value = DEFAULTS.shadowColor;
    document.getElementById("shadow-color-value").textContent = DEFAULTS.shadowColor;
    document.getElementById("shadow-opacity").value = DEFAULTS.shadowOpacity;
    document.getElementById("shadow-opacity-value").textContent = DEFAULTS.shadowOpacity;
    document.getElementById("marker-type").value = DEFAULTS.markerType;
    document.getElementById("marker-size").value = DEFAULTS.markerSize;
    document.getElementById("marker-size-value").textContent = DEFAULTS.markerSize;
    document.getElementById("marker-shadow").checked = DEFAULTS.markerShadow;

    if (routeFeature) {
        renderRoute(routeFeature);
        renderMarkers();
    }
});

// ─────────────────────────────────────────────────────────────
// Initialize
// ─────────────────────────────────────────────────────────────
fetchRoute();
