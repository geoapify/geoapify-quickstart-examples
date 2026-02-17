/* Geoapify Printable Route Directions - Complete Demo
   Click on map to add waypoints, combines all techniques from Series 1-4
   Get your API key at https://www.geoapify.com */

const apiKey = "e95f313d38334f9f955e65b71a289126";

// ─────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────

let waypoints = [];
let markers = [];
let routeLayer = null;
let chartInstance = null;

// ─────────────────────────────────────────────────────────────
// Map Setup
// ─────────────────────────────────────────────────────────────

const map = L.map("map", {zoomControl: false}).setView([48.8566, 2.3522], 6);
L.control.zoom({position: "bottomright"}).addTo(map);

L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey=${apiKey}`, {
  attribution: '© <a href="https://www.geoapify.com/">Geoapify</a> © OpenMapTiles © OpenStreetMap',
  maxZoom: 20
}).addTo(map);

// Add waypoint on map click
map.on("click", async (e) => {
  addWaypoint(e.latlng.lat, e.latlng.lng);
});

// ─────────────────────────────────────────────────────────────
// Waypoint Management
// ─────────────────────────────────────────────────────────────

function addWaypoint(lat, lon) {
  waypoints.push({lat, lon});
  updateWaypointList();
  updateMarkers();
  
  if (waypoints.length >= 2) {
    calculateRoute();
  }
}

function removeWaypoint(index) {
  waypoints.splice(index, 1);
  updateWaypointList();
  updateMarkers();
  
  if (waypoints.length >= 2) {
    calculateRoute();
  } else {
    clearRoute();
    document.getElementById("results").classList.add("hidden");
  }
}

function clearAllWaypoints() {
  waypoints = [];
  updateWaypointList();
  updateMarkers();
  clearRoute();
  document.getElementById("results").classList.add("hidden");
}

function updateWaypointList() {
  const list = document.getElementById("waypoint-list");
  list.innerHTML = waypoints.map((wp, i) => `
    <div class="waypoint-item">
      <div class="waypoint-number">${i + 1}</div>
      <div class="waypoint-coords">${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)}</div>
      <span class="waypoint-remove" onclick="removeWaypoint(${i})">×</span>
    </div>
  `).join("");
}

function updateMarkers() {
  markers.forEach(m => m.remove());
  markers = [];

  waypoints.forEach((wp, i) => {
    const color = i === 0 ? "%2343A047" : i === waypoints.length - 1 ? "%23E91E63" : "%232196F3";
    const icon = i === 0 ? "circle" : i === waypoints.length - 1 ? "flag" : "circle";
    
    markers.push(L.marker([wp.lat, wp.lon], {
      icon: L.icon({
        iconUrl: `https://api.geoapify.com/v2/icon?type=awesome&color=${color}&icon=${icon}&size=48&scaleFactor=2&apiKey=${apiKey}`,
        iconSize: [36, 48],
        iconAnchor: [18, 48]
      })
    }).addTo(map));
  });

  if (waypoints.length > 1) {
    map.fitBounds(waypoints.map(wp => [wp.lat, wp.lon]), {padding: [50, 50]});
  }
}

// ─────────────────────────────────────────────────────────────
// Routing
// ─────────────────────────────────────────────────────────────

