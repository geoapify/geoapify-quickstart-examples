/* Geoapify Routing API Demo - Collect Waypoints
   Features: Address autocomplete, map click, drag & drop reorder
   Get your API key at https://www.geoapify.com */

const API_KEY = "e95f313d38334f9f955e65b71a289126";

// Waypoint colors (cycles through for each waypoint)
const COLORS = ["#4CAF50", "#2196F3", "#9C27B0", "#FF9800", "#00BCD4", "#E91E63", "#f44336", "#795548"];
const getColor = (idx) => COLORS[idx % COLORS.length];

// Map tiles for light/dark themes
const TILES = {
    light: "https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey=" + API_KEY,
    dark: "https://maps.geoapify.com/v1/tile/dark-matter-brown/{z}/{x}/{y}@2x.png?apiKey=" + API_KEY
};

// State
let waypoints = [];
let activeIdx = 0;
let tileLayer;
let routeLayer = null;

// Initialize map
const map = L.map("map", {zoomControl: false}).setView([48.8566, 2.3522], 12);
L.control.zoom({position: "bottomright"}).addTo(map);
setMapTiles("light");

// Initialize with 2 empty waypoints
addWaypoint();
addWaypoint();

// Add waypoint button
document.getElementById("add-btn").onclick = addWaypoint;

// Build route button
document.getElementById("build-route-btn").onclick = buildRoute;

// Map click → reverse geocode → fill first empty waypoint
map.on("click", async (e) => {
    if (activeIdx < 0) return;

    const {lat, lng} = e.latlng;
    const res = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${API_KEY}`);
    const data = await res.json();

    if (data.features?.[0]) {
        const p = data.features[0].properties;
        setWaypoint(activeIdx, p.lat, p.lon, p.formatted);
    }
});

// Add empty waypoint
function addWaypoint() {
    waypoints.push({lat: null, lon: null, formatted: null, marker: null, autocomplete: null});
    renderList();
}

// Remove waypoint
window.removeWaypoint = (idx) => {
    if (waypoints.length <= 2) return;
    if (waypoints[idx].marker) map.removeLayer(waypoints[idx].marker);
    waypoints.splice(idx, 1);
    renderList();
    clearRoute();
};

// Set waypoint data
function setWaypoint(idx, lat, lon, formatted) {
    const wp = waypoints[idx];
    wp.lat = lat;
    wp.lon = lon;
    wp.formatted = formatted;
    wp.autocomplete?.setValue(formatted);
    updateMarker(idx);
    updateDot(idx);
    updateActiveIdx();
    fitBounds();
    clearRoute();
}

// Clear waypoint data
function clearWaypoint(idx) {
    const wp = waypoints[idx];
    if (wp.marker) {
        map.removeLayer(wp.marker);
        wp.marker = null;
    }
    wp.lat = wp.lon = wp.formatted = null;
    updateDot(idx);
    updateActiveIdx();
    clearRoute();
}

// Find first empty waypoint
function updateActiveIdx() {
    activeIdx = waypoints.findIndex(wp => !wp.lat);
    waypoints.forEach((wp, idx) => {
        const input = document.querySelector(`#ac-${idx} input`);
        if (input) input.placeholder = idx === activeIdx ? "Enter address or click map" : "Enter address";
    });
}

// Update dot visual
function updateDot(idx) {
    const dot = document.querySelector(`.wp-row[data-idx="${idx}"] .dot`);
    if (!dot) return;
    dot.className = waypoints[idx].lat ? "dot" : "dot empty";
    dot.style.background = waypoints[idx].lat ? getColor(idx) : "";
}

// Render waypoint list
function renderList() {
    const container = document.getElementById("waypoints");
    container.innerHTML = "";

    waypoints.forEach((wp, idx) => {
        const row = document.createElement("div");
        row.className = "wp-row";
        row.draggable = true;
        row.dataset.idx = idx;

        // Drag & drop
        row.ondragstart = (e) => {
            e.dataTransfer.setData("idx", idx);
            row.classList.add("dragging");
        };
        row.ondragend = () => row.classList.remove("dragging");
        row.ondragover = (e) => {
            e.preventDefault();
            row.classList.add("drag-over");
        };
        row.ondragleave = () => row.classList.remove("drag-over");
        row.ondrop = (e) => {
            e.preventDefault();
            row.classList.remove("drag-over");
            const from = +e.dataTransfer.getData("idx");
            if (from !== idx) {
                clearRoute();
                waypoints.splice(idx, 0, waypoints.splice(from, 1)[0]);
                renderList();
            }
        };

        const isFirst = idx === 0, isLast = idx === waypoints.length - 1;
        const lineClass = isFirst ? "first" : isLast ? "last" : "";
        const dotStyle = wp.lat ? `style="background:${getColor(idx)}"` : "";

        row.innerHTML = `
      <div class="wp-icon">
        <div class="line ${lineClass}"></div>
        <div class="dot ${wp.lat ? '' : 'empty'}" ${dotStyle}></div>
      </div>
      <div class="wp-input" id="ac-${idx}"></div>
      <div class="wp-remove" ${waypoints.length <= 2 ? 'style="visibility:hidden"' : ''} onclick="removeWaypoint(${idx})">
        <svg viewBox="0 0 24 24" width="22" height="22">
          <circle cx="12" cy="12" r="10" fill="currentColor"/>
          <rect x="7" y="10.5" width="10" height="3" rx="1" fill="white"/>
        </svg>
      </div>
    `;
        container.appendChild(row);

        // Setup autocomplete
        wp.autocomplete = new autocomplete.GeocoderAutocomplete(
            document.getElementById(`ac-${idx}`), API_KEY, {placeholder: "Enter address"}
        );
        if (wp.formatted) wp.autocomplete.setValue(wp.formatted);

        wp.autocomplete.on("select", (loc) => {
            loc ? setWaypoint(idx, loc.properties.lat, loc.properties.lon, loc.properties.formatted) : clearWaypoint(idx);
        });
    });

    waypoints.forEach((wp, idx) => {
        if (wp.lat) updateMarker(idx);
    });
    updateActiveIdx();
}

