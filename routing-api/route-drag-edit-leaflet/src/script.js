/* Geoapify Routing API — Route Drag & Drop Editing
   Clean Code refactored following Uncle Bob principles
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */

const API_KEY = "5402608de7c44a2d95121c407ad2110b";

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const INITIAL_WAYPOINTS = [
    {lat: 48.8584, lon: 2.2945, type: "origin", name: "Eiffel Tower"},
    {lat: 48.8738, lon: 2.2950, type: "destination", name: "Arc de Triomphe"}
];

const ROUTE_STYLES = {
    OUTLINE: {color: "#1565C0", weight: 8, opacity: 0.9, lineCap: "round"},
    MAIN: {color: "#2196F3", weight: 5, opacity: 1, lineCap: "round"}
};

const MARKER_COLORS = ["#4CAF50", "#2196F3", "#9C27B0", "#FF9800", "#00BCD4", "#E91E63", "#f44336", "#795548"];

function getMarkerColor(index) {
    return MARKER_COLORS[index % MARKER_COLORS.length];
}

const HOVER_DETECTION_WIDTH = 20;
const HOVER_HIDE_DELAY_MS = 50;
const MAP_FIT_PADDING = [100, 100];

// ═══════════════════════════════════════════════════════════════
// Application State
// ═══════════════════════════════════════════════════════════════

const state = {
    waypoints: [...INITIAL_WAYPOINTS],
    routeCoordinates: [],
    isLoading: false,
    isProcessingWaypoint: false, // Lock to prevent concurrent waypoint operations

    map: {
        routeLayer: null,
        floatingMarker: null,
        hoverLine: null,
        waypointMarkers: []
    }
};

// ═══════════════════════════════════════════════════════════════
// Map Initialization
// ═══════════════════════════════════════════════════════════════

const map = initializeMap();
const loadingIndicator = createLoadingIndicator();

function initializeMap() {
    const mapInstance = L.map("map", {zoomControl: false}).setView([48.865, 2.32], 14);
    L.control.zoom({position: "bottomright"}).addTo(mapInstance);

    L.tileLayer(
        `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey=${API_KEY}`,
        {
            attribution: '© <a href="https://www.geoapify.com/">Geoapify</a> © OpenMapTiles © OpenStreetMap',
            maxZoom: 20
        }
    ).addTo(mapInstance);

    return mapInstance;
}

function createLoadingIndicator() {
    const element = document.createElement("div");
    element.className = "loading";
    element.textContent = "Calculating route...";
    document.body.appendChild(element);
    return element;
}

// ═══════════════════════════════════════════════════════════════
// API Layer - Route Fetching
// ═══════════════════════════════════════════════════════════════

async function fetchAndRenderRoute() {
    if (!hasMinimumWaypoints()) return;

    setLoadingState(true);

    try {
        const routeData = await fetchRouteFromAPI();
        if (routeData) {
            handleRouteResponse(routeData);
        }
    } catch (error) {
        console.error("Error fetching route:", error);
    } finally {
        setLoadingState(false);
    }
}

function hasMinimumWaypoints() {
    return state.waypoints.length >= 2;
}

async function fetchRouteFromAPI() {
    const url = buildRoutingURL();
    const response = await fetch(url);
    const data = await response.json();
    return data.features?.[0];
}

function buildRoutingURL() {
    const waypointsParam = state.waypoints
        .map(w => `${w.lat},${w.lon}`)
        .join("|");
    return `https://api.geoapify.com/v1/routing?waypoints=${waypointsParam}&mode=drive&apiKey=${API_KEY}`;
}

function handleRouteResponse(feature) {
    state.routeCoordinates = extractCoordinatesFromGeometry(feature.geometry);

    updateUI(feature.properties);
    renderCompleteRoute();
    fitMapToRoute();
}

function extractCoordinatesFromGeometry(geometry) {
    const coords = [];
    const lines = geometry.type === "MultiLineString" ? geometry.coordinates : [geometry.coordinates];

    lines.forEach(line => {
        line.forEach(coord => coords.push([coord[1], coord[0]]));
    });

    return coords;
}

function updateUI(properties) {
    updateRouteInfo(properties.distance, properties.time);
    updateWaypointsList();
}

function renderCompleteRoute() {
    renderRouteLine();
    renderWaypointMarkers();
}

function fitMapToRoute() {
    const bounds = L.latLngBounds(
        state.waypoints.map(wp => [wp.lat, wp.lon])
    );
    map.fitBounds(bounds, {padding: MAP_FIT_PADDING});
}

