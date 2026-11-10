// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// This demo key can be blocked or restricted at any time.
const apiKey = "5402608de7c44a2d95121c407ad2110b";

// Pike Place Market, Seattle
const initialSearchPoint = [-122.3421, 47.6101];
const resultsLimit = 10;

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
  center: initialSearchPoint,
  zoom: 14
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const searchForm = document.getElementById("search-form");
const brandInput = document.getElementById("brand-input");
const categorySelect = document.getElementById("category-select");
const radiusSelect = document.getElementById("radius-select");
const travelCheckbox = document.getElementById("travel-checkbox");
const travelToggle = document.getElementById("travel-toggle");
const resultsStatus = document.getElementById("results-status");
const resultsList = document.getElementById("results-list");

let searchPoint = initialSearchPoint;
let activeRequestId = 0;
const storeMarkers = [];
const distanceElements = [];
let currentStores = [];

const searchPointElement = document.createElement("div");
searchPointElement.className = "search-point-marker";

const searchPointMarker = new maplibregl.Marker({
  element: searchPointElement,
  anchor: "center"
})
  .setLngLat(searchPoint)
  .addTo(map);

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  findNearestStores();
});

radiusSelect.addEventListener("change", () => {
  findNearestStores();
});

travelCheckbox.addEventListener("change", () => {
  if (travelCheckbox.checked) {
    loadTravelTimes();
  } else {
    showStraightDistances();
  }
});

map.on("click", event => {
  if (event.originalEvent.target.closest(".maplibregl-marker")) {
    return;
  }

  searchPoint = [event.lngLat.lng, event.lngLat.lat];
  searchPointMarker.setLngLat(searchPoint);
  findNearestStores();
});

map.on("load", () => {
  // The search area: a circle around the search point
  map.addSource("search-area", {
    type: "geojson",
    data: createCircle(searchPoint, Number(radiusSelect.value))
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

  findNearestStores();
});

function findNearestStores() {
  const brandName = brandInput.value.trim();
  const searchRadiusMeters = Number(radiusSelect.value);

  const searchArea = createCircle(searchPoint, searchRadiusMeters);
  map.getSource("search-area").setData(searchArea);
  fitMapToCircle(searchArea);

  if (!brandName) {
    resultsStatus.textContent = "Enter a brand name.";
    return;
  }

  const [lon, lat] = searchPoint;
  const requestId = ++activeRequestId;

  // The Places API has no brand filter: `name` matches place names.
  const params = new URLSearchParams({
    categories: categorySelect.value,
    name: brandName,
    filter: `circle:${lon},${lat},${searchRadiusMeters}`,
    bias: `proximity:${lon},${lat}`,
    limit: resultsLimit,
    apiKey: apiKey
  });

  clearResults();
  resultsStatus.textContent = "Searching...";

  fetch(`https://api.geoapify.com/v2/places?${params}`)
    .then(response => response.json())
    .then(placesData => {
      if (requestId === activeRequestId) {
        showStores(placesData.features || [], brandName, searchRadiusMeters);
      }
    });
}

function clearResults() {
  storeMarkers.forEach(marker => marker.remove());
  storeMarkers.length = 0;
  distanceElements.length = 0;
  currentStores = [];
  travelToggle.hidden = true;
  resultsList.innerHTML = "";
}

function showStores(stores, brandName, searchRadiusMeters) {
  // `bias=proximity` returns the nearest places first.
  if (stores.length === 0) {
    resultsStatus.textContent = `No places named "${brandName}" within ${formatDistance(searchRadiusMeters)}.`;
    return;
  }

  resultsStatus.textContent = `${stores.length} nearest places named "${brandName}"`;
  currentStores = stores;
  travelToggle.hidden = false;

  stores.forEach((store, index) => {
    const number = index + 1;
    const properties = store.properties;
    const coordinates = store.geometry.coordinates;

    const markerElement = document.createElement("div");
    markerElement.className = "store-marker";
    markerElement.textContent = number;
    markerElement.style.zIndex = resultsLimit - index;

    const marker = new maplibregl.Marker({
      element: markerElement,
      anchor: "center"
    })
      .setLngLat(coordinates)
      .addTo(map);

    storeMarkers.push(marker);

    const listItem = document.createElement("li");
    listItem.className = "results__item";

    const numberBadge = document.createElement("span");
    numberBadge.className = "results__number";
    numberBadge.textContent = number;

    const details = document.createElement("div");

    const name = document.createElement("strong");
    name.textContent = properties.name;

    const address = document.createElement("span");
    address.className = "results__address";
    address.textContent = getStreetLine(properties);

    const distance = document.createElement("span");
    distance.className = "results__distance";
    // Straight-line distance from the Places API, kept to restore it
    distance.dataset.straight = `${Math.round(properties.distance)} m`;
    distance.textContent = distance.dataset.straight;
    distanceElements.push(distance);

    details.append(name, address);
    listItem.append(numberBadge, details, distance);
    listItem.addEventListener("click", () => {
      map.flyTo({ center: coordinates, zoom: 17 });
    });

    resultsList.appendChild(listItem);
  });

  if (travelCheckbox.checked) {
    loadTravelTimes();
  }
}

// Route Matrix API: the search point is the one source, the stores are the targets.
// 1 source × 10 targets costs 10 credits, so it runs only when the checkbox is on.
function loadTravelTimes() {
  if (currentStores.length === 0) {
    return;
  }

  const requestId = activeRequestId;

  fetch(`https://api.geoapify.com/v1/routematrix?apiKey=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "walk",
      sources: [{ location: searchPoint }],
      targets: currentStores.map(store => ({ location: store.geometry.coordinates }))
    })
  })
    .then(response => response.json())
    .then(matrixData => {
      if (requestId !== activeRequestId || !travelCheckbox.checked) {
        return;
      }

      // One row per source; each cell refers to its store through target_index
      matrixData.sources_to_targets[0].forEach(cell => {
        distanceElements[cell.target_index].replaceChildren(
          createWalkIcon(),
          `${formatTime(cell.time)} · ${formatDistance(cell.distance)}`
        );
      });
    });
}

// "directions_walk" icon from Material Icons by Google (Apache License 2.0)
function createWalkIcon() {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(svgNamespace, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("class", "travel-icon");
  icon.setAttribute("aria-label", "Walking");

  const path = document.createElementNS(svgNamespace, "path");
  path.setAttribute("d", "M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7");
  icon.appendChild(path);

  return icon;
}

function showStraightDistances() {
  distanceElements.forEach(element => element.textContent = element.dataset.straight);
}

function formatTime(seconds) {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function getStreetLine(properties) {
  if (properties.street) {
    return [properties.housenumber, properties.street].filter(Boolean).join(" ");
  }

  return properties.address_line2 || properties.formatted;
}

// Show the whole search area
function fitMapToCircle(circle) {
  const bounds = new maplibregl.LngLatBounds(searchPoint, searchPoint);
  circle.geometry.coordinates[0].forEach(point => bounds.extend(point));

  map.fitBounds(bounds, {
    padding: 30,
    duration: 500
  });
}

function formatDistance(meters) {
  return meters >= 1000 ? `${Number((meters / 1000).toFixed(1))} km` : `${Math.round(meters)} m`;
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
