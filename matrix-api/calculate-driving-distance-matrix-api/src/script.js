// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const MATRIX_API_URL = "https://api.geoapify.com/v1/routematrix";
const REVERSE_API_URL = "https://api.geoapify.com/v1/geocode/reverse";

const sourceListElement = document.getElementById("source-list");
const destinationListElement = document.getElementById("destination-list");
const destinationSectionElement = document.getElementById("destination-section");
const differentDestinationsCheckbox = document.getElementById("different-destinations-checkbox");
const addSourceButton = document.getElementById("add-source-button");
const addDestinationButton = document.getElementById("add-destination-button");
const calculateButton = document.getElementById("calculate-button");
const statusMessageElement = document.getElementById("status-message");
const matrixTableElement = document.getElementById("matrix-table");
const hoverInfoElement = document.getElementById("hover-info");
const toastElement = document.getElementById("toast");
const mapClickControlsElement = document.getElementById("map-click-controls");
const mapClickSourceRadio = document.getElementById("map-click-source");
const mapClickDestinationRadio = document.getElementById("map-click-destination");

let nextLocationId = 1;
let sourceRows = [
  createLocation("Union Station, 800 N Alameda St, Los Angeles, CA 90012, USA", 34.05622, -118.2365),
  createLocation("Santa Monica Pier, 200 Santa Monica Pier, Santa Monica, CA 90401, USA", 34.00935, -118.49747),
  createLocation("Anaheim Convention Center, 800 W Katella Ave, Anaheim, CA 92802, USA", 33.80326, -117.91874)
];
let destinationRows = [
  createLocation("San Diego Convention Center, 111 Harbor Dr, San Diego, CA 92101, USA", 32.70633, -117.16184),
  createLocation("Palm Springs Convention Center, 277 N Avenida Caballeros, Palm Springs, CA 92262, USA", 33.82301, -116.53897)
];
let useDifferentDestinations = false;
let latestMatrixResponse = null;
let mapMarkers = [];
let hoverMarkers = [];
let toastTimeoutId = null;
let isCalculating = false;

const map = new maplibregl.Map({
  container: "map",
  // Geoapify Map Tiles API serves the MapLibre style JSON and vector tiles.
  // Docs: https://apidocs.geoapify.com/docs/maps/map-tiles/
  style: `https://maps.geoapify.com/v1/styles/osm-bright-grey/style.json?apiKey=${yourAPIKey}`,
  center: [-118.16, 34.0],
  zoom: 8,
  maxZoom: 20
});

map.addControl(new maplibregl.NavigationControl(), "bottom-right");

map.on("load", () => {
  addHoverLayers();
  renderMarkers();
  fitMapToVisibleLocations();
});

addSourceButton.addEventListener("click", () => {
  sourceRows.push(createEmptyLocation());
  latestMatrixResponse = null;
  render();
});

addDestinationButton.addEventListener("click", () => {
  destinationRows.push(createEmptyLocation());
  latestMatrixResponse = null;
  render();
});

differentDestinationsCheckbox.addEventListener("change", () => {
  useDifferentDestinations = differentDestinationsCheckbox.checked;
  destinationSectionElement.hidden = !useDifferentDestinations;
  mapClickControlsElement.hidden = !useDifferentDestinations;

  if (!useDifferentDestinations) {
    mapClickSourceRadio.checked = true;
  }

  latestMatrixResponse = null;
  render();
  fitMapToVisibleLocations();
});

calculateButton.addEventListener("click", () => {
  calculateMatrix().then(undefined, (error) => {
    handleError(error.message || "Matrix calculation failed.");
  });
});

map.on("click", (event) => {
  addLocationFromMapClick(event.lngLat).then(undefined, (error) => {
    handleError(error.message || "Reverse geocoding failed.");
  });
});

render();

function createLocation(label, lat, lon) {
  const location = {
    id: nextLocationId,
    label,
    lat,
    lon
  };
  nextLocationId += 1;
  return location;
}

function createEmptyLocation() {
  return createLocation("", null, null);
}

