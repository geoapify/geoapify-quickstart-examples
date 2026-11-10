// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// This demo key can be blocked or restricted at any time.
const apiKey = "5402608de7c44a2d95121c407ad2110b";

// Downtown Seattle (Denny Triangle, near Westlake Ave and Lenora St)
const initialSearchPoint = [-122.336, 47.6165];
const searchRadiusMeters = 1000;
const maxStations = 20;

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
  center: initialSearchPoint,
  zoom: 14
});

let searchPoint = initialSearchPoint;
let activeRequestId = 0;
const stationMarkers = [];
// Per station: its distance elements in the list and in the popup
const distanceElements = [];
let currentStations = [];

const statusElement = document.getElementById("status");
const stationListElement = document.getElementById("stations");
const travelCheckbox = document.getElementById("travel-checkbox");
const travelToggle = document.getElementById("travel-toggle");

travelCheckbox.addEventListener("change", () => {
  if (travelCheckbox.checked) {
    loadTravelTimes();
  } else {
    showStraightDistances();
  }
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const searchPointElement = document.createElement("div");
searchPointElement.className = "search-point-marker";

const searchPointMarker = new maplibregl.Marker({
  element: searchPointElement,
  anchor: "center"
})
  .setLngLat(searchPoint)
  .addTo(map);

map.on("load", () => {
  map.addSource("search-area", {
    type: "geojson",
    data: createCircle(searchPoint, searchRadiusMeters)
  });

  map.addLayer({
    id: "search-area-fill",
    type: "fill",
    source: "search-area",
    paint: {
      "fill-color": "#2563eb",
      "fill-opacity": 0.06
    }
  });

  map.addLayer({
    id: "search-area-line",
    type: "line",
    source: "search-area",
    paint: {
      "line-color": "#2563eb",
      "line-width": 1.5,
      "line-dasharray": [2, 2]
    }
  });

  loadChargingStations();
});

map.on("click", event => {
  if (event.originalEvent.target.closest(".maplibregl-marker, .maplibregl-popup")) {
    return;
  }

  searchPoint = [event.lngLat.lng, event.lngLat.lat];
  searchPointMarker.setLngLat(searchPoint);
  map.getSource("search-area").setData(createCircle(searchPoint, searchRadiusMeters));
  loadChargingStations();
});

function loadChargingStations() {
  const [lon, lat] = searchPoint;
  const requestId = ++activeRequestId;
  const placesUrl = `https://api.geoapify.com/v2/places?categories=service.vehicle.charging_station&filter=circle:${lon},${lat},${searchRadiusMeters}&bias=proximity:${lon},${lat}&limit=${maxStations}&apiKey=${apiKey}`;

  clearStations();
  statusElement.textContent = "Loading charging stations…";

  fetch(placesUrl)
    .then(response => response.json())
    .then(placesData => {
      if (requestId === activeRequestId) {
        showStations(placesData.features || []);
      }
    });
}

function clearStations() {
  stationMarkers.forEach(marker => marker.remove());
  stationMarkers.length = 0;
  distanceElements.length = 0;
  currentStations = [];
  travelToggle.hidden = true;
  stationListElement.replaceChildren();
}

function showStations(stations) {
  if (stations.length === 0) {
    statusElement.textContent = `No charging stations within ${searchRadiusMeters} m. Click another place on the map.`;
    return;
  }

  statusElement.textContent = `${stations.length} station(s) within ${searchRadiusMeters} m, nearest first.`;
  currentStations = stations;
  travelToggle.hidden = false;

  stations.forEach((station, index) => {
    const properties = station.properties;
    const number = index + 1;

    const markerElement = document.createElement("div");
    markerElement.className = "station-marker";
    markerElement.textContent = number;
    // Keep nearer stations on top when markers overlap
    markerElement.style.zIndex = stations.length - index;

    const popupContent = createStationDetails(properties, number, "div");
    const popup = new maplibregl.Popup({ offset: 16, focusAfterOpen: false })
      .setDOMContent(popupContent);

    const marker = new maplibregl.Marker({ element: markerElement })
      .setLngLat(station.geometry.coordinates)
      .setPopup(popup)
      .addTo(map);

    stationMarkers.push(marker);

    const listItem = createStationDetails(properties, number, "li");

    distanceElements.push([
      listItem.querySelector(".station__distance"),
      popupContent.querySelector(".station__distance")
    ]);

    listItem.addEventListener("click", () => {
      stationMarkers.forEach(otherMarker => otherMarker.getPopup().remove());
      map.easeTo({ center: station.geometry.coordinates });
      marker.togglePopup();
    });
    stationListElement.appendChild(listItem);
  });

  if (travelCheckbox.checked) {
    loadTravelTimes();
  }
}

// Route Matrix API: the search point is the one source, the stations are the targets.
// 1 source × N stations costs N credits, so it runs only when the checkbox is on.
function loadTravelTimes() {
  if (currentStations.length === 0) {
    return;
  }

  const requestId = activeRequestId;

  fetch(`https://api.geoapify.com/v1/routematrix?apiKey=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "drive",
      sources: [{ location: searchPoint }],
      targets: currentStations.map(station => ({ location: station.geometry.coordinates }))
    })
  })
    .then(response => response.json())
    .then(matrixData => {
      if (requestId !== activeRequestId || !travelCheckbox.checked) {
        return;
      }

      // One row per source; each cell refers to its station through target_index
      matrixData.sources_to_targets[0].forEach(cell => {
        const travelText = `${formatTime(cell.time)} · ${formatDistance(cell.distance)}`;
        distanceElements[cell.target_index].forEach(element => {
          element.replaceChildren(createCarIcon(), travelText);
        });
      });
    });
}

// "directions_car" icon from Material Icons by Google (Apache License 2.0)
function createCarIcon() {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(svgNamespace, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("class", "travel-icon");
  icon.setAttribute("aria-label", "Driving");

  const path = document.createElementNS(svgNamespace, "path");
  path.setAttribute("d", "M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z");
  icon.appendChild(path);

  return icon;
}

function showStraightDistances() {
  distanceElements.flat().forEach(element => element.textContent = element.dataset.straight);
}

function formatTime(seconds) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function formatDistance(meters) {
  return meters >= 1000 ? `${Number((meters / 1000).toFixed(1))} km` : `${Math.round(meters)} m`;
}

function createStationDetails(properties, number, tagName) {
  const container = document.createElement(tagName);
  container.className = "station";

  const header = document.createElement("div");
  header.className = "station__header";

  const badge = document.createElement("span");
  badge.className = "station__number";
  badge.textContent = number;
  header.appendChild(badge);

  const name = document.createElement("strong");
  name.className = "station__name";
  name.textContent = properties.name || "Unnamed station";
  header.appendChild(name);

  const distance = document.createElement("span");
  distance.className = "station__distance";
  // Straight-line distance from the Places API, kept to restore it
  distance.dataset.straight = `${Math.round(properties.distance)} m`;
  distance.textContent = distance.dataset.straight;
  header.appendChild(distance);

  container.appendChild(header);

  const operatorText = getOperatorText(properties);

  if (operatorText) {
    const operator = document.createElement("div");
    operator.className = "station__operator";
    operator.textContent = operatorText;
    container.appendChild(operator);
  }

  container.appendChild(createConnectorList(properties.socket_options));

  return container;
}

function getOperatorText(properties) {
  const parts = [];

  if (properties.operator) {
    parts.push(`Operator: ${properties.operator}`);
  }

  if (properties.network && properties.network !== properties.operator) {
    parts.push(`Network: ${properties.network}`);
  }

  return parts.join(" · ");
}

// socket_options: { "<connector type>": { "amount": ..., "output": ... } }
// The connector type and output are shown as the API returns them.
function createConnectorList(socketOptions) {
  const connectors = document.createElement("div");
  connectors.className = "station__connectors";

  if (!socketOptions || Object.keys(socketOptions).length === 0) {
    connectors.classList.add("station__connectors--empty");
    connectors.textContent = "Connector types not listed";
    return connectors;
  }

  Object.entries(socketOptions).forEach(([connectorType, details]) => {
    const connector = document.createElement("span");
    connector.className = "connector";

    const type = document.createElement("code");
    type.textContent = connectorType;
    connector.appendChild(type);

    const values = [];

    // amount is the number of connectors of this type; it is shown only when it is a number
    if (typeof details.amount === "number") {
      values.push(`amount: ${details.amount}`);
    }

    if (details.output !== undefined) {
      values.push(`output: ${details.output}`);
    }

    if (values.length > 0) {
      connector.appendChild(document.createTextNode(` ${values.join(", ")}`));
    }

    connectors.appendChild(connector);
  });

  return connectors;
}

// Approximate circle polygon to show the search area on the map
function createCircle(center, radiusMeters) {
  const [lon, lat] = center;
  const points = 64;
  const latDegrees = radiusMeters / 111320;
  const lonDegrees = radiusMeters / (111320 * Math.cos(lat * Math.PI / 180));
  const coordinates = [];

  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    coordinates.push([
      lon + lonDegrees * Math.cos(angle),
      lat + latDegrees * Math.sin(angle)
    ]);
  }

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coordinates]
    }
  };
}
