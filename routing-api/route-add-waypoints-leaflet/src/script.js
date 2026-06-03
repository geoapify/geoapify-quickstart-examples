import { WaypointSelector } from "@geoapify/route-waypoint-selector";

// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// This key can be blocked or restricted at any time.
const yourApiKey = "5402608de7c44a2d95121c407ad2110b";
const markersById = new Map();
const waypointMarkerColors = [
  "#16a34a",
  "#eab308",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#65a30d",
  "#db2777",
  "#4f46e5"
];
const maxReverseGeocodeDistanceMeters = 50;
const reverseGeocodeAddressLevels = new Set([
  "amenity",
  "building",
  "street"
]);
const instructionTypeLabels = {
  None: "Continue",
  StartAt: "Start",
  StartAtRight: "Start Right",
  StartAtLeft: "Start Left",
  DestinationReached: "Destination Reached",
  DestinationReachedRight: "Destination Reached on Right",
  DestinationReachedLeft: "Destination Reached on Left",
  Straight: "Continue Straight",
  SlightRight: "Turn Slight Right",
  Right: "Turn Right",
  SharpRight: "Turn Sharp Right",
  TurnAroundRight: "Turn Around Right",
  TurnAroundLeft: "Turn Around Left",
  SharpLeft: "Turn Sharp Left",
  Left: "Turn Left",
  SlightLeft: "Turn Slight Left",
  ExitRight: "Exit Right",
  ExitLeft: "Exit Left",
  StayRight: "Stay Right",
  StayLeft: "Stay Left",
  Merge: "Merge",
  Roundabout: "Roundabout",
  FerryEnter: "Enter Ferry",
  FerryExit: "Exit Ferry",
  Transit: "Transit",
  TransitTransfer: "Transit Transfer",
  TransitRemainOn: "Remain on Transit",
  TransitConnectionStart: "Transit Connection Start",
  TransitConnectionTransfer: "Transit Connection Transfer",
  TransitConnectionDestination: "Transit Connection Destination",
  PostTransitConnectionDestination: "Post Transit Connection Destination",
  MergeRight: "Merge Right",
  MergeLeft: "Merge Left"
};
let latestRouteData = null;
let latestRoutingRequestId = 0;
let routeShadowLayer = null;
let routeLineLayer = null;
let routeStepLayer = null;
const directionsPanelElement = document.getElementById("directions-panel");
const routeSummaryElement = document.getElementById("route-summary");
const routeErrorElement = document.getElementById("route-error");
const routeInstructionsElement = document.getElementById("route-instructions");

const map = L.map("map").setView([20, 0], 4);
map.createPane("route-shadow");
map.getPane("route-shadow").style.zIndex = 399;
map.createPane("route-line");
map.getPane("route-line").style.zIndex = 400;
map.createPane("route-steps");
map.getPane("route-steps").style.zIndex = 410;

const isRetina = L.Browser.retina;
const baseUrl =
  "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey={apiKey}";
const retinaUrl =
  "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}@2x.png?apiKey={apiKey}";

L.tileLayer(isRetina ? retinaUrl : baseUrl, {
  attribution:
    'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors',
  maxZoom: 20,
  id: "osm-bright-grey",
  apiKey: yourApiKey
}).addTo(map);

fetch(`https://api.geoapify.com/v1/ipinfo?apiKey=${yourApiKey}`)
  .then((response) => response.json())
  .then((ip) => {
    const loc =
      ip.location &&
      typeof ip.location.latitude === "number" &&
      typeof ip.location.longitude === "number"
        ? { lat: ip.location.latitude, lon: ip.location.longitude }
        : null;

    if (loc && !markersById.size && !latestRouteData) {
      map.setView([loc.lat, loc.lon], 12, { animate: false });
    }
  })
  .catch((error) => {
    console.error("IP geolocation failed", error);
  });

function getWaypointMarkerIcon(index, total) {
  const color = waypointMarkerColors[index % waypointMarkerColors.length];

  return L.icon({
    iconUrl: `https://api.geoapify.com/v2/icon?type=awesome&color=${encodeURIComponent(color)}&text=${index + 1}&size=48&contentSize=20&scaleFactor=2&apiKey=${yourApiKey}`,
    iconSize: [37, 54],
    iconAnchor: [16.5, 48],
    popupAnchor: [0, -48]
  });
}