function createMarkerIcon(color, content) {
  // Geoapify Marker Icon API generates numbered marker images reused in the
  // location lists, matrix headers, and MapLibre markers.
  // Docs: https://apidocs.geoapify.com/docs/maps/marker-icon/
  const params = new URLSearchParams({
    type: "circle",
    color,
    size: "28",
    contentSize: "16",
    text: content,
    scaleFactor: "2",
    apiKey: yourAPIKey
  });

  return `https://api.geoapify.com/v2/icon/?${params.toString()}&noShadow&noWhiteCircle`;
}

function createIconImage(iconUrl, altText) {
  const image = document.createElement("img");
  image.src = iconUrl;
  image.alt = altText;
  return image;
}

function createMarkerElement(iconUrl, altText) {
  const wrapper = document.createElement("div");
  wrapper.className = "map-marker";
  wrapper.append(createIconImage(iconUrl, altText));

  return wrapper;
}

function render() {
  renderLocationRows(sourceListElement, sourceRows, "source");
  renderLocationRows(destinationListElement, destinationRows, "destination");
  renderMarkers();
  renderMatrixTable();
  syncCalculateButton();
}

function renderLocationRows(container, rows, type) {
  container.replaceChildren();

  rows.forEach((row, index) => {
    const rowElement = document.createElement("div");
    rowElement.className = "location-row";

    const indexElement = document.createElement("span");
    indexElement.className = `location-index ${type}`;
    indexElement.append(createIconImage(
      createMarkerIcon(getLocationColor(type), String(index + 1)),
      `${type} ${index + 1}`
    ));

    const autocompleteHost = document.createElement("div");
    autocompleteHost.className = "autocomplete-host";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.innerHTML = "&times;";
    removeButton.setAttribute("aria-label", `Remove ${type} ${index + 1}`);
    removeButton.addEventListener("click", () => {
      rows.splice(index, 1);
      latestMatrixResponse = null;
      render();
    });

    rowElement.append(indexElement, autocompleteHost, removeButton);
    container.append(rowElement);

    // Geoapify Address Autocomplete returns a selected feature with both the
    // display address and coordinates used later by the Matrix API.
    // Docs: https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
    const autocompleteInput = new autocomplete.GeocoderAutocomplete(
      autocompleteHost,
      yourAPIKey,
      {
        placeholder: type === "source" ? "Enter source address" : "Enter destination address"
      }
    );

    autocompleteInput.on("select", (location) => {
      if (location) {
        setLocationFromAutocomplete(row.id, type, location);
      }
    });

    const textInput = autocompleteHost.querySelector("input");
    if (textInput) {
      textInput.value = row.label;
      textInput.addEventListener("input", () => {
        if (textInput.value !== row.label) {
          clearLocationCoordinates(row.id, type, textInput.value);
        }
      });
    }
  });
}

function setLocationFromAutocomplete(id, type, location) {
  const row = findLocationById(id, type);
  if (!row) {
    return;
  }

  row.label = location.properties.formatted || location.properties.address_line1 || "Selected location";
  row.lat = location.properties.lat;
  row.lon = location.properties.lon;
  latestMatrixResponse = null;
  setStatus("Location selected.");
  render();
  fitMapToVisibleLocations();
}

function clearLocationCoordinates(id, type, label) {
  const row = findLocationById(id, type);
  if (!row) {
    return;
  }

  row.label = label;
  row.lat = null;
  row.lon = null;
  latestMatrixResponse = null;
  renderMarkers();
  renderMatrixTable();
  syncCalculateButton();
}

function findLocationById(id, type) {
  const rows = type === "destination" ? destinationRows : sourceRows;
  return rows.find((row) => row.id === id);
}

function renderMarkers() {
  mapMarkers.forEach((marker) => marker.remove());
  mapMarkers = [];

  sourceRows.filter(isCompleteLocation).forEach((location, index) => {
    addLocationMarker(location, index, "source");
  });

  if (useDifferentDestinations) {
    destinationRows.filter(isCompleteLocation).forEach((location, index) => {
      addLocationMarker(location, index, "destination");
    });
  }
}

