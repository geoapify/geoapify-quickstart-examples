/* Geoapify Routing API — Route Visualization with MapLibre GL
   Demonstrates route styling controls and marker customization.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */

const API_KEY = "5402608de7c44a2d95121c407ad2110b";

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
    routeOpacity: 0.9,
    showOutline: true,
    outlineColor: "#0D47A1",
    outlineWidth: 2,
    markerType: "awesome",
    markerSize: 48,
    markerShadow: true
};

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────
let routeData = null;
let markerElements = [];

// ─────────────────────────────────────────────────────────────
// Map initialization
// ─────────────────────────────────────────────────────────────
const map = new maplibregl.Map({
    container: "map",
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${API_KEY}`,
    center: [2.3376, 48.8606], // Paris [lng, lat]
    zoom: 13
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl(), "bottom-right");

// ─────────────────────────────────────────────────────────────
// Routing API
// ─────────────────────────────────────────────────────────────

// Build routing URL (waypoint format: lat,lon separated by |)
const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${waypoints.map(w => `${w.lat},${w.lon}`).join("|")}&mode=drive&apiKey=${API_KEY}`;

map.on("load", () => {
    fetchRoute();
});

function fetchRoute() {
    fetch(routingUrl)
        .then(res => res.json())
        .then(data => {
            if (data.features?.length > 0) {
                routeData = data;
                addRouteLayers();
                renderMarkers();
                fitBounds();
            }
        });
}

// ─────────────────────────────────────────────────────────────
// Route rendering with MapLibre GL layers
// ─────────────────────────────────────────────────────────────
function addRouteLayers() {
    // Add GeoJSON source
    if (map.getSource("route")) {
        map.getSource("route").setData(routeData);
    } else {
        map.addSource("route", {
            type: "geojson",
            data: routeData
        });

        // Outline layer (rendered first, appears below)
        map.addLayer({
            id: "route-outline",
            type: "line",
            source: "route",
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": DEFAULTS.outlineColor,
                "line-width": DEFAULTS.routeWidth + DEFAULTS.outlineWidth * 2,
                "line-opacity": DEFAULTS.routeOpacity
            }
        });

        // Main route layer
        map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": DEFAULTS.routeColor,
                "line-width": DEFAULTS.routeWidth,
                "line-opacity": DEFAULTS.routeOpacity
            }
        });
    }

    updateRouteStyle();
}

function updateRouteStyle() {
    if (!map.getLayer("route-line")) return;

    const routeColor = document.getElementById("route-color").value;
    const routeWidth = parseInt(document.getElementById("route-width").value);
    const routeOpacity = parseFloat(document.getElementById("route-opacity").value);
    const showOutline = document.getElementById("show-outline").checked;
    const outlineColor = document.getElementById("outline-color").value;
    const outlineWidth = parseInt(document.getElementById("outline-width").value);

    // Update main route
    map.setPaintProperty("route-line", "line-color", routeColor);
    map.setPaintProperty("route-line", "line-width", routeWidth);
    map.setPaintProperty("route-line", "line-opacity", routeOpacity);

    // Update outline
    map.setPaintProperty("route-outline", "line-color", outlineColor);
    map.setPaintProperty("route-outline", "line-width", showOutline ? routeWidth + outlineWidth * 2 : 0);
    map.setPaintProperty("route-outline", "line-opacity", routeOpacity);
}