// ═══════════════════════════════════════════════════════════════
// Route Rendering
// ═══════════════════════════════════════════════════════════════

function renderRouteLine() {
    removeOldRouteLine();

    const routeGroup = createRouteLayerGroup();
    state.map.routeLayer = routeGroup.addTo(map);

    setupFloatingMarkerInteraction();
}

function removeOldRouteLine() {
    if (state.map.routeLayer) {
        map.removeLayer(state.map.routeLayer);
    }
}

function createRouteLayerGroup() {
    const group = L.layerGroup();

    addRouteOutline(group);
    addMainRouteLine(group);

    return group;
}

function addRouteOutline(group) {
    L.polyline(state.routeCoordinates, ROUTE_STYLES.OUTLINE).addTo(group);
}

function addMainRouteLine(group) {
    L.polyline(state.routeCoordinates, ROUTE_STYLES.MAIN).addTo(group);
}

// ═══════════════════════════════════════════════════════════════
// Floating Marker - Hover Interaction
// ═══════════════════════════════════════════════════════════════

function setupFloatingMarkerInteraction() {
    cleanupOldHoverElements();

    state.map.hoverLine = createHoverDetectionLine();
    state.map.floatingMarker = createFloatingMarker();

    attachHoverBehaviors();
}

function cleanupOldHoverElements() {
    if (state.map.hoverLine) map.removeLayer(state.map.hoverLine);
    if (state.map.floatingMarker) map.removeLayer(state.map.floatingMarker);
}

function createHoverDetectionLine() {
    return L.polyline(state.routeCoordinates, {
        color: "transparent",
        weight: HOVER_DETECTION_WIDTH,
        opacity: 0,
        interactive: true
    }).addTo(map);
}

function createFloatingMarker() {
    const icon = L.divIcon({
        className: "",
        html: '<div class="floating-marker"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    return L.marker([0, 0], {
        icon,
        draggable: true,
        opacity: 0,
        interactive: true
    }).addTo(map);
}

function attachHoverBehaviors() {
    const hoverState = {isHovering: false};

    attachHoverLineEvents(hoverState);
    attachFloatingMarkerEvents(hoverState);
    attachDragEvents();
}

function attachHoverLineEvents(hoverState) {
    const {hoverLine, floatingMarker} = state.map;

    hoverLine.on("mouseover", () => {
        hoverState.isHovering = true;
    });

    hoverLine.on("mousemove", (e) => {
        if (shouldIgnoreHover()) return;

        hoverState.isHovering = true;
        showFloatingMarkerAt(e.latlng);
    });

    hoverLine.on("mouseout", () => {
        hoverState.isHovering = false;
        scheduleMarkerHide(hoverState);
    });
}

function attachFloatingMarkerEvents(hoverState) {
    const {floatingMarker} = state.map;

    floatingMarker.on("mouseover", () => {
        hoverState.isHovering = true;
        floatingMarker.setOpacity(1);
    });

    floatingMarker.on("mouseout", () => {
        hoverState.isHovering = false;
        if (!floatingMarker.isDragging) {
            floatingMarker.setOpacity(0);
        }
    });
}

function attachDragEvents() {
    const {floatingMarker} = state.map;

    floatingMarker.on("dragstart", function () {
        this.isDragging = true;
        this.setOpacity(1);
    });

    floatingMarker.on("dragend", async function (e) {
        this.isDragging = false;
        this.setOpacity(0);

        const {lat, lng} = e.target.getLatLng();
        await addViaPointAtPosition(lat, lng);
    });
}

function shouldIgnoreHover() {
    return state.isLoading || state.map.floatingMarker.isDragging;
}

function showFloatingMarkerAt(latlng) {
    const nearestPoint = findNearestPointOnRoute(latlng);
    state.map.floatingMarker.setLatLng(nearestPoint);
    state.map.floatingMarker.setOpacity(1);
}

function scheduleMarkerHide(hoverState) {
    setTimeout(() => {
        if (!hoverState.isHovering && !state.map.floatingMarker.isDragging) {
            state.map.floatingMarker.setOpacity(0);
        }
    }, HOVER_HIDE_DELAY_MS);
}

// ═══════════════════════════════════════════════════════════════
// Geometry Utilities
// ═══════════════════════════════════════════════════════════════