function addLocationMarker(location, index, type) {
  const title = type === "destination" ? "Destination" : "Source";
  const markerNumber = String(index + 1);
  const markerIcon = createMarkerIcon(getLocationColor(type), markerNumber);
  const markerElement = createMarkerElement(markerIcon, `${title} ${markerNumber}`);
  const popupContent = `<strong>${title} ${markerNumber}</strong><br>${escapeHtml(location.label)}`;
  const marker = new maplibregl.Marker({
    element: markerElement,
    anchor: "center"
  })
    .setLngLat([location.lon, location.lat])
    .setPopup(new maplibregl.Popup({ offset: 32 }).setHTML(popupContent))
    .addTo(map);

  mapMarkers.push(marker);
}

function getLocationColor(type) {
  return type === "destination" ? "blue" : "red";
}

function renderMatrixTable() {
  matrixTableElement.replaceChildren();

  if (!latestMatrixResponse) {
    const caption = document.createElement("caption");
    caption.className = "empty-state";
    caption.textContent = "No matrix results yet.";
    matrixTableElement.append(caption);
    clearHoveredPair();
    return;
  }

  const sources = getCompleteSources();
  const destinations = getCompleteDestinations();
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  const headerRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.className = "matrix-corner";
  corner.setAttribute("aria-label", "Source and destination matrix");
  headerRow.append(corner);

  destinations.forEach((_, destinationIndex) => {
    const th = document.createElement("th");
    th.setAttribute("aria-label", `Destination ${destinationIndex + 1}`);
    th.append(createMatrixHeaderIcon(useDifferentDestinations ? "destination" : "source", destinationIndex + 1));
    headerRow.append(th);
  });

  thead.append(headerRow);

  sources.forEach((_, sourceIndex) => {
    const row = document.createElement("tr");
    const th = document.createElement("th");
    th.setAttribute("aria-label", `Source ${sourceIndex + 1}`);
    th.append(createMatrixHeaderIcon("source", sourceIndex + 1));
    row.append(th);

    destinations.forEach((_, destinationIndex) => {
      const cell = document.createElement("td");
      const matrixValue = getMatrixValue(sourceIndex, destinationIndex);
      cell.className = "matrix-cell";
      cell.tabIndex = 0;
      cell.innerHTML = `
        <div class="matrix-cell-content">
        <strong>${formatDistance(matrixValue.distance)}</strong>
        <span>${formatDuration(matrixValue.time)}</span>
        </div>
      `;
      cell.addEventListener("mouseenter", () => {
        showHoveredPair(sourceIndex, destinationIndex);
      });
      cell.addEventListener("focus", () => {
        showHoveredPair(sourceIndex, destinationIndex);
      });
      cell.addEventListener("mouseleave", clearHoveredPair);
      cell.addEventListener("blur", clearHoveredPair);
      row.append(cell);
    });

    tbody.append(row);
  });

  matrixTableElement.append(thead, tbody);
}

function createMatrixHeaderIcon(type, number) {
  const wrapper = document.createElement("span");
  wrapper.className = "matrix-icon-header";
  wrapper.append(createIconImage(
    createMarkerIcon(getLocationColor(type), String(number)),
    `${type} ${number}`
  ));
  return wrapper;
}

function getMatrixValue(sourceIndex, destinationIndex) {
  const value = latestMatrixResponse
    && latestMatrixResponse.sources_to_targets
    && latestMatrixResponse.sources_to_targets[sourceIndex]
    && latestMatrixResponse.sources_to_targets[sourceIndex][destinationIndex];

  return value || { distance: null, time: null };
}

function syncCalculateButton() {
  calculateButton.disabled = isCalculating || !canCalculate();
}

function canCalculate() {
  const sources = getCompleteSources();
  const destinations = getCompleteDestinations();
  const expectedSourceCount = sourceRows.length;
  const expectedDestinationCount = useDifferentDestinations ? destinationRows.length : sourceRows.length;
  const hasEnoughLocations = useDifferentDestinations
    ? sources.length > 0 && destinations.length > 0
    : sources.length > 1;

  return hasEnoughLocations
    && expectedSourceCount === sources.length
    && expectedDestinationCount === destinations.length;
}

function getCompleteSources() {
  return sourceRows.filter(isCompleteLocation);
}

