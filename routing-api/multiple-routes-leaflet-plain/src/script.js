/* Geoapify Routing API — Multiple Routes Visualization (Varying Line Weights)
   Shows overlapping routes using different line weights (no offset needed).
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */

const API_KEY = "5402608de7c44a2d95121c407ad2110b";

// ─────────────────────────────────────────────────────────────
// Route Definitions
// ─────────────────────────────────────────────────────────────

const DESTINATION = {
    lat: 48.8738,
    lon: 2.2950,
    name: "Arc de Triomphe"
};

const ROUTES = [
    {id: "r1", name: "From Eiffel Tower", color: "#E53935", origin: {lat: 48.8584, lon: 2.2945}},
    {id: "r2", name: "From Louvre", color: "#43A047", origin: {lat: 48.8606, lon: 2.3376}},
    {id: "r3", name: "From Notre-Dame", color: "#1E88E5", origin: {lat: 48.8530, lon: 2.3499}},
    {id: "r4", name: "From Sacré-Cœur", color: "#FB8C00", origin: {lat: 48.8867, lon: 2.3431}}
];

// ─────────────────────────────────────────────────────────────
// State & Map Setup
// ─────────────────────────────────────────────────────────────

const routeState = {};
let markers = [];

// Line weights for each route (thickest to thinnest)
// Thicker routes drawn first (bottom), thinner routes drawn last (top)
const LINE_WEIGHTS = [
    {outline: 14, main: 10},  // Route 1 - thickest (bottom layer)
    {outline: 11, main: 7},   // Route 2
    {outline: 8, main: 5},    // Route 3
    {outline: 5, main: 3}     // Route 4 - thinnest (top layer)
];

const map = L.map("map", {zoomControl: false}).setView([48.866, 2.32], 13);
L.control.zoom({position: "bottomright"}).addTo(map);

L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey=${API_KEY}`, {
    attribution: '© <a href="https://www.geoapify.com/">Geoapify</a> © OpenMapTiles © OpenStreetMap',
    maxZoom: 20
}).addTo(map);

// Update zoom level display
function updateZoomLevel() {
    const zoomElement = document.getElementById("zoom-level");
    if (zoomElement) {
        zoomElement.textContent = map.getZoom();
    }
}

map.on("zoomend", updateZoomLevel);
updateZoomLevel();

// ─────────────────────────────────────────────────────────────
// Fetch Routes from Routing API
// ─────────────────────────────────────────────────────────────

ROUTES.forEach((route, index) => {
    const waypoints = `${route.origin.lat},${route.origin.lon}|${DESTINATION.lat},${DESTINATION.lon}`;
    const url = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=${API_KEY}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data.features?.[0]) return;

            const feature = data.features[0];
            const props = feature.properties;

            // Store route state (with index for offset calculation)
            routeState[route.id] = {
                ...route,
                index: index,
                visible: true,
                feature: feature,
                layer: createRouteLayer(feature, route.color, index),
                distance: (props.distance / 1000).toFixed(1),
                duration: Math.round(props.time / 60)
            };

            updateUI();
            renderMarkers();
        });
});

// ─────────────────────────────────────────────────────────────
// Route Layer (varying line weights, no offset)
// ─────────────────────────────────────────────────────────────

function createRouteLayer(feature, color, index) {
    const group = L.layerGroup();
    
    // Get line weights for this route index
    const weights = LINE_WEIGHTS[index % LINE_WEIGHTS.length];
    
    // Render each part separately (handle MultiLineString)
    const parts = extractLatLngParts(feature.geometry);
    for (const part of parts) {
        addCasedPolyline(group, part, color, weights);
    }

    group.getBounds = () => L.featureGroup(group.getLayers()).getBounds();
    return group.addTo(map);
}

function addCasedPolyline(group, latLngs, color, weights) {
    // Outline (casing) - darker version of route color
    const outline = L.polyline(latLngs, {
        color: darkenColor(color, 30),
        weight: weights.outline,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "bevel",
        smoothFactor: 1
    });
    outline.addTo(group);

    // Main line - route color
    const main = L.polyline(latLngs, {
        color,
        weight: weights.main,
        opacity: 1,
        lineCap: "round",
        lineJoin: "bevel",
        smoothFactor: 1
    });
    main.addTo(group);
}

// Extract lat/lng parts WITHOUT flattening MultiLineString (avoids fake joints)
function extractLatLngParts(geometry) {
    if (geometry.type === "LineString") {
        return [geometry.coordinates.map(([lon, lat]) => [lat, lon])];
    }
    if (geometry.type === "MultiLineString") {
        return geometry.coordinates.map(line => line.map(([lon, lat]) => [lat, lon]));
    }
    return [];
}

// ─────────────────────────────────────────────────────────────
// Color Utilities
// ─────────────────────────────────────────────────────────────

// Darken a hex color
function darkenColor(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

// ─────────────────────────────────────────────────────────────
// Markers (Geoapify Marker Icon API v2)
// ─────────────────────────────────────────────────────────────

function renderMarkers() {
    // Clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Destination marker (flag icon)
    markers.push(
        createMarker(DESTINATION.lat, DESTINATION.lon, "%23E91E63", "flag", DESTINATION.name, "Destination")
    );

    // Origin markers (circle icon, matching route color)
    Object.values(routeState).forEach(route => {
        if (!route.visible) return;

        const color = route.color.replace("#", "%23");
        const name = route.name.replace("From ", "");
        markers.push(
            createMarker(route.origin.lat, route.origin.lon, color, "circle", name, "Origin")
        );
    });
}

function createMarker(lat, lon, color, iconName, name, label) {
    const iconUrl = `https://api.geoapify.com/v2/icon?type=awesome&color=${color}&icon=${iconName}&iconType=awesome&size=48&scaleFactor=2&apiKey=${API_KEY}`;

    const icon = L.icon({
        iconUrl: iconUrl,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -48]
    });

    return L.marker([lat, lon], {icon})
        .bindPopup(`<strong>${name}</strong><br>${label}`)
        .addTo(map);
}