function adjustViewToMarkers() {
  const markers = Array.from(markersById.values());

  if (!markers.length) {
    return;
  }

  const bounds = map.getBounds();
  const nonVisibleMarkers = markers.filter(
    (marker) => !bounds.contains(marker.getLatLng())
  );

  if (!nonVisibleMarkers.length) {
    return;
  }

  if (markers.length === 1) {
    const currentZoom = map.getZoom();
    const targetZoom = Number.isFinite(currentZoom) ? Math.max(currentZoom, 13) : 13;

    map.setView(markers[0].getLatLng(), targetZoom, {
      animate: false
    });
    return;
  }

  const extendedBounds = nonVisibleMarkers.reduce(
    (nextBounds, marker) => nextBounds.extend(marker.getLatLng()),
    L.latLngBounds(bounds.getSouthWest(), bounds.getNorthEast())
  );

  map.fitBounds(extendedBounds, {
    animate: false,
    padding: [40, 40]
  });
}

function clearRouteVisualization() {
  if (routeShadowLayer) {
    map.removeLayer(routeShadowLayer);
    routeShadowLayer = null;
  }

  if (routeLineLayer) {
    map.removeLayer(routeLineLayer);
    routeLineLayer = null;
  }

  if (routeStepLayer) {
    map.removeLayer(routeStepLayer);
    routeStepLayer = null;
  }
}