// ─────────────────────────────────────────────────────────────
// Marker Icon API (v2)
// Docs: https://apidocs.geoapify.com/docs/icon/
// ─────────────────────────────────────────────────────────────
function renderMarkers() {
    // Remove existing markers
    markerElements.forEach(m => m.remove());
    markerElements = [];

    const markerType = document.getElementById("marker-type").value;
    const markerSize = parseInt(document.getElementById("marker-size").value);
    const markerShadow = document.getElementById("marker-shadow").checked;

    waypoints.forEach((wp, idx) => {
        const color = MARKER_COLORS[idx % MARKER_COLORS.length];
        const shadowParam = markerShadow ? "" : "&noShadow";
        const iconUrl = createMarkerUrl(markerType, color, idx + 1, markerSize, shadowParam);
        const dimensions = getMarkerDimensions(markerType, markerSize);

        // Create marker element
        const el = document.createElement("div");
        el.className = "marker";
        el.style.width = `${dimensions.width}px`;
        el.style.height = `${dimensions.height}px`;
        el.style.backgroundImage = `url(${iconUrl})`;
        el.style.backgroundSize = "contain";
        el.style.backgroundRepeat = "no-repeat";
        el.style.cursor = "pointer";

        // Create popup
        const popup = new maplibregl.Popup({offset: dimensions.popupOffset})
            .setHTML(`<strong>${wp.name}</strong>Waypoint ${idx + 1}`);

        // Add marker to map
        const marker = new maplibregl.Marker({element: el, anchor: dimensions.anchor})
            .setLngLat([wp.lon, wp.lat])
            .setPopup(popup)
            .addTo(map);

        markerElements.push(marker);
    });
}

function createMarkerUrl(type, color, number, size, shadowParam) {
    const contentSize = type === "circle" ? Math.round(size * 0.55) : Math.round(size * 0.4);
    const noWhiteCircle = type === "awesome" ? "&noWhiteCircle" : "";
    return `https://api.geoapify.com/v2/icon?type=${type}&color=${color}&text=${number}&size=${size}&contentSize=${contentSize}&scaleFactor=2${noWhiteCircle}${shadowParam}&apiKey=${API_KEY}`;
}

function getMarkerDimensions(type, size) {
    if (type === "circle") {
        return {
            width: size,
            height: size,
            anchor: "center",
            popupOffset: [0, -size / 2]
        };
    }
    if (type === "material") {
        return {
            width: size * 0.65,
            height: size,
            anchor: "bottom",
            popupOffset: [0, -size]
        };
    }
    // awesome (default)
    return {
        width: size * 0.75,
        height: size,
        anchor: "bottom",
        popupOffset: [0, -size]
    };
}

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
function fitBounds() {
    const bounds = new maplibregl.LngLatBounds();
    waypoints.forEach(w => bounds.extend([w.lon, w.lat]));
    map.fitBounds(bounds, {padding: 80});
}

// ─────────────────────────────────────────────────────────────
// UI Event Listeners
// ─────────────────────────────────────────────────────────────
document.getElementById("route-color").addEventListener("input", (e) => {
    document.getElementById("route-color-value").textContent = e.target.value.toUpperCase();
    updateRouteStyle();
});

document.getElementById("route-width").addEventListener("input", (e) => {
    document.getElementById("width-value").textContent = e.target.value;
    updateRouteStyle();
});

document.getElementById("route-opacity").addEventListener("input", (e) => {
    document.getElementById("opacity-value").textContent = e.target.value;
    updateRouteStyle();
});

document.getElementById("show-outline").addEventListener("change", updateRouteStyle);

document.getElementById("outline-color").addEventListener("input", (e) => {
    document.getElementById("outline-color-value").textContent = e.target.value.toUpperCase();
    updateRouteStyle();
});

document.getElementById("outline-width").addEventListener("input", (e) => {
    document.getElementById("outline-width-value").textContent = e.target.value;
    updateRouteStyle();
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
    document.getElementById("show-outline").checked = DEFAULTS.showOutline;
    document.getElementById("outline-color").value = DEFAULTS.outlineColor;
    document.getElementById("outline-color-value").textContent = DEFAULTS.outlineColor;
    document.getElementById("outline-width").value = DEFAULTS.outlineWidth;
    document.getElementById("outline-width-value").textContent = DEFAULTS.outlineWidth;
    document.getElementById("marker-type").value = DEFAULTS.markerType;
    document.getElementById("marker-size").value = DEFAULTS.markerSize;
    document.getElementById("marker-size-value").textContent = DEFAULTS.markerSize;
    document.getElementById("marker-shadow").checked = DEFAULTS.markerShadow;

    updateRouteStyle();
    renderMarkers();
});

