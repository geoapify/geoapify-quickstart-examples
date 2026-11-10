/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const apiKey = "5402608de7c44a2d95121c407ad2110b";

// Default bias point: near Springfield, Massachusetts.
let biasPoint = [-72.59, 42.10];
let searchMode = "none";
let activeRequestId = 0;
const resultMarkers = [];

const modeHints = {
  none: "No filter and no bias set: the API returns the best matches for the name. By default it prefers the country detected from your IP address.",
  bias: "Results are sorted by distance from the blue point. Click the map to move it.",
  filter: "Only results inside the visible map area. Pan or zoom the map to search another area."
};

const searchForm = document.getElementById("search-form");
const placeNameInput = document.getElementById("place-name");
const modeButtons = document.querySelectorAll(".mode-switch__button");
const modeHintElement = document.getElementById("mode-hint");
const requestUrlElement = document.getElementById("request-url");
const resultListElement = document.getElementById("result-list");

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
  center: [-96, 38.5],
  zoom: 3.4,
  // The Geoapify map tiles bring their own attribution: Powered by Geoapify | © OpenMapTiles © OpenStreetMap contributors.
  attributionControl: { compact: false }
});

map.addControl(new maplibregl.NavigationControl(), "top-left");

const biasMarkerElement = document.createElement("div");
biasMarkerElement.className = "bias-marker";

const biasMarker = new maplibregl.Marker({
  element: biasMarkerElement,
  anchor: "center"
}).setLngLat(biasPoint);

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  searchPlaces();
});

modeButtons.forEach(button => {
  button.addEventListener("click", () => setSearchMode(button.dataset.mode));
});

map.on("click", event => {
  if (event.originalEvent.target.closest(".maplibregl-marker, .maplibregl-popup")) {
    return;
  }

  biasPoint = [roundCoordinate(event.lngLat.lng), roundCoordinate(event.lngLat.lat)];
  biasMarker.setLngLat(biasPoint);
  setSearchMode("bias");
});

// In filter mode the visible map area is the filter, so every map move runs a new search.
map.on("moveend", () => {
  if (searchMode === "filter") {
    searchPlaces();
  }
});

setSearchMode("none");

function setSearchMode(mode) {
  searchMode = mode;

  modeButtons.forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
  });

  modeHintElement.textContent = modeHints[mode];

  if (mode === "bias") {
    biasMarker.addTo(map);
  } else {
    biasMarker.remove();
  }

  searchPlaces();
}

function buildSearchUrl(placeName) {
  let url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(placeName)}&format=json&limit=5`;

  if (searchMode === "bias") {
    url += `&bias=proximity:${biasPoint[0]},${biasPoint[1]}`;
  }

  if (searchMode === "filter") {
    url += `&filter=rect:${getMapViewRect().join(",")}`;
  }

  return `${url}&apiKey=${apiKey}`;
}

function getMapViewRect() {
  const bounds = map.getBounds();

  return [
    Math.max(bounds.getWest(), -180),
    Math.max(bounds.getSouth(), -90),
    Math.min(bounds.getEast(), 180),
    Math.min(bounds.getNorth(), 90)
  ].map(roundCoordinate);
}

function searchPlaces() {
  const placeName = placeNameInput.value.trim();

  if (!placeName) {
    return;
  }

  const requestMode = searchMode;
  const requestId = ++activeRequestId;
  const searchUrl = buildSearchUrl(placeName);

  requestUrlElement.textContent = searchUrl.replace(apiKey, "YOUR_API_KEY");
  resultListElement.innerHTML = "<li class=\"result-list__message\">Loading...</li>";

  fetch(searchUrl)
    .then(response => response.json())
    .then(data => {
      if (requestId !== activeRequestId) {
        return;
      }

      if (data.message) {
        showMessage(`Request failed: ${data.message}`);
        return;
      }

      showResults(data.results || [], requestMode);
    });
}

function clearResultMarkers() {
  resultMarkers.forEach(marker => marker.remove());
  resultMarkers.length = 0;
}

function showMessage(text) {
  clearResultMarkers();
  resultListElement.innerHTML = "";

  const item = document.createElement("li");
  item.className = "result-list__message";
  item.textContent = text;
  resultListElement.appendChild(item);
}

function showResults(results, requestMode) {
  if (results.length === 0) {
    showMessage("No results for this name and mode.");
    return;
  }

  clearResultMarkers();
  resultListElement.innerHTML = "";

  results.forEach((result, index) => {
    const number = index + 1;
    const coordinates = [result.lon, result.lat];

    const markerElement = document.createElement("div");
    markerElement.className = "result-marker";
    markerElement.textContent = number;

    const marker = new maplibregl.Marker({ element: markerElement, anchor: "center" })
      .setLngLat(coordinates)
      .setPopup(new maplibregl.Popup({ offset: 16, closeButton: false }).setText(result.formatted))
      .addTo(map);

    resultMarkers.push(marker);
    resultListElement.appendChild(createResultItem(result, number, marker));
  });

  // In filter mode the map view is the search area, so the map stays where it is.
  if (requestMode !== "filter") {
    fitMapToResults(results, requestMode);
  }
}

function createResultItem(result, number, marker) {
  const item = document.createElement("li");
  item.className = "result-list__item";

  const badge = document.createElement("span");
  badge.className = "result-list__number";
  badge.textContent = number;

  const details = document.createElement("div");

  const address = document.createElement("strong");
  address.textContent = result.formatted;

  const meta = document.createElement("span");
  meta.className = "result-list__meta";
  meta.textContent = `result_type: ${result.result_type} · confidence: ${result.rank ? result.rank.confidence : "-"}`;

  details.appendChild(address);
  details.appendChild(meta);
  item.appendChild(badge);
  item.appendChild(details);

  item.addEventListener("click", () => {
    // Moving the map in filter mode would start a new search, so only the popup opens there.
    if (searchMode !== "filter") {
      map.flyTo({ center: marker.getLngLat(), zoom: Math.max(map.getZoom(), 9) });
    }
    marker.togglePopup();
  });

  return item;
}

function fitMapToResults(results, requestMode) {
  const bounds = new maplibregl.LngLatBounds();

  results.forEach(result => bounds.extend([result.lon, result.lat]));

  if (requestMode === "bias") {
    bounds.extend(biasPoint);
  }

  map.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 600 });
}

function roundCoordinate(value) {
  return Math.round(value * 10000) / 10000;
}
