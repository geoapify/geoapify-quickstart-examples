/* Geoapify Routing API — Minimal Route Drag & Edit with MapLibre GL
   Click route to add via points, drag markers to edit route.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */

const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// Marker colors (cycles through for each waypoint)
const MARKER_COLORS = ["#4CAF50", "#2196F3", "#9C27B0", "#FF9800", "#00BCD4", "#E91E63", "#f44336", "#795548"];

function getMarkerColor(index) {
    return MARKER_COLORS[index % MARKER_COLORS.length];
}

// Operation lock to prevent concurrent waypoint modifications
let isProcessingWaypoint = false;
const OPERATION_COOLDOWN_MS = 300;

async function withWaypointLock(operation) {
    if (isProcessingWaypoint) return false;
    
    isProcessingWaypoint = true;
    try {
        await operation();
        return true;
    } finally {
        setTimeout(() => {
            isProcessingWaypoint = false;
        }, OPERATION_COOLDOWN_MS);
    }
}

// Unique ID generator for waypoints
let waypointIdCounter = 0;
function generateWaypointId() {
    return `wp_${++waypointIdCounter}`;
}

// Initial waypoints with unique IDs
let waypoints = [
    {id: generateWaypointId(), lat: 48.8584, lon: 2.2945, type: "start"},
    {id: generateWaypointId(), lat: 48.8738, lon: 2.2950, type: "end"}
];

// Floating marker state
let floatingMarker = null;
let routeGeometry = null;
let isInitialLoad = true;

