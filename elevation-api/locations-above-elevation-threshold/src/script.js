/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const apiKey = "5402608de7c44a2d95121c407ad2110b";

const maxLocationsPerRequest = 1000;
const aboveColor = "#d1495b";
const belowColor = "#2e86ab";

// Colorado towns (city centers from the Geocoding API), as [lon, lat]
const locations = [
  { name: "Denver", location: [-104.9849, 39.7392] },
  { name: "Colorado Springs", location: [-104.8253, 38.834] },
  { name: "Estes Park", location: [-105.5232, 40.3772] },
  { name: "Winter Park", location: [-105.7856, 39.918] },
  { name: "Breckenridge", location: [-106.0465, 39.4829] },
  { name: "Vail", location: [-106.3888, 39.6438] },
  { name: "Leadville", location: [-106.2925, 39.2508] },
  { name: "Aspen", location: [-106.8236, 39.1911] },
  { name: "Crested Butte", location: [-106.984, 38.8698] },
  { name: "Telluride", location: [-107.8123, 37.9375] },
  { name: "Steamboat Springs", location: [-106.8317, 40.4848] },
  { name: "Durango", location: [-107.8766, 37.2769] },
];

const state = {
  map: null,
  features: [],
  addedCount: 0,
};

const thresholdInput = document.querySelector("#threshold");
const thresholdValue = document.querySelector("#threshold-value");
const summaryElement = document.querySelector("#summary");
const resultsBody = document.querySelector("#results-body");
const statusElement = document.querySelector("#status");

initMap();

function initMap() {
  state.map = new maplibregl.Map({
    container: "map",
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
    center: [-106.35, 38.9],
    zoom: 6.4,
  });
  state.map.addControl(new maplibregl.NavigationControl(), "top-right");

  state.map.on("load", () => {
    state.map.addSource("locations", { type: "geojson", data: emptyCollection() });

    state.map.addLayer({
      id: "locations",
      type: "circle",
      source: "locations",
      paint: {
        "circle-radius": 8,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-color": thresholdColor(),
      },
    });
    state.map.addLayer({
      id: "location-labels",
      type: "symbol",
      source: "locations",
      layout: {
        "text-field": ["concat", ["get", "name"], "\n", ["to-string", ["get", "elevation"]], " ft"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 12,
        "text-offset": [0, 1.3],
        "text-anchor": "top",
      },
      paint: { "text-color": "#1f2933", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    });

    state.map.on("click", (event) => {
      state.addedCount += 1;
      locations.push({
        name: `Point ${state.addedCount}`,
        location: [Number(event.lngLat.lng.toFixed(5)), Number(event.lngLat.lat.toFixed(5))],
      });
      requestElevations();
    });

    requestElevations();
  });

  thresholdInput.addEventListener("input", () => {
    if (state.map.getLayer("locations")) {
      state.map.setPaintProperty("locations", "circle-color", thresholdColor());
    }
    renderResults();
  });
}

// The same expression as in the how-to: compare the elevation with the threshold
function thresholdColor() {
  return ["case", [">=", ["get", "elevation"], getThreshold()], aboveColor, belowColor];
}

function getThreshold() {
  return Number(thresholdInput.value);
}

// One request for all locations (up to 1,000); format=geojson returns Point features in input order
function requestElevations() {
  const url = `https://api.geoapify.com/v1/geodata/elevation?apiKey=${apiKey}`;
  statusElement.textContent = `Requesting elevation for ${locations.length} locations…`;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      units: "imperial",
      format: "geojson",
      locations: locations.slice(0, maxLocationsPerRequest).map((item) => item.location),
    }),
  })
    .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
    .then(({ ok, body }) => {
      if (!ok) {
        statusElement.textContent = body.message || "Elevation request failed.";
        return;
      }

      // Features carry no names: add them by index. Drop locations without elevation data.
      state.features = body.features
        .map((feature, i) => ({
          ...feature,
          properties: { ...feature.properties, name: locations[i].name },
        }))
        .filter((feature) => feature.properties.elevation !== null);

      state.map.getSource("locations").setData({ type: "FeatureCollection", features: state.features });

      const credits = Math.max(1, Math.ceil(locations.length / 100));
      const missing = body.features.length - state.features.length;
      statusElement.textContent =
        `1 request · ${locations.length} locations · ${credits} credit${credits > 1 ? "s" : ""}` +
        (missing ? ` · ${missing} without elevation data` : "");
      renderResults();
    });
}

function renderResults() {
  const threshold = getThreshold();
  thresholdValue.textContent = `${threshold.toLocaleString("en-US")} ft (${Math.round(threshold * 0.3048).toLocaleString("en-US")} m)`;

  const sorted = [...state.features].sort((a, b) => b.properties.elevation - a.properties.elevation);
  const aboveCount = sorted.filter((feature) => feature.properties.elevation >= threshold).length;
  summaryElement.textContent = sorted.length
    ? `${aboveCount} of ${sorted.length} locations are at or above the threshold.`
    : "";

  resultsBody.innerHTML = sorted
    .map(({ properties }) => {
      const above = properties.elevation >= threshold;
      return `<tr>
        <td>${properties.name}</td>
        <td class="number">${properties.elevation.toLocaleString("en-US")} ft</td>
        <td><span class="badge ${above ? "above" : "below"}">${above ? "above" : "below"}</span></td>
      </tr>`;
    })
    .join("");
}

function emptyCollection() {
  return { type: "FeatureCollection", features: [] };
}