function formatDistance(meters) {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
  if (seconds < 60) {
    return `${Math.max(1, Math.round(seconds))} sec`;
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  return restMinutes ? `${hours} hr ${restMinutes} min` : `${hours} hr`;
}

function clearRouteInstructions() {
  directionsPanelElement.classList.add("is-hidden");
  routeSummaryElement.textContent = "Add at least two resolved stops";
  routeErrorElement.classList.add("is-hidden");
  routeErrorElement.textContent = "";
  routeInstructionsElement.innerHTML = "";
}

function showRouteError(message) {
  directionsPanelElement.classList.remove("is-hidden");
  routeSummaryElement.textContent = "Route unavailable";
  routeErrorElement.textContent = message;
  routeErrorElement.classList.remove("is-hidden");
  routeInstructionsElement.innerHTML = "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatWaypointLabel(waypoint) {
  return (
    waypoint?.label ||
    `${waypoint?.lat?.toFixed(5) || ""}, ${waypoint?.lon?.toFixed(5) || ""}`
  );
}

function renderRouteInstructions(routeFeature, waypoints) {
  const distanceMeters = routeFeature.properties?.distance ?? 0;
  const timeSeconds = routeFeature.properties?.time ?? 0;
  const legs = routeFeature.properties?.legs || [];

  routeSummaryElement.textContent =
    `${formatDistance(distanceMeters)} · ${formatDuration(timeSeconds)}`;
  directionsPanelElement.classList.remove("is-hidden");
  routeErrorElement.classList.add("is-hidden");
  routeErrorElement.textContent = "";

  routeInstructionsElement.innerHTML = legs
    .map((leg, legIndex) => {
      const fromWaypoint = waypoints[legIndex];
      const toWaypoint = waypoints[legIndex + 1];
      const fromLabel = formatWaypointLabel(fromWaypoint);
      const toLabel = formatWaypointLabel(toWaypoint);
      const legSteps = (leg.steps || [])
        .map((step, stepIndex) => {
          const instruction = step.instruction || {};
          const instructionTitle = instruction.type;
          const instructionTypeMarkup = instructionTitle !== undefined
            ? `<div class="route-instruction__title"><strong>${escapeHtml(
                instructionTypeLabels[instruction.type] || String(instruction.type)
              )}</strong></div>`
            : "";
          const instructionDetails = [
            instruction.contains_next_instruction ? instruction.text : instruction.pre_transition_instruction || instruction.text || "Continue",
            instruction.post_transition_instruction
          ].filter(Boolean);

          const detailsMarkup = instructionDetails.length
            ? `
                <ul class="route-instruction__details">
                  ${instructionDetails
                    .map(
                      (detail) =>
                        `<li class="route-instruction__detail">${escapeHtml(detail)}</li>`
                    )
                    .join("")}
                </ul>
              `
            : "";

          return `
            <li class="route-instruction">
              <div class="route-instruction__index">${stepIndex + 1}</div>
              <div class="route-instruction__body">
                ${instructionTypeMarkup}

                ${detailsMarkup}
              </div>
              <div class="route-instruction__meta">
                  ${formatDistance(step.distance ?? 0)} · ${formatDuration(step.time ?? 0)}
              </div>              
            </li>
          `
        })
        .join("");

      return `
        <li class="route-leg">
          <div class="route-leg__header">
            <div class="route-leg__title">
              <div class="route-leg__eyebrow">From</div>
              <div class="route-leg__address">${escapeHtml(String(fromLabel))}</div>
              <div class="route-leg__eyebrow">to</div>
              <div class="route-leg__address">${escapeHtml(String(toLabel))}</div>
            </div>
            <div class="route-leg__meta">
              ${formatDistance(leg.distance ?? 0)} · ${formatDuration(leg.time ?? 0)}
            </div>
          </div>
          <ol class="route-leg__steps">${legSteps}</ol>
        </li>
      `;
    })
    .join("");
}

function getLegCoordinates(routeFeature, legIndex) {
  const coordinates = routeFeature.geometry?.coordinates;

  if (!coordinates) {
    return [];
  }

  if (routeFeature.geometry.type === "LineString") {
    return coordinates;
  }

  if (routeFeature.geometry.type === "MultiLineString") {
    return coordinates[legIndex] || [];
  }

  return [];
}

function visualizeRoute(routeData, waypoints) {
  const routeFeature = routeData.features?.[0];

  clearRouteVisualization();

  if (!routeFeature) {
    clearRouteInstructions();
    return;
  }

  renderRouteInstructions(routeFeature, waypoints);

  routeShadowLayer = L.geoJSON(routeFeature, {
    pane: "route-shadow",
    style: {
      color: "#000000",
      opacity: 0.18,
      weight: 10,
      lineCap: "round",
      lineJoin: "round"
    }
  }).addTo(map);

  routeLineLayer = L.geoJSON(routeFeature, {
    pane: "route-line",
    style: {
      color: "#1d4ed8",
      opacity: 0.9,
      weight: 6,
      lineCap: "round",
      lineJoin: "round"
    }
  }).addTo(map);

  routeStepLayer = L.layerGroup().addTo(map);

  (routeFeature.properties?.legs || []).forEach((leg, legIndex) => {
    const routeCoordinates = getLegCoordinates(routeFeature, legIndex);

    (leg.steps || []).forEach((step) => {
      const coordinate = routeCoordinates[step.from_index];

      if (!coordinate) {
        return;
      }

      const instructionText = step.instruction?.text || "Route step";
      const tooltipText = `${instructionText} (${Math.round(step.distance)} m)`;

      L.circleMarker([coordinate[1], coordinate[0]], {
        pane: "route-steps",
        radius: 4,
        fillColor: "#ffffff",
        color: "#1d4ed8",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      })
        .addTo(routeStepLayer)
        .bindTooltip(tooltipText);
    });
  });
}

function isWaypointResolved(waypoint) {
  if (selector) {
    return selector.isWaypointResolved(waypoint);
  }

  return Number.isFinite(waypoint.lat) && Number.isFinite(waypoint.lon);
}

function syncWaypointMarkers(waypoints) {
  const nextIds = new Set();

  waypoints.forEach((waypoint, index) => {
    if (!waypoint.id || !isWaypointResolved(waypoint)) {
      return;
    }

    nextIds.add(waypoint.id);

    const latLng = [waypoint.lat, waypoint.lon];
    const markerTitle = `${index + 1}. ${waypoint.label ?? "Waypoint"}`;
    const markerIcon = getWaypointMarkerIcon(index, waypoints.length);
    const existingMarker = markersById.get(waypoint.id);

    if (existingMarker) {
      existingMarker
        .setLatLng(latLng)
        .setIcon(markerIcon)
        .bindPopup(markerTitle);
      return;
    }

    const marker = L.marker(latLng, { icon: markerIcon })
      .addTo(map)
      .bindPopup(markerTitle);

    markersById.set(waypoint.id, marker);
  });

  for (const [id, marker] of markersById) {
    if (nextIds.has(id)) {
      continue;
    }

    marker.remove();
    markersById.delete(id);
  }
}

async function setWaypointFromMapClick(lat, lon) {
  const firstUnresolvedWaypoint = selector
    .getWaypoints()
    .find((waypoint) => !selector.isWaypointResolved(waypoint));

  if (!firstUnresolvedWaypoint?.id) {
    return;
  }

  const fallbackLabel = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: "json",
      apiKey: yourApiKey
    });
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const data = await response.json();
    const result = data?.results?.[0];
    const hasStreetOrBuildingLevel =
      (typeof result?.result_type === "string" &&
        reverseGeocodeAddressLevels.has(result.result_type)) ||
      !!result?.housenumber ||
      !!result?.street;

    const isCloseEnough =
      result &&
      typeof result.distance === "number" &&
      result.distance <= maxReverseGeocodeDistanceMeters;

    if (isCloseEnough && hasStreetOrBuildingLevel && result.formatted) {
      selector.setWaypoint(
        firstUnresolvedWaypoint.id,
        result.formatted,
        typeof result.lat === "number" ? result.lat : lat,
        typeof result.lon === "number" ? result.lon : lon
      );
      return;
    }
  } catch (error) {
    console.error("Reverse geocoding failed", error);
  }

  selector.setWaypoint(firstUnresolvedWaypoint.id, fallbackLabel, lat, lon);
}

