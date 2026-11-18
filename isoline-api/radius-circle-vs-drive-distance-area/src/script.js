/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const apiKey = "5402608de7c44a2d95121c407ad2110b";

// Downtown Memphis, Tennessee, on the east bank of the Mississippi River
const state = {
  map: null,
  marker: null,
  center: { lon: -90.049, lat: 35.1495 },
  requestId: 0,
};

const distanceSelect = document.querySelector("#distance-select");
const statsElement = document.querySelector("#stats");
const statusElement = document.querySelector("#status");

initMap();

function initMap() {
  state.map = new maplibregl.Map({
    container: "map",
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
    center: [state.center.lon, state.center.lat],
    zoom: 11,
  });
  state.map.addControl(new maplibregl.NavigationControl(), "top-right");

  state.map.on("load", () => {
    state.map.addSource("radius-circle", { type: "geojson", data: emptyCollection() });
    state.map.addSource("drive-distance", { type: "geojson", data: emptyCollection() });

    // The circle goes below the drive-distance area.
    state.map.addLayer({
      id: "radius-circle-fill",
      type: "fill",
      source: "radius-circle",
      paint: { "fill-color": "#f76707", "fill-opacity": 0.1 },
    });
    state.map.addLayer({
      id: "radius-circle-outline",
      type: "line",
      source: "radius-circle",
      paint: { "line-color": "#f76707", "line-width": 2, "line-dasharray": [3, 2] },
    });
    state.map.addLayer({
      id: "drive-distance-fill",
      type: "fill",
      source: "drive-distance",
      paint: { "fill-color": "#623aff", "fill-opacity": 0.3 },
    });
    state.map.addLayer({
      id: "drive-distance-outline",
      type: "line",
      source: "drive-distance",
      paint: { "line-color": "#623aff", "line-width": 2 },
    });

    state.marker = new maplibregl.Marker({ color: "#222222" })
      .setLngLat([state.center.lon, state.center.lat])
      .addTo(state.map);

    state.map.on("click", (event) => {
      state.center = { lon: event.lngLat.lng, lat: event.lngLat.lat };
      state.marker.setLngLat(event.lngLat);
      showAreas();
    });
    distanceSelect.addEventListener("change", showAreas);

    showAreas();
  });
}

async function showAreas() {
  const requestId = ++state.requestId;
  const distance = Number(distanceSelect.value);
  const { lon, lat } = state.center;

  // The circle needs no request, so it appears at once.
  const radiusCircle = circlePolygon(lon, lat, distance);
  state.map.getSource("radius-circle").setData(radiusCircle);
  state.map.getSource("drive-distance").setData(emptyCollection());
  fitToCircle(radiusCircle);

  statusElement.textContent = "Loading the drive-distance area…";
  const driveDistanceArea = await getDriveDistanceArea(lon, lat, distance);
  if (requestId !== state.requestId) return; // a newer click or distance replaced this one

  if (!driveDistanceArea.features?.length) {
    statusElement.textContent = "No drive-distance area here. Click closer to a road.";
    renderStats(radiusCircle, null);
    return;
  }

  state.map.getSource("drive-distance").setData(driveDistanceArea);
  renderStats(radiusCircle, driveDistanceArea);
  statusElement.textContent = "Click the map to compare another place.";
}

async function getDriveDistanceArea(lon, lat, distance) {
  const params = new URLSearchParams({
    lat,
    lon,
    type: "distance",
    mode: "drive",
    range: distance, // meters
    apiKey,
  });
  let response = await fetch(`https://api.geoapify.com/v1/isoline?${params}`);

  // 202: the isoline is still being calculated. Ask for it again by its id.
  while (response.status === 202) {
    const { properties } = await response.json();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    response = await fetch(`https://api.geoapify.com/v1/isoline?id=${properties.id}&apiKey=${apiKey}`);
  }
  return response.json();
}

// MapLibre's circle layer takes a radius in pixels, so the circle is built as a GeoJSON polygon in meters.
function circlePolygon(lon, lat, radiusMeters, steps = 64) {
  const earthRadius = 6371008.8;
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const toDeg = (radians) => (radians * 180) / Math.PI;
  const angularDistance = radiusMeters / earthRadius;
  const lat1 = toRad(lat);
  const lon1 = toRad(lon);
  const ring = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
        Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
        Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
      );
    ring.push([toDeg(lon2), toDeg(lat2)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

function fitToCircle(circle) {
  const bounds = new maplibregl.LngLatBounds();
  circle.geometry.coordinates[0].forEach((position) => bounds.extend(position));
  state.map.fitBounds(bounds, { padding: 40, duration: 500 });
}

function renderStats(circle, driveDistanceArea) {
  const circleArea = geometryArea(circle.geometry);
  const rows = [["Radius circle", formatArea(circleArea)]];

  if (driveDistanceArea) {
    const driveArea = driveDistanceArea.features.reduce((sum, feature) => sum + geometryArea(feature.geometry), 0);
    rows.push(["Drive-distance area", formatArea(driveArea)]);
    rows.push(["Share of the circle", `${Math.round((driveArea / circleArea) * 100)}%`]);
  }

  statsElement.innerHTML = rows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("");
}

// Area on the sphere in square meters: outer rings minus holes.
function geometryArea(geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.reduce(
    (sum, rings) => sum + rings.reduce((polygonSum, ring, i) => polygonSum + (i === 0 ? 1 : -1) * Math.abs(ringArea(ring)), 0),
    0
  );
}

function ringArea(ring) {
  const earthRadius = 6371008.8;
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    area += toRad(lon2 - lon1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return (area * earthRadius * earthRadius) / 2;
}

function formatArea(squareMeters) {
  return `${(squareMeters / 1e6).toFixed(1)} km²`;
}

function emptyCollection() {
  return { type: "FeatureCollection", features: [] };
}