function findNearestPointOnRoute(targetPoint) {
    let minDistance = Infinity;
    let nearestPoint = state.routeCoordinates[0];

    for (let i = 0; i < state.routeCoordinates.length - 1; i++) {
        const segmentStart = L.latLng(state.routeCoordinates[i]);
        const segmentEnd = L.latLng(state.routeCoordinates[i + 1]);

        const projectedPoint = projectPointOntoSegment(targetPoint, segmentStart, segmentEnd);
        const distance = targetPoint.distanceTo(projectedPoint);

        if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = projectedPoint;
        }
    }

    return nearestPoint;
}

function projectPointOntoSegment(point, segmentStart, segmentEnd) {
    const vector = {
        x: point.lng - segmentStart.lng,
        y: point.lat - segmentStart.lat
    };

    const segment = {
        x: segmentEnd.lng - segmentStart.lng,
        y: segmentEnd.lat - segmentStart.lat
    };

    const segmentLengthSquared = segment.x * segment.x + segment.y * segment.y || 1;
    const dotProduct = vector.x * segment.x + vector.y * segment.y;
    const t = Math.max(0, Math.min(1, dotProduct / segmentLengthSquared));

    return L.latLng(
        segmentStart.lat + t * segment.y,
        segmentStart.lng + t * segment.x
    );
}

function findClosestSegmentIndex(point) {
    let bestIndex = 1;
    let minDistance = Infinity;

    for (let i = 0; i < state.waypoints.length - 1; i++) {
        const distance = calculateDistanceToWaypointSegment(point, i);

        if (distance < minDistance) {
            minDistance = distance;
            bestIndex = i + 1;
        }
    }

    return bestIndex;
}

function calculateDistanceToWaypointSegment(point, segmentIndex) {
    const start = state.waypoints[segmentIndex];
    const end = state.waypoints[segmentIndex + 1];

    const dx = end.lon - start.lon;
    const dy = end.lat - start.lat;
    const lengthSquared = dx * dx + dy * dy || 1;

    const t = Math.max(0, Math.min(1,
        ((point.lon - start.lon) * dx + (point.lat - start.lat) * dy) / lengthSquared
    ));

    const projectedLat = start.lat + t * dy;
    const projectedLon = start.lon + t * dx;

    return Math.sqrt(
        (point.lat - projectedLat) ** 2 + (point.lon - projectedLon) ** 2
    );
}

// ═══════════════════════════════════════════════════════════════
// Waypoint Management (with operation lock to prevent race conditions)
// ═══════════════════════════════════════════════════════════════

const OPERATION_COOLDOWN_MS = 300;

async function withWaypointLock(operation) {
    if (state.isProcessingWaypoint) return false;
    
    state.isProcessingWaypoint = true;
    try {
        await operation();
        return true;
    } finally {
        // Add cooldown before releasing lock to prevent double-triggers
        setTimeout(() => {
            state.isProcessingWaypoint = false;
        }, OPERATION_COOLDOWN_MS);
    }
}

async function addViaPointAtPosition(lat, lon) {
    await withWaypointLock(async () => {
        const insertIndex = findClosestSegmentIndex({lat, lon});
        const viaPoint = createViaPoint(lat, lon);

        state.waypoints.splice(insertIndex, 0, viaPoint);
        await fetchAndRenderRoute();
    });
}

function createViaPoint(lat, lon) {
    const viaCount = state.waypoints.filter(w => w.type === "via").length;
    return {
        lat,
        lon,
        type: "via",
        name: `Via point ${viaCount + 1}`
    };
}

async function removeViaPointAtIndex(index) {
    await withWaypointLock(async () => {
        if (!isViaPoint(index)) return;

        state.waypoints.splice(index, 1);
        await fetchAndRenderRoute();
    });
}

function isViaPoint(index) {
    return state.waypoints[index]?.type === "via";
}

async function updateWaypointPosition(index, lat, lon) {
    await withWaypointLock(async () => {
        state.waypoints[index].lat = lat;
        state.waypoints[index].lon = lon;
        state.waypoints[index].name = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        await fetchAndRenderRoute();
    });
}

// ═══════════════════════════════════════════════════════════════
// Marker Rendering
// ═══════════════════════════════════════════════════════════════

function renderWaypointMarkers() {
    removeOldWaypointMarkers();

    state.waypoints.forEach((waypoint, index) => {
        const marker = createMarkerForWaypoint(waypoint, index);
        state.map.waypointMarkers.push(marker);
    });
}

function removeOldWaypointMarkers() {
    state.map.waypointMarkers.forEach(marker => map.removeLayer(marker));
    state.map.waypointMarkers = [];
}