async function calculateRoute() {
  const waypointsParam = waypoints.map(wp => `${wp.lat},${wp.lon}`).join("|");
  const url = `https://api.geoapify.com/v1/routing?waypoints=${waypointsParam}&mode=drive&details=elevation&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      alert("No route found");
      return;
    }

    const route = data.features[0];
    drawRoute(route);
    generateStaticPreview(route);
    displayRouteSummary(route);
    generateDirections(route);
    drawElevation(route);
    
    document.getElementById("results").classList.remove("hidden");
  } catch (error) {
    console.error("Error calculating route:", error);
    alert("Failed to calculate route");
  }
}

function drawRoute(geojson) {
  if (routeLayer) map.removeLayer(routeLayer);
  routeLayer = L.geoJSON(geojson, {
    style: {color: "#3498db", weight: 5, opacity: 0.8}
  }).addTo(map);
}

function clearRoute() {
  if (routeLayer) {
    map.removeLayer(routeLayer);
    routeLayer = null;
  }
}

// ─────────────────────────────────────────────────────────────
// Route Summary
// ─────────────────────────────────────────────────────────────

function displayRouteSummary(route) {
  const distance = (route.properties.distance / 1000).toFixed(1);
  const time = Math.round(route.properties.time / 60);
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  const timeFormatted = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  document.getElementById("route-summary").innerHTML = `
    <div class="summary-item">
      <div class="label">Distance</div>
      <div class="value">${distance} km</div>
    </div>
    <div class="summary-item">
      <div class="label">Duration</div>
      <div class="value">${timeFormatted}</div>
    </div>
    <div class="summary-item">
      <div class="label">Steps</div>
      <div class="value">${route.properties.legs[0].steps.length}</div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────
// Static Route Preview
// ─────────────────────────────────────────────────────────────

async function generateStaticPreview(geojson) {
  geojson.properties.linecolor = "#3498db";
  geojson.properties.linewidth = "5";

  const response = await fetch(`https://maps.geoapify.com/v1/staticmap?apiKey=${apiKey}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      style: "osm-bright",
      width: 800,
      height: 250,
      scaleFactor: 2,
      geojson: geojson,
      markers: geojson.properties.waypoints.map(wp => ({
        lat: wp.location[1],
        lon: wp.location[0],
        color: "#ff0000",
        size: "medium"
      }))
    })
  });

  const blob = await response.blob();
  document.getElementById("route-preview").src = URL.createObjectURL(blob);
}

// ─────────────────────────────────────────────────────────────
// Turn-by-Turn Directions with Step Previews
// ─────────────────────────────────────────────────────────────

function generateDirections(geojson) {
  let html = "";

  geojson.properties.legs.forEach((leg, legIndex) => {
    leg.steps.forEach((step, i) => {
      const dist = step.distance >= 1000 
        ? `${(step.distance / 1000).toFixed(1)} km` 
        : `${Math.round(step.distance)} m`;

      const previewUrl = generateStepPreviewUrl(legIndex, step, geojson.geometry.coordinates);

      html += `
        <div class="direction-step">
          <div class="step-number">${i + 1}</div>
          <div class="step-content">
            <div class="step-instruction">${step.instruction.text}</div>
            <div class="step-meta">${dist}</div>
          </div>
          <div class="step-preview-container loading" data-url="${previewUrl}" data-step="${i + 1}"></div>
        </div>
      `;
    });
  });

  document.getElementById("directions").innerHTML = html;

  // Load images with animation
  document.querySelectorAll('.step-preview-container').forEach(container => {
    const img = new Image();
    img.onload = () => {
      container.classList.remove('loading');
      img.className = 'step-preview';
      container.innerHTML = '';
      container.appendChild(img);
    };
    img.alt = `Step ${container.dataset.step}`;
    img.src = container.dataset.url;
  });
}

function generateStepPreviewUrl(legIndex, step, coordinates) {
  const coords = coordinates[legIndex];
  const turnCoordinate = coords[step.from_index];
  const markerCoordinates = `${turnCoordinate[0]},${turnCoordinate[1]}`;

  // Check if it's a start or finish step
  const isStart = ["StartAt", "StartAtRight", "StartAtLeft"].includes(step.instruction.type);
  const isFinish = ["DestinationReached", "DestinationReachedRight", "DestinationReachedLeft"].includes(step.instruction.type);

  // Extract coordinate segments with direction arrow
  const past = getRelatedCoordinates(coords, step, 'past');
  const next = getRelatedCoordinates(coords, step, 'next');
  const maneuver = getRelatedCoordinates(coords, step, 'manoeuvre');
  const maneuverArrow = getRelatedCoordinates(coords, step, 'manoeuvre-arrow');

  // Build geometries array
  const geometries = [];
  
  if (!isStart) {
    geometries.push(`polyline:${past};linewidth:5;linecolor:${encodeURIComponent('#ad9aad')}`);
  }
  
  if (!isFinish) {
    geometries.push(`polyline:${next};linewidth:5;linecolor:${encodeURIComponent('#eb44ea')}`);
  }
  
  if (!isFinish) {
    geometries.push(`polyline:${maneuver};linewidth:7;linecolor:${encodeURIComponent('#333333')};lineopacity:1`);
    geometries.push(`polyline:${maneuver};linewidth:5;linecolor:${encodeURIComponent('#ffffff')};lineopacity:1`);
    geometries.push(`polygon:${maneuverArrow};linewidth:1;linecolor:${encodeURIComponent('#333333')};lineopacity:1;fillcolor:${encodeURIComponent('#ffffff')};fillopacity:1`);
  }

  // Calculate bearing
  const bearing = getBearing(coords, step) + 180;

  // Add finish marker if needed
  const icon = isFinish ? `&marker=lonlat:${markerCoordinates};type:material;color:%23539de4;icon:flag-checkered;icontype:awesome;whitecircle:no` : '';

  return `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=250&height=150&apiKey=${apiKey}&geometry=${geometries.join('|')}&center=lonlat:${markerCoordinates}&zoom=16&scaleFactor=2&bearing=${bearing}&pitch=45${icon}`;
}

// Extract coordinates for different route segments
function getRelatedCoordinates(coordinatesArray, step, direction) {
  const currentIndex = step.from_index;
  const numberOfPoints = 20;
  let coords;

  if (direction === 'past') {
    // Gray line: where you came from
    coords = getCoordinateSlice(coordinatesArray, currentIndex - numberOfPoints, currentIndex + 1);
    
  } else if (direction === 'next') {
    // Pink line: where you're going
    coords = getCoordinateSlice(coordinatesArray, currentIndex, currentIndex + numberOfPoints + 1);
    
  } else if (direction === 'manoeuvre') {
    // White line: the actual turn
    coords = getManeuverSegment(coordinatesArray, currentIndex, numberOfPoints);
    
  } else if (direction === 'manoeuvre-arrow') {
    // Arrow polygon: direction indicator
    coords = createDirectionArrow(coordinatesArray, currentIndex, numberOfPoints);
  }

  return coords ? coords.map(c => `${c[0]},${c[1]}`).join(",") : "";
}

function getCoordinateSlice(coords, start, end) {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(coords.length, end);
  return coords.slice(safeStart, safeEnd);
}

function getManeuverSegment(coords, turnIndex, range) {
  const segment = getCoordinateSlice(coords, turnIndex - range, turnIndex + range + 1);
  const turnPoint = coords[turnIndex];
  const circle = turf.circle(turnPoint, 0.02);
  const bbox = turf.bbox(circle);
  
  let clipped = turf.bboxClip(turf.lineString(segment), bbox);
  
  if (clipped.geometry.type === 'MultiLineString') {
    const centerPoint = turf.point(turnPoint);
    clipped = turf.lineString(
      clipped.geometry.coordinates.find(line => 
        turf.booleanContains(turf.lineString(line), centerPoint)
      )
    );
  }
  
  const endPoint = clipped.geometry.coordinates[clipped.geometry.coordinates.length - 1];
  const smallCircle = turf.circle(endPoint, 0.01);
  const smallBbox = turf.bbox(smallCircle);
  
  let arrowSegment = turf.bboxClip(clipped, smallBbox);
  if (arrowSegment.geometry.type === 'MultiLineString') {
    arrowSegment = turf.lineString(arrowSegment.geometry.coordinates[arrowSegment.geometry.coordinates.length - 1]);
  }
  
  if (clipped.geometry.coordinates.length && arrowSegment.geometry.coordinates.length) {
    const segment = turf.lineSlice(
      clipped.geometry.coordinates[0],
      arrowSegment.geometry.coordinates[0],
      clipped
    );
    return segment.geometry.coordinates;
  }
  
  return clipped.geometry.coordinates;
}

function createDirectionArrow(coords, turnIndex, range) {
  const segment = getCoordinateSlice(coords, turnIndex - range, turnIndex + range + 1);
  const turnPoint = coords[turnIndex];
  
  const circle = turf.circle(turnPoint, 0.02);
  const bbox = turf.bbox(circle);
  let clipped = turf.bboxClip(turf.lineString(segment), bbox);
  
  if (clipped.geometry.type === 'MultiLineString') {
    clipped = turf.lineString(
      clipped.geometry.coordinates.find(line =>
        turf.booleanContains(turf.lineString(line), turf.point(turnPoint))
      )
    );
  }
  
  const endPoint = clipped.geometry.coordinates[clipped.geometry.coordinates.length - 1];
  const smallCircle = turf.circle(endPoint, 0.01);
  const smallBbox = turf.bbox(smallCircle);
  
  let arrowBase = turf.bboxClip(clipped, smallBbox);
  if (arrowBase.geometry.type === 'MultiLineString') {
    arrowBase = turf.lineString(arrowBase.geometry.coordinates[arrowBase.geometry.coordinates.length - 1]);
  }
  
  const startPoint = arrowBase.geometry.coordinates[0];
  const bearing = turf.bearing(startPoint, endPoint);
  
  // Arrow triangle: tip, left wing, right wing, back to tip
  return [
    endPoint,
    turf.destination(startPoint, 0.005, bearing + 90).geometry.coordinates,
    turf.destination(startPoint, 0.005, bearing - 90).geometry.coordinates,
    endPoint
  ];
}

function getBearing(coordinatesArray, step) {
  let currentCoordinateIndex = step.from_index;
  let currentCoordinate = coordinatesArray[currentCoordinateIndex];
  let bearingCoordinateIndex = currentCoordinateIndex > 0 ? currentCoordinateIndex - 1 : currentCoordinateIndex + 1;
  let bearingCoordinate = coordinatesArray[bearingCoordinateIndex];

  while (true) {
    if (turf.length(turf.lineString([bearingCoordinate, currentCoordinate])) >= 0.005 /* 5 meters */) {
      break;
    }

    if (bearingCoordinateIndex === 0 || bearingCoordinateIndex === coordinatesArray.length - 1) {
      break;
    }

    bearingCoordinateIndex = currentCoordinateIndex > 0 ? bearingCoordinateIndex - 1 : bearingCoordinateIndex + 1;
    bearingCoordinate = coordinatesArray[bearingCoordinateIndex];
  }
  
  return currentCoordinateIndex > 0 
    ? turf.bearing(turf.point(currentCoordinate), turf.point(bearingCoordinate)) 
    : turf.bearing(turf.point(bearingCoordinate), turf.point(currentCoordinate));
}

// ─────────────────────────────────────────────────────────────
// Elevation Profile
// ─────────────────────────────────────────────────────────────

function drawElevation(geojson) {
  if (chartInstance) chartInstance.destroy();

  const elevation = geojson.properties.legs[0].elevation_range;
  if (!elevation || elevation.length === 0) {
    document.getElementById("elevation-section").classList.add("hidden");
    return;
  }

  document.getElementById("elevation-section").classList.remove("hidden");

  chartInstance = new Chart(document.getElementById("elevation-chart"), {
    type: "line",
    data: {
      labels: elevation.map(p => p[0]),
      datasets: [{
        data: elevation.map(p => p[1]),
        borderColor: "#3498db",
        backgroundColor: "rgba(52, 152, 219, 0.2)",
        fill: true,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    plugins: [{
      beforeInit: (chart) => {
        const maxHeight = Math.max(...chart.data.datasets[0].data);
        chart.options.scales.x.min = Math.min(...chart.data.labels);
        chart.options.scales.x.max = Math.max(...chart.data.labels);
        chart.options.scales.y.max = maxHeight + Math.round(maxHeight * 0.2);
      }
    }],
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      scales: {
        x: {
          type: 'linear',
          title: {display: true, text: "Distance (m)"}
        },
        y: {
          type: 'linear',
          beginAtZero: true,
          title: {display: true, text: "Elevation (m)"}
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Distance, m / Elevation, m',
          align: 'end'
        },
        legend: {display: false},
        tooltip: {
          displayColors: false,
          callbacks: {
            title: (tooltipItems) => {
              return `Distance: ${tooltipItems[0].label}m`;
            },
            label: (tooltipItem) => {
              return `Elevation: ${tooltipItem.raw}m`;
            }
          }
        }
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────
// Event Listeners
// ─────────────────────────────────────────────────────────────

document.getElementById("add-waypoint-btn").onclick = () => {
  const lat = 48.8566 + (Math.random() - 0.5) * 2;
  const lon = 2.3522 + (Math.random() - 0.5) * 2;
  addWaypoint(lat, lon);
};

document.getElementById("clear-btn").onclick = clearAllWaypoints;
document.getElementById("print-btn").onclick = () => window.print();

// Make functions globally available
window.removeWaypoint = removeWaypoint;