function getCompleteDestinations() {
  return (useDifferentDestinations ? destinationRows : sourceRows).filter(isCompleteLocation);
}

function isCompleteLocation(location) {
  return Number.isFinite(location.lat) && Number.isFinite(location.lon);
}

function calculateMatrix() {
  if (!canCalculate() || isCalculating) {
    return Promise.resolve();
  }

  const sources = getCompleteSources();
  const destinations = getCompleteDestinations();
  const requestBody = {
    mode: "drive",
    units: "metric",
    sources: sources.map((location) => ({ location: [location.lon, location.lat] })),
    targets: destinations.map((location) => ({ location: [location.lon, location.lat] }))
  };

  isCalculating = true;
  latestMatrixResponse = null;
  setStatus("Calculating matrix...");
  syncCalculateButton();
  renderMatrixTable();

  // Geoapify Matrix API calculates road-network travel distance and time
  // between all source and target coordinate pairs in one request.
  // Docs: https://apidocs.geoapify.com/docs/route-matrix/
  const url = `${MATRIX_API_URL}?apiKey=${encodeURIComponent(yourAPIKey)}`;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Matrix API request failed with status ${response.status}.`);
      }

      return response.json();
    })
    .then((matrixResponse) => {
      latestMatrixResponse = matrixResponse;
      setStatus(`Matrix ready: ${sources.length} sources x ${destinations.length} destinations.`);
      renderMatrixTable();
    })
    .finally(() => {
      isCalculating = false;
      syncCalculateButton();
    });
}

function addLocationFromMapClick(latlng) {
  // Geoapify Reverse Geocoding API gives a readable label for a map click.
  // The original clicked coordinates are preserved for the Matrix API request.
  // Docs: https://apidocs.geoapify.com/docs/geocoding/reverse-geocoding/
  const clickedPoint = {
    lat: Number(latlng.lat.toFixed(6)),
    lon: Number(latlng.lng.toFixed(6))
  };

  setStatus("Reverse geocoding clicked point...");

  const url = new URL(REVERSE_API_URL);
  url.searchParams.set("lat", String(clickedPoint.lat));
  url.searchParams.set("lon", String(clickedPoint.lon));
  url.searchParams.set("apiKey", yourAPIKey);

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Reverse API request failed with status ${response.status}.`);
      }

      return response.json();
    })
    .then((data) => {
      const feature = data.features && data.features[0];
      const properties = feature && feature.properties;
      const fallbackLabel = `${clickedPoint.lat.toFixed(5)}, ${clickedPoint.lon.toFixed(5)}`;
      const label = properties && (properties.formatted || properties.address_line1) || fallbackLabel;
      const type = useDifferentDestinations && mapClickDestinationRadio.checked ? "destination" : "source";
      upsertClickedLocation(type, label, clickedPoint.lat, clickedPoint.lon);
      latestMatrixResponse = null;
      showToast(`Added ${type} from map click.`);
      setStatus("");
      render();
      fitMapToVisibleLocations();
    });
}

function upsertClickedLocation(type, label, lat, lon) {
  const rows = type === "destination" ? destinationRows : sourceRows;
  const emptyRow = rows.find((row) => !isCompleteLocation(row) && !row.label.trim());

  if (emptyRow) {
    emptyRow.label = label;
    emptyRow.lat = lat;
    emptyRow.lon = lon;
    return;
  }

  rows.push(createLocation(label, lat, lon));
}

function showHoveredPair(sourceIndex, destinationIndex) {
  const source = getCompleteSources()[sourceIndex];
  const destination = getCompleteDestinations()[destinationIndex];
  const matrixValue = getMatrixValue(sourceIndex, destinationIndex);

  if (!source || !destination) {
    return;
  }

  clearHoverMapObjects();

  updateHoverSource(source, destination);

  const midpoint = [
    (source.lon + destination.lon) / 2,
    (source.lat + destination.lat) / 2
  ];
  const labelElement = document.createElement("div");
  labelElement.className = "distance-label";
  labelElement.innerHTML = `<span>${formatDistance(matrixValue.distance)} - ${formatDuration(matrixValue.time)}</span>`;
  const labelMarker = new maplibregl.Marker({
    element: labelElement,
    anchor: "center"
  });
  labelMarker.setLngLat(midpoint).addTo(map);
  hoverMarkers.push(labelMarker);

  hoverInfoElement.textContent = `S${sourceIndex + 1} to D${destinationIndex + 1}: ${formatDistance(matrixValue.distance)}, ${formatDuration(matrixValue.time)}`;
}