function createMarkerForWaypoint(waypoint, index) {
    return waypoint.type === "via"
        ? createViaMarker(waypoint, index)
        : createEndpointMarker(waypoint, index);
}

function createViaMarker(waypoint, index) {
    const color = getMarkerColor(index).replace('#', '%23');
    const icon = L.icon({
        iconUrl: `https://api.geoapify.com/v2/icon?type=awesome&color=${color}&text=${index + 1}&size=48&contentSize=20&scaleFactor=2&apiKey=${API_KEY}`,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -48]
    });

    const marker = L.marker([waypoint.lat, waypoint.lon], {
        icon,
        draggable: true
    }).addTo(map);

    marker.bindTooltip("Drag to change route<br>Click to remove", {
        direction: "top",
        offset: [0, -48]
    });

    attachViaMarkerEvents(marker, index);

    return marker;
}

function attachViaMarkerEvents(marker, index) {
    marker.on("dragend", async (e) => {
        const {lat, lng} = e.target.getLatLng();
        await updateWaypointPosition(index, lat, lng);
    });

    marker.on("click", async () => {
        await removeViaPointAtIndex(index);
    });
}

function createEndpointMarker(waypoint, index) {
    const color = getMarkerColor(index).replace('#', '%23');
    const icon = L.icon({
        iconUrl: `https://api.geoapify.com/v2/icon?type=awesome&color=${color}&text=${index + 1}&size=48&contentSize=20&scaleFactor=2&apiKey=${API_KEY}`,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -48]
    });

    const marker = L.marker([waypoint.lat, waypoint.lon], {
        icon,
        draggable: true
    }).addTo(map);

    const label = waypoint.type === "origin" ? "Origin" : "Destination";
    marker.bindTooltip(`<strong>${waypoint.name}</strong><br>${label}`, {
        direction: "top",
        offset: [0, -48]
    });

    attachEndpointMarkerEvents(marker, index);

    return marker;
}

function attachEndpointMarkerEvents(marker, index) {
    marker.on("dragend", async (e) => {
        const {lat, lng} = e.target.getLatLng();
        await updateWaypointPosition(index, lat, lng);
    });
}

// ═══════════════════════════════════════════════════════════════
// UI Updates
// ═══════════════════════════════════════════════════════════════

function updateRouteInfo(distance, time) {
    setElementText("distance", formatDistance(distance));
    setElementText("duration", formatDuration(time));
    setElementText("waypoint-count", state.waypoints.length);
}

function setElementText(id, text) {
    document.getElementById(id).textContent = text;
}

function formatDistance(meters) {
    return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
    return `${Math.round(seconds / 60)} min`;
}

function updateWaypointsList() {
    const html = state.waypoints
        .map((waypoint, index) => createWaypointListItem(waypoint, index))
        .join("");

    document.getElementById("waypoints-list").innerHTML = html;
}

function createWaypointListItem(waypoint, index) {
    const label = getWaypointLabel(waypoint, index);
    const canRemove = waypoint.type === "via";
    const removeButton = canRemove
        ? `<button class="waypoint-remove" onclick="removeWaypoint(${index})">×</button>`
        : "";
    const waypointNumber = index + 1;

    return `
    <div class="waypoint-item ${waypoint.type}">
      <span class="waypoint-number-badge" style="background-color: ${getMarkerColor(index)}">${waypointNumber}</span>
      <span class="waypoint-label">${label}</span>
      <span class="waypoint-coords">${waypoint.lat.toFixed(5)}, ${waypoint.lon.toFixed(5)}</span>
      ${removeButton}
    </div>
  `;
}

function getWaypointLabel(waypoint, index) {
    if (waypoint.type === "origin") return "Start";
    if (waypoint.type === "destination") return "End";
    return `Via ${index}`;
}

function setLoadingState(loading) {
    state.isLoading = loading;
    loadingIndicator.classList.toggle("visible", loading);
}

// ═══════════════════════════════════════════════════════════════
// Global Event Handlers
// ═══════════════════════════════════════════════════════════════

window.removeWaypoint = async (index) => {
    await removeViaPointAtIndex(index);
};

document.getElementById("reset-btn").addEventListener("click", async () => {
    await withWaypointLock(async () => {
        state.waypoints = [...INITIAL_WAYPOINTS];
        await fetchAndRenderRoute();
    });
});

// ═══════════════════════════════════════════════════════════════
// Application Bootstrap
// ═══════════════════════════════════════════════════════════════

fetchAndRenderRoute();