// Map setup
const map = new maplibregl.Map({
    container: "map",
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${yourAPIKey}`,
    center: [2.32, 48.865],
    zoom: 13
});

map.on("load", async () => {
    await fetchRoute();
});

// Fetch and render route
async function fetchRoute() {
    const waypointsStr = waypoints.map(w => `${w.lat},${w.lon}`).join("|");
    const url = `https://api.geoapify.com/v1/routing?waypoints=${waypointsStr}&mode=drive&apiKey=${yourAPIKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.features?.[0]) {
            const geometry = data.features[0].geometry;
            const props = data.features[0].properties;

            routeGeometry = geometry; // Store for hover detection
            renderRoute(geometry);
            renderMarkers();
            setupFloatingMarker();
            updateInfo(props.distance, props.time);

            // Fit map to route bounds only on initial load
            if (isInitialLoad) {
                const bounds = waypoints.reduce((bounds, wp) => {
                    return bounds.extend([wp.lon, wp.lat]);
                }, new maplibregl.LngLatBounds());

                map.fitBounds(bounds, {padding: 100});
                isInitialLoad = false;
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

// Render route line
function renderRoute(geometry) {
    if (map.getSource("route")) {
        map.getSource("route").setData({type: "Feature", geometry});
    } else {
        map.addSource("route", {
            type: "geojson",
            data: {type: "Feature", geometry}
        });

        // Route outline (wider, for better hover detection)
        map.addLayer({
            id: "route-outline",
            type: "line",
            source: "route",
            paint: {
                "line-color": "#1565C0",
                "line-width": 8,
                "line-opacity": 0.9
            },
            layout: {
                "line-cap": "round"
            }
        });

        // Main route line
        map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            paint: {
                "line-color": "#2196F3",
                "line-width": 5
            },
            layout: {
                "line-cap": "round"
            }
        });
    }
}

// Find best insertion index for new via point
function findBestIndex(lat, lon) {
    let bestIndex = 1;
    let minDist = Infinity;

    for (let i = 0; i < waypoints.length - 1; i++) {
        const dist = distToSegment(
            {lat, lon},
            {lat: waypoints[i].lat, lon: waypoints[i].lon},
            {lat: waypoints[i + 1].lat, lon: waypoints[i + 1].lon}
        );

        if (dist < minDist) {
            minDist = dist;
            bestIndex = i + 1;
        }
    }

    return bestIndex;
}

function distToSegment(p, a, b) {
    const dx = b.lon - a.lon;
    const dy = b.lat - a.lat;
    const t = Math.max(0, Math.min(1,
        ((p.lon - a.lon) * dx + (p.lat - a.lat) * dy) / (dx * dx + dy * dy || 1)
    ));
    const projLat = a.lat + t * dy;
    const projLon = a.lon + t * dx;
    return Math.sqrt((p.lat - projLat) ** 2 + (p.lon - projLon) ** 2);
}

// Create marker icon
function createMarkerIcon(type, index) {
    const color = getMarkerColor(index).replace('#', '%23');
    const el = document.createElement("img");
    el.src = `https://api.geoapify.com/v2/icon?type=awesome&color=${color}&text=${index + 1}&size=48&contentSize=20&scaleFactor=2&apiKey=${yourAPIKey}`;
    el.className = "marker";
    el.style.width = "36px";
    el.style.height = "48px";
    
    // Determine tooltip text
    let tooltipText;
    if (type === "via") {
        tooltipText = "Drag to move • Click to remove";
    } else {
        const label = type === "start" ? "Origin" : "Destination";
        tooltipText = `${label} • Drag to reposition`;
    }
    
    return {element: el, anchor: "bottom", tooltipText};
}

// Render draggable markers
function renderMarkers() {
    document.querySelectorAll(".maplibregl-marker").forEach(el => el.remove());

    waypoints.forEach((wp, index) => {
        const {element, anchor, tooltipText} = createMarkerIcon(wp.type, index);
        const waypointId = wp.id; // Capture ID, not index (indices shift on removal)

        // Add native tooltip
        element.title = tooltipText;

        const marker = new maplibregl.Marker({element, draggable: true, anchor})
            .setLngLat([wp.lon, wp.lat])
            .addTo(map);

        // Increase z-index so markers are always above route
        marker.getElement().style.zIndex = "10";

        // Click to remove via points (using ID to prevent double-removal bugs)
        if (wp.type === "via") {
            element.addEventListener("click", async (e) => {
                e.stopPropagation();
                await withWaypointLock(async () => {
                    const currentIndex = waypoints.findIndex(w => w.id === waypointId);
                    if (currentIndex !== -1 && waypoints[currentIndex].type === "via") {
                        waypoints.splice(currentIndex, 1);
                        await fetchRoute();
                    }
                });
            });
        }

        // Drag to update route (using ID for safety)
        marker.on("dragend", async () => {
            await withWaypointLock(async () => {
                const currentIndex = waypoints.findIndex(w => w.id === waypointId);
                if (currentIndex !== -1) {
                    const {lng, lat} = marker.getLngLat();
                    waypoints[currentIndex].lat = lat;
                    waypoints[currentIndex].lon = lng;
                    await fetchRoute();
                }
            });
        });
    });
}

// Setup floating marker for route hover
function setupFloatingMarker() {
    // Remove old marker if exists
    if (floatingMarker) {
        floatingMarker.remove();
    }

    // Create floating marker element
    const el = document.createElement("div");
    el.className = "floating-marker";
    el.style.width = "20px";
    el.style.height = "20px";
    el.style.background = "#fff";
    el.style.border = "3px solid #2196F3";
    el.style.borderRadius = "50%";
    el.style.cursor = "grab";
    el.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.3)";
    el.style.opacity = "0";
    el.style.transition = "opacity 0.2s";

    floatingMarker = new maplibregl.Marker({
        element: el,
        draggable: true,
        anchor: "center"
    }).setLngLat([0, 0]).addTo(map);

    let isDragging = false;
    let isHovering = false;

    // Show marker on route hover
    map.on("mousemove", "route-outline", (e) => {
        if (isProcessingWaypoint || isDragging) return;
        
        isHovering = true;
        const nearestPoint = findNearestPointOnRoute(e.lngLat);
        floatingMarker.setLngLat(nearestPoint);
        el.style.opacity = "1";
    });

    map.on("mouseleave", "route-outline", () => {
        isHovering = false;
        setTimeout(() => {
            if (!isHovering && !isDragging) {
                el.style.opacity = "0";
            }
        }, 50);
    });

    // Marker hover
    el.addEventListener("mouseenter", () => {
        isHovering = true;
        el.style.opacity = "1";
    });

    el.addEventListener("mouseleave", () => {
        isHovering = false;
        if (!isDragging) {
            el.style.opacity = "0";
        }
    });

    // Drag to add via point
    floatingMarker.on("dragstart", () => {
        isDragging = true;
        el.style.cursor = "grabbing";
        el.style.background = "#2196F3";
    });

    floatingMarker.on("dragend", async () => {
        isDragging = false;
        el.style.cursor = "grab";
        el.style.background = "#fff";
        el.style.opacity = "0";

        const {lng, lat} = floatingMarker.getLngLat();
        await withWaypointLock(async () => {
            const insertIndex = findBestIndex(lat, lng);
            waypoints.splice(insertIndex, 0, {
                id: generateWaypointId(),
                lat,
                lon: lng,
                type: "via"
            });
            await fetchRoute();
        });
    });

    // Cursor style
    map.on("mouseenter", "route-outline", () => {
        if (!isDragging) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "route-outline", () => {
        map.getCanvas().style.cursor = "";
    });
}

// Find nearest point on route to given point
function findNearestPointOnRoute(point) {
    if (!routeGeometry) return point;

    const coords = extractRouteCoordinates(routeGeometry);
    let minDistance = Infinity;
    let nearestPoint = [point.lng, point.lat];

    for (let i = 0; i < coords.length - 1; i++) {
        const segmentStart = coords[i];
        const segmentEnd = coords[i + 1];
        const projected = projectPointOnSegment(point, segmentStart, segmentEnd);
        
        const dx = projected[0] - point.lng;
        const dy = projected[1] - point.lat;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = projected;
        }
    }

    return {lng: nearestPoint[0], lat: nearestPoint[1]};
}

// Extract all coordinates from route geometry
function extractRouteCoordinates(geometry) {
    const coords = [];
    if (geometry.type === "LineString") {
        coords.push(...geometry.coordinates);
    } else if (geometry.type === "MultiLineString") {
        geometry.coordinates.forEach(line => {
            coords.push(...line);
        });
    }
    return coords;
}

// Project point onto line segment
function projectPointOnSegment(point, segmentStart, segmentEnd) {
    const x = point.lng - segmentStart[0];
    const y = point.lat - segmentStart[1];
    
    const dx = segmentEnd[0] - segmentStart[0];
    const dy = segmentEnd[1] - segmentStart[1];
    
    const lengthSquared = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, (x * dx + y * dy) / lengthSquared));
    
    return [
        segmentStart[0] + t * dx,
        segmentStart[1] + t * dy
    ];
}

// Update info display
function updateInfo(distance, time) {
    document.getElementById("info").textContent =
        `${(distance / 1000).toFixed(1)} km • ${Math.round(time / 60)} min • ${waypoints.length} points`;
}
