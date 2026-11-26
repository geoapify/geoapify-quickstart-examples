/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const apiKey = "5402608de7c44a2d95121c407ad2110b";

// Up to 100 ZIP codes per request (the default is 5, the maximum 500).
const LIMIT = 100;
const COLORS = ["#4263eb", "#f76707", "#2f9e44", "#ae3ec9", "#8d6e63", "#1098ad", "#d6336c", "#5c940d", "#7048e8", "#f59f00"];

// Boston Common, Massachusetts
const state = {
  map: null,
  marker: null,
  center: { lon: -71.0656, lat: 42.355 },
  requestId: 0,
};

const radiusSelect = document.querySelector("#radius-select");
const statsElement = document.querySelector("#stats");
const zipListElement = document.querySelector("#zip-list");
const statusElement = document.querySelector("#status");

initMap();

function initMap() {
  state.map = new maplibregl.Map({
    container: "map",
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
    center: [state.center.lon, state.center.lat],
    zoom: 12,
  });
  state.map.addControl(new maplibregl.NavigationControl(), "top-right");

  state.map.on("load", () => {
    state.map.addSource("zip-areas", { type: "geojson", data: emptyCollection() });
    state.map.addSource("circle", { type: "geojson", data: emptyCollection() });

    state.map.addLayer({
      id: "zip-areas-fill",
      type: "fill",
      source: "zip-areas",
      paint: { "fill-color": ["get", "color"], "fill-opacity": 0.45 },
    });
    state.map.addLayer({
      id: "zip-areas-outline",
      type: "line",
      source: "zip-areas",
      paint: { "line-color": "#ffffff", "line-width": 1.5 },
    });
    state.map.addLayer({
      id: "circle-outline",
      type: "line",
      source: "circle",
      paint: { "line-color": "#1f2933", "line-width": 2, "line-dasharray": [3, 2] },
    });
    // MapLibre places each label inside its polygon.
    state.map.addLayer({
      id: "zip-labels",
      type: "symbol",
      source: "zip-areas",
      layout: {
        "text-field": ["get", "postcode"],
        "text-font": ["Noto Sans Bold"],
        "text-size": 12,
      },
      paint: { "text-color": "#1f2933", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    });

    state.marker = new maplibregl.Marker({ color: "#1f2933", scale: 0.7 })
      .setLngLat([state.center.lon, state.center.lat])
      .addTo(state.map);

    state.map.on("click", (event) => {
      state.center = { lon: event.lngLat.lng, lat: event.lngLat.lat };
      state.marker.setLngLat(event.lngLat);
      showZipCodes();
    });
    radiusSelect.addEventListener("change", showZipCodes);

    showZipCodes();
  });
}

async function showZipCodes() {
  const requestId = ++state.requestId;
  const radius = Number(radiusSelect.value);
  const { lon, lat } = state.center;

  // The circle needs no request, so it appears at once.
  const circle = turf.circle([lon, lat], radius / 1000, { units: "kilometers", steps: 128 });
  state.map.getSource("circle").setData(circle);
  state.map.getSource("zip-areas").setData(emptyCollection());
  state.map.fitBounds(turf.bbox(circle), { padding: 40, duration: 500 });
  statusElement.textContent = "Loading ZIP codes…";

  const zipCodes = await getZipCodes(lon, lat, radius);
  if (requestId !== state.requestId) return; // a newer click or radius replaced this one

  // Cut each ZIP code area to the circle. Large rural ZIPs can cover hundreds of km².
  const clipped = zipCodes.features.map((feature, i) => {
    const inside = turf.intersect(turf.featureCollection([feature, circle]));
    const fullArea = turf.area(feature);
    return {
      type: "Feature",
      geometry: (inside || feature).geometry,
      properties: {
        postcode: feature.properties.postcode,
        color: COLORS[i % COLORS.length],
        entirelyInside: inside ? turf.area(inside) / fullArea > 0.999 : false,
      },
    };
  });

  state.map.getSource("zip-areas").setData(turf.featureCollection(clipped));
  renderStats(clipped);
  statusElement.textContent = clipped.length
    ? clipped.length === LIMIT
      ? `Showing the first ${LIMIT}. Make the circle smaller or page with offset.`
      : "Click the map to try another place."
    : "No ZIP code areas here. Click a place in the US.";
}

async function getZipCodes(lon, lat, radius) {
  const params = new URLSearchParams({
    filter: `circle:${lon},${lat},${radius}`, // radius in meters
    countrycode: "us",
    geometry: "original", // the ZIP code area, not only its point
    limit: LIMIT,
    apiKey,
  });
  const response = await fetch(`https://api.geoapify.com/v1/postcode/list?${params}`);
  return response.json();
}

function renderStats(zipAreas) {
  const entirelyInside = zipAreas.filter((zip) => zip.properties.entirelyInside).length;
  const rows = [
    ["ZIP code areas", zipAreas.length],
    ["Entirely inside", entirelyInside],
    ["Reach in from outside", zipAreas.length - entirelyInside],
  ];
  if (zipAreas.length) rows.push(["Credits (1 per 20 ZIP codes)", Math.ceil(zipAreas.length / 20)]);
  statsElement.innerHTML = rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("");

  zipListElement.innerHTML = zipAreas
    .map((zip) => `<li><span class="swatch" style="background:${zip.properties.color}"></span>${zip.properties.postcode}</li>`)
    .join("");
}

function emptyCollection() {
  return { type: "FeatureCollection", features: [] };
}
