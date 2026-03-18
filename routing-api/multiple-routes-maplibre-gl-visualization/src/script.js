/* Geoapify Routing API — Multiple Routes Visualization (MapLibre GL)
   Shows overlapping routes from different origins to a common destination.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */

const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

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

// Offset in pixels for parallel routes (visual offset only)
const OFFSETS = [-6, -2, 2, 6];

// ─────────────────────────────────────────────────────────────
// State & Map Setup
// ─────────────────────────────────────────────────────────────

const routeState = {};
let markers = [];

const map = new maplibregl.Map({
    container: "map",
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${yourAPIKey}`,
    center: [2.32, 48.866],
    zoom: 13
});

map.addControl(new maplibregl.NavigationControl(), "bottom-right");

// ─────────────────────────────────────────────────────────────
// Fetch Routes from Routing API
// ─────────────────────────────────────────────────────────────

map.on("load", () => {
    ROUTES.forEach((route, index) => {
        const waypoints = `${route.origin.lat},${route.origin.lon}|${DESTINATION.lat},${DESTINATION.lon}`;
        const url = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=${yourAPIKey}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                if (!data.features?.[0]) return;

                const feature = data.features[0];
                const props = feature.properties;

                // Store route state
                routeState[route.id] = {
                    ...route,
                    index: index,
                    visible: true,
                    feature: feature,
                    distance: (props.distance / 1000).toFixed(1),
                    duration: Math.round(props.time / 60)
                };

                addRouteLayer(route.id);
                updateUI();
                renderMarkers();
            });
    });
});

// ─────────────────────────────────────────────────────────────
// Route Layers (with visual pixel offset for parallel routes)
// ─────────────────────────────────────────────────────────────

function addRouteLayer(routeId) {
    const route = routeState[routeId];
    const offsetPixels = OFFSETS[route.index % OFFSETS.length];

    // Add source with original route geometry (no geometric offsetting)
    map.addSource(routeId, {
        type: "geojson",
        data: route.feature
    });

    // Add outline layer with pixel-based visual offset
    map.addLayer({
        id: `${routeId}-outline`,
        type: "line",
        source: routeId,
        layout: {
            "line-join": "round",
            "line-cap": "round"
        },
        paint: {
            "line-color": darkenColor(route.color, 30),
            "line-width": 7,
            "line-opacity": 0.9,
            "line-offset": offsetPixels
        }
    });

    // Add main line layer with same pixel-based visual offset
    map.addLayer({
        id: `${routeId}-line`,
        type: "line",
        source: routeId,
        layout: {
            "line-join": "round",
            "line-cap": "round"
        },
        paint: {
            "line-color": route.color,
            "line-width": 4,
            "line-opacity": 1,
            "line-offset": offsetPixels
        }
    });
}

function removeRouteLayer(routeId) {
    if (map.getLayer(`${routeId}-line`)) map.removeLayer(`${routeId}-line`);
    if (map.getLayer(`${routeId}-outline`)) map.removeLayer(`${routeId}-outline`);
    if (map.getSource(routeId)) map.removeSource(routeId);
}

function extractCoordinates(geometry) {
    if (geometry.type === "MultiLineString") {
        return geometry.coordinates.flat();
    }
    return geometry.coordinates;
}

// ─────────────────────────────────────────────────────────────
// Color Utilities
// ─────────────────────────────────────────────────────────────

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
    markers.forEach(m => m.remove());
    markers = [];

    // Destination marker
    markers.push(createMarker(DESTINATION.lon, DESTINATION.lat, "%23E91E63", "flag", DESTINATION.name, "Destination"));

    // Origin markers
    Object.values(routeState).forEach(route => {
        if (!route.visible) return;
        const color = route.color.replace("#", "%23");
        const name = route.name.replace("From ", "");
        markers.push(createMarker(route.origin.lon, route.origin.lat, color, "circle", name, "Origin"));
    });
}

function createMarker(lon, lat, color, iconName, name, label) {
    const el = document.createElement("div");
    el.style.width = "36px";
    el.style.height = "48px";
    el.style.backgroundImage = `url(https://api.geoapify.com/v2/icon?type=awesome&color=${color}&icon=${iconName}&iconType=awesome&size=48&scaleFactor=2&apiKey=${yourAPIKey})`;
    el.style.backgroundSize = "contain";
    el.style.backgroundRepeat = "no-repeat";
    el.style.cursor = "pointer";

    const popup = new maplibregl.Popup({offset: [0, -48]})
        .setHTML(`<strong>${name}</strong><br>${label}`);

    const marker = new maplibregl.Marker({element: el, anchor: "bottom"})
        .setLngLat([lon, lat])
        .setPopup(popup)
        .addTo(map);

    return marker;
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

window.toggleRoute = (id, event) => {
    event.stopPropagation();

    const route = routeState[id];
    route.visible = !route.visible;

    if (route.visible) {
        addRouteLayer(id);
    } else {
        removeRouteLayer(id);
    }

    updateUI();
    renderMarkers();
};

window.showRoute = (id) => {
    const route = routeState[id];

    // Ensure visible
    if (!route.visible) {
        route.visible = true;
        addRouteLayer(id);
    }

    // Fit bounds to route
    const coords = extractCoordinates(route.feature.geometry);
    const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, {padding: 80});

    // Highlight
    document.querySelectorAll(".route-item").forEach(el => el.classList.remove("active"));
    document.querySelector(`[data-id="${id}"]`)?.classList.add("active");

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

    panel.style.borderLeftColor = route.color;

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

    panel.classList.remove("hidden");
}