// Update marker on map
function updateMarker(idx) {
    const wp = waypoints[idx];
    if (wp.marker) map.removeLayer(wp.marker);
    if (!wp.lat) return;

    const color = getColor(idx).replace('#', '%23'); // URL encode hex color
    const icon = L.icon({
        iconUrl: `https://api.geoapify.com/v2/icon?type=awesome&color=${color}&text=${idx + 1}&size=48&contentSize=20&scaleFactor=2&apiKey=${API_KEY}`,
        iconSize: [36, 48],
        iconAnchor: [18, 48],
        popupAnchor: [0, -48]
    });

    wp.marker = L.marker([wp.lat, wp.lon], {icon, draggable: true}).addTo(map).bindPopup(wp.formatted);

    // Drag marker → reverse geocode
    wp.marker.on("dragend", async () => {
        const {lat, lng} = wp.marker.getLatLng();
        const res = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${API_KEY}`);
        const data = await res.json();
        if (data.features?.[0]) {
            const p = data.features[0].properties;
            wp.lat = p.lat;
            wp.lon = p.lon;
            wp.formatted = p.formatted;
            wp.autocomplete.setValue(p.formatted);
            wp.marker.setPopupContent(p.formatted);
            clearRoute();
        }
    });
}

// Fit map to markers
function fitBounds() {
    const valid = waypoints.filter(w => w.lat);
    if (!valid.length) return;
    if (valid.length === 1) return map.setView([valid[0].lat, valid[0].lon], 14);
    map.fitBounds(valid.map(w => [w.lat, w.lon]), {padding: [50, 50]});
}

// Theme handling
function setMapTiles(theme) {
    if (tileLayer) map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(TILES[theme], {
        attribution: '© <a href="https://www.geoapify.com/">Geoapify</a> © OpenMapTiles © OpenStreetMap',
        maxZoom: 20
    }).addTo(map);
}

function setTheme(name) {
    document.getElementById("geocoder-theme").href =
        `https://cdn.jsdelivr.net/npm/@geoapify/geocoder-autocomplete@3.0.1/styles/${name}.css`;
    document.body.className = `theme-${name}`;
    setMapTiles(name.includes("dark") ? "dark" : "light");
    localStorage.setItem("theme", name);
}

// Load saved theme
window.onload = () => {
    const saved = localStorage.getItem("theme") || "minimal";
    document.getElementById("theme-selector").value = saved;
    setTheme(saved);
};

// Build route from waypoints
async function buildRoute() {
    const validWaypoints = waypoints.filter(wp => wp.lat && wp.lon);
    
    if (validWaypoints.length < 2) {
        alert("Please add at least 2 waypoints to build a route");
        return;
    }

    const waypointsParam = validWaypoints.map(wp => `${wp.lat},${wp.lon}`).join("|");
    const url = `https://api.geoapify.com/v1/routing?waypoints=${waypointsParam}&mode=drive&apiKey=${API_KEY}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.features?.[0]) {
            renderRoute(data.features[0]);
        }
    } catch (error) {
        console.error("Error building route:", error);
        alert("Failed to build route. Please try again.");
    }
}

// Render route on map
function renderRoute(feature) {
    clearRoute();

    routeLayer = L.geoJSON(feature, {
        style: {
            color: "#2196F3",
            weight: 6,
            opacity: 0.8,
            lineCap: "round",
            lineJoin: "round"
        }
    }).addTo(map);

    // Fit map to show entire route
    map.fitBounds(routeLayer.getBounds(), {padding: [50, 50]});
}

// Clear route from map
function clearRoute() {
    if (routeLayer) {
        map.removeLayer(routeLayer);
        routeLayer = null;
    }
}