// ─────────────────────────────────────────────────────────────
// UI: Route List
// ─────────────────────────────────────────────────────────────

function updateUI() {
    const html = Object.values(routeState).map(route => `
    <div class="route-item ${route.visible ? '' : 'disabled'}" data-id="${route.id}" onclick="showRoute('${route.id}')">
      <div class="route-dot" style="background: ${route.color}"></div>
      <div class="route-details">
        <div class="route-name">${route.name}</div>
        <div class="route-info">${route.distance} km · ${route.duration} min</div>
      </div>
      <input type="checkbox" class="route-toggle" ${route.visible ? 'checked' : ''} onclick="toggleRoute('${route.id}', event)">
    </div>
  `).join('');

    document.getElementById("routes-list").innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────

// Toggle route visibility (checkbox)
window.toggleRoute = (id, event) => {
    event.stopPropagation();

    const route = routeState[id];
    route.visible = !route.visible;

    if (route.visible) {
        // Recreate layer to maintain proper offset
        route.layer = createRouteLayer(route.feature, route.color, route.index);
    } else {
        map.removeLayer(route.layer);
    }

    updateUI();
    renderMarkers();
};

// Show route and fit bounds (click on item)
window.showRoute = (id) => {
    const route = routeState[id];

    // Ensure route is visible
    if (!route.visible) {
        route.visible = true;
        route.layer = createRouteLayer(route.feature, route.color, route.index);
    }

    // Fit map to route bounds
    map.fitBounds(route.layer.getBounds(), {padding: [50, 50]});

    // Highlight active item
    document.querySelectorAll(".route-item").forEach(el => el.classList.remove("active"));
    document.querySelector(`[data-id="${id}"]`)?.classList.add("active");

    // Show route details
    showRouteDetails(route);

    updateUI();
    renderMarkers();
};

// ─────────────────────────────────────────────────────────────
// Route Details Panel
// ─────────────────────────────────────────────────────────────

function showRouteDetails(route) {
    const panel = document.getElementById("route-details");
    const content = document.getElementById("route-details-content");

    // Update border color to match route
    panel.style.borderLeftColor = route.color;

    // Build details HTML
    content.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Route</span>
      <span class="detail-value" style="color: ${route.color}">${route.name}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Distance</span>
      <span class="detail-value">${route.distance} km</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Duration</span>
      <span class="detail-value">${route.duration} min</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">From</span>
      <span class="detail-value">${route.name.replace("From ", "")}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">To</span>
      <span class="detail-value">${DESTINATION.name}</span>
    </div>
  `;

    // Show panel
    panel.classList.remove("hidden");
}