async function fetchRoute(waypoints) {
  const firstUnresolvedIndex = waypoints.findIndex(
    (waypoint) => !isWaypointResolved(waypoint)
  );
  const resolvedWaypoints = waypoints.filter((waypoint, index) => {
    const isBeforeFirstUnresolved =
      firstUnresolvedIndex === -1 || index < firstUnresolvedIndex;

    return isBeforeFirstUnresolved && isWaypointResolved(waypoint);
  });

  if (resolvedWaypoints.length < 2) {
    latestRouteData = null;
    clearRouteVisualization();
    clearRouteInstructions();
    return;
  }

  const requestId = ++latestRoutingRequestId;
  const waypointParam = resolvedWaypoints
    .map((waypoint) => `${waypoint.lat},${waypoint.lon}`)
    .join("|");
  const url = `https://api.geoapify.com/v1/routing?waypoints=${waypointParam}&mode=drive&details=instruction_details&apiKey=${yourApiKey}`;

  try {
    const response = await fetch(url);
    const routeData = await response.json();

    if (requestId !== latestRoutingRequestId) {
      return;
    }

    const hasRouteError =
      !response.ok ||
      (typeof routeData?.statusCode === "number" && routeData.statusCode >= 400) ||
      !!routeData?.error;

    if (hasRouteError) {
      const rawRouteErrorMessage =
        routeData?.message || `Routing request failed with status ${response.status}`;
      const routeErrorMessage =
        rawRouteErrorMessage ===
        "Locations are in unconnected regions. Please check waypoint coordinate order (lat/lon)."
          ? "No route could be found for the selected waypoints."
          : rawRouteErrorMessage;

      latestRouteData = null;
      clearRouteVisualization();
      showRouteError(routeErrorMessage);
      return;
    }

    latestRouteData = routeData;
    visualizeRoute(routeData, resolvedWaypoints);
  } catch (error) {
    if (requestId !== latestRoutingRequestId) {
      return;
    }

    latestRouteData = null;
    clearRouteVisualization();
    clearRouteInstructions();
    console.error("Failed to fetch route", error);
  }
}

let selector;

selector = new WaypointSelector("#waypoint-selector", yourApiKey, {
  onChange: (waypoints, context) => {
    syncWaypointMarkers(waypoints);
    adjustViewToMarkers();

    fetchRoute(waypoints);
  },
  labels: {
    choose_destination: "Search for a stop or click the map"
  },
  geocoderOptions: {
    skipIcons: true
  }
});

map.on("click", async (event) => {
  await setWaypointFromMapClick(event.latlng.lat, event.latlng.lng);
});