function clearHoveredPair() {
  clearHoverMapObjects();
  hoverInfoElement.textContent = "No matrix pair selected.";
}

function fitMapToVisibleLocations() {
  const points = getVisibleLocations().map((location) => [location.lon, location.lat]);

  if (points.length === 0) {
    return;
  }

  if (points.length === 1) {
    map.jumpTo({ center: points[0], zoom: 13 });
    return;
  }

  const bounds = points.reduce((currentBounds, point) => {
    return currentBounds.extend(point);
  }, new maplibregl.LngLatBounds(points[0], points[0]));

  map.fitBounds(bounds, { padding: 40, maxZoom: 13 });
}

function getVisibleLocations() {
  const locations = [...getCompleteSources()];
  if (useDifferentDestinations) {
    locations.push(...getCompleteDestinations());
  }

  return locations;
}

function setStatus(message) {
  statusMessageElement.textContent = message;
}

function handleError(message) {
  isCalculating = false;
  setStatus(message);
  showToast(message);
  syncCalculateButton();
}

function addHoverLayers() {
  if (map.getSource("hover-pair")) {
    return;
  }

  map.addSource("hover-pair", {
    type: "geojson",
    data: getEmptyHoverFeatureCollection()
  });

  map.addLayer({
    id: "hover-pair-line",
    type: "line",
    source: "hover-pair",
    filter: ["==", ["get", "kind"], "straight"],
    paint: {
      "line-color": "#172033",
      "line-width": 4,
      "line-opacity": 0.85,
      "line-dasharray": [1.6, 1.4]
    }
  });

  map.addLayer({
    id: "hover-pair-points",
    type: "circle",
    source: "hover-pair",
    filter: ["==", ["get", "kind"], "point"],
    paint: {
      "circle-radius": 9,
      "circle-color": "#ffffff",
      "circle-stroke-width": 3,
      "circle-stroke-color": ["get", "color"]
    }
  });
}

function updateHoverSource(source, destination) {
  const hoverSource = getHoverSource();
  if (!hoverSource) {
    return;
  }

  hoverSource.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "straight" },
        geometry: {
          type: "LineString",
          coordinates: [
            [source.lon, source.lat],
            [destination.lon, destination.lat]
          ]
        }
      },
      {
        type: "Feature",
        properties: { color: "#d93025", kind: "point" },
        geometry: { type: "Point", coordinates: [source.lon, source.lat] }
      },
      {
        type: "Feature",
        properties: { color: "#1a73e8", kind: "point" },
        geometry: { type: "Point", coordinates: [destination.lon, destination.lat] }
      }
    ]
  });
}

function clearHoverMapObjects() {
  hoverMarkers.forEach((marker) => marker.remove());
  hoverMarkers = [];

  const hoverSource = getHoverSource();
  if (hoverSource) {
    hoverSource.setData(getEmptyHoverFeatureCollection());
  }
}

function getHoverSource() {
  return map.getSource("hover-pair");
}

function getEmptyHoverFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: []
  };
}

function showToast(message) {
  if (toastTimeoutId) {
    window.clearTimeout(toastTimeoutId);
  }

  toastElement.textContent = message;
  toastElement.classList.remove("is-hiding");
  toastElement.hidden = false;

  toastTimeoutId = window.setTimeout(() => {
    toastElement.classList.add("is-hiding");
    toastTimeoutId = window.setTimeout(() => {
      toastElement.hidden = true;
      toastElement.classList.remove("is-hiding");
      toastTimeoutId = null;
    }, 200);
  }, 2200);
}

function formatDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters)) {
    return "No route";
  }

  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  return `${Math.round(distanceMeters)} m`;
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "No time";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} hr ${remainingMinutes} min`;
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
