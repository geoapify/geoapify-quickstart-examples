/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const apiKey = "5402608de7c44a2d95121c407ad2110b";

const maxLocationsPerRequest = 1000;
const routingMode = "bicycle";

// Golden, Colorado: 1801 19th Street → up Lookout Mountain Road → Buffalo Bill Memorial Museum
const waypoints = {
  start: [-105.225152, 39.744567],
  end: [-105.238471, 39.733471],
};

const state = {
  map: null,
  routeCoordinates: [],
  routeElevation: [],
  profile: [],
  hoverMarker: null,
  requestId: 0,
};

const intervalSelect = document.querySelector("#interval-select");
const sourceInputs = document.querySelectorAll('input[name="source"]');
const statsElement = document.querySelector("#stats");
const statusElement = document.querySelector("#status");
const chartElement = document.querySelector("#profile-chart");

initMap();

function initMap() {
  state.map = new maplibregl.Map({
    container: "map",
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
    center: [-105.232, 39.739],
    zoom: 13.6,
  });
  state.map.addControl(new maplibregl.NavigationControl(), "top-right");

  state.map.on("load", () => {
    state.map.addSource("route", { type: "geojson", data: emptyCollection() });
    state.map.addSource("samples", { type: "geojson", data: emptyCollection() });

    state.map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#6b4eff", "line-width": 5, "line-opacity": 0.6 },
    });
    state.map.addLayer({
      id: "sample-points",
      type: "circle",
      source: "samples",
      paint: {
        "circle-radius": 3.5,
        "circle-color": "#ffffff",
        "circle-stroke-color": "#3d2db3",
        "circle-stroke-width": 1.5,
      },
    });

    addWaypointMarker("A", "start");
    addWaypointMarker("B", "end");
    state.hoverMarker = new maplibregl.Marker({ element: createHoverElement() });

    loadRoute();
  });

  intervalSelect.addEventListener("change", () => showProfile());
  sourceInputs.forEach((input) => input.addEventListener("change", () => showProfile()));
}

function addWaypointMarker(label, key) {
  const element = document.createElement("div");
  element.className = "waypoint-marker";
  element.textContent = label;

  const marker = new maplibregl.Marker({ element, draggable: true })
    .setLngLat(waypoints[key])
    .addTo(state.map);

  marker.on("dragend", () => {
    const { lng, lat } = marker.getLngLat();
    waypoints[key] = [lng, lat];
    loadRoute();
  });
}

function createHoverElement() {
  const element = document.createElement("div");
  element.className = "hover-marker";
  return element;
}

function getSource() {
  return document.querySelector('input[name="source"]:checked').value;
}

// 1. Get the route geometry from the Routing API.
// details=elevation also returns the route's own heights, so both sources work without a new request.
function loadRoute() {
  const requestId = ++state.requestId;
  const [startLon, startLat] = waypoints.start;
  const [endLon, endLat] = waypoints.end;
  const url = `https://api.geoapify.com/v1/routing?waypoints=${startLat},${startLon}|${endLat},${endLon}&mode=${routingMode}&details=elevation&format=json&apiKey=${apiKey}`;

  statusElement.textContent = "Loading the route…";

  fetch(url)
    .then((response) => response.json().then((body) => ({ ok: response.ok, body })))
    .then(({ ok, body }) => {
      if (requestId !== state.requestId) return;
      if (!ok || !body.results || !body.results.length) {
        showError(body.message || "No route found between A and B.");
        return;
      }

      const route = body.results[0];

      // format=json: one array of {lon, lat} per leg → one line of [lon, lat]
      state.routeCoordinates = route.geometry.flat().map(({ lon, lat }) => [lon, lat]);
      state.routeElevation = getRouteElevation(route);
      state.map.getSource("route").setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: state.routeCoordinates },
      });

      showProfile();
    });
}

// details=elevation: each leg has elevation_range, one [distance, height] pair per geometry point of that leg.
// Distances start at 0 on every leg, so add the length of the previous legs.
function getRouteElevation(route) {
  let offset = 0;
  return route.legs.flatMap((leg, legIndex) => {
    const points = leg.elevation_range.map(([distance, height], i) => {
      const { lon, lat } = route.geometry[legIndex][i];
      return { distance: offset + distance, location: [lon, lat], elevation: height };
    });
    offset += leg.distance;
    return points;
  });
}

function showProfile() {
  const useRouting = getSource() === "routing-api";
  intervalSelect.disabled = useRouting;
  if (useRouting) {
    routeProfile();
  } else {
    sampleAndProfile();
  }
}

// 2a. The Routing API's own heights: one per route geometry point, unevenly spaced
function routeProfile() {
  if (!state.routeElevation.length) return;

  ++state.requestId;
  const profile = state.routeElevation;
  showPoints(profile);

  state.profile = profile;
  renderRouteStats(profile);
  renderChart(profile);
  statusElement.textContent = "Heights from the route response. Hover the chart to find a point on the map.";
}

// 2b. Place a point every N meters and 3. get their elevation from the Elevation API
function sampleAndProfile() {
  if (!state.routeCoordinates.length) return;

  const requestId = ++state.requestId;
  const interval = Number(intervalSelect.value);
  const points = samplePoints(state.routeCoordinates, interval);
  const requests = Math.ceil(points.length / maxLocationsPerRequest);

  statusElement.textContent = `Requesting elevation for ${points.length} points…`;
  showPoints(points);

  getProfile(points).then((profile) => {
    if (requestId !== state.requestId) return;
    if (!profile) return;

    state.profile = profile;
    renderStats(profile, interval, points.length, requests);
    renderChart(profile);
    statusElement.textContent = "Hover the chart to find a point on the map.";
  });
}

function showPoints(points) {
  state.map.getSource("samples").setData({
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: point.location },
    })),
  });
}

function haversine([lon1, lat1], [lon2, lat2]) {
  const earthRadius = 6371008.8;
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

// Walk the line and add an interpolated point every `interval` meters; keep the first and last point
function samplePoints(coords, interval) {
  const points = [{ location: coords[0], distance: 0 }];
  let traveled = 0;
  let next = interval;

  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const segment = haversine(a, b);

    while (segment > 0 && traveled + segment >= next) {
      const t = (next - traveled) / segment;
      points.push({
        location: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        distance: next,
      });
      next += interval;
    }
    traveled += segment;
  }

  const last = coords[coords.length - 1];
  if (traveled - points[points.length - 1].distance > 1) {
    points.push({ location: last, distance: traveled });
  }
  return points;
}

// Up to 1,000 locations per Elevation API request; results keep the input order
function getProfile(points) {
  const url = `https://api.geoapify.com/v1/geodata/elevation?apiKey=${apiKey}`;
  const chunks = [];
  for (let start = 0; start < points.length; start += maxLocationsPerRequest) {
    chunks.push(points.slice(start, start + maxLocationsPerRequest));
  }

  return Promise.all(
    chunks.map((chunk) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locations: chunk.map((point) => point.location) }),
      }).then((response) => response.json().then((body) => ({ ok: response.ok, body, chunk })))
    )
  ).then((answers) => {
    const failed = answers.find((answer) => !answer.ok);
    if (failed) {
      showError(failed.body.message || "Elevation request failed.");
      return null;
    }

    return answers
      .flatMap(({ body, chunk }) =>
        body.results.map((result, i) => ({
          distance: chunk[i].distance,
          location: chunk[i].location,
          elevation: result.elevation,
        }))
      )
      .filter((point) => point.elevation !== null);
  });
}

function renderStats(profile, interval, pointCount, requests) {
  const credits = chunkCredits(pointCount);
  renderRows(profile, [
    ["Sampled points", `${pointCount} (every ${interval} m)`],
    ["Elevation requests", `${requests} · ${credits} credit${credits > 1 ? "s" : ""}`],
  ]);
}

function renderRouteStats(profile) {
  const gaps = profile.slice(1).map((point, i) => point.distance - profile[i].distance).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  renderRows(profile, [
    ["Route points", `${profile.length}`],
    ["Spacing", `${gaps[0].toFixed(1)}–${Math.round(gaps[gaps.length - 1])} m, median ${median.toFixed(1)} m`],
    ["Elevation requests", "none, heights come with the route"],
  ]);
}

function renderRows(profile, sourceRows) {
  const elevations = profile.map((point) => point.elevation);
  let ascent = 0;

  for (let i = 1; i < profile.length; i++) {
    const rise = profile[i].elevation - profile[i - 1].elevation;
    if (rise > 0) ascent += rise;
  }

  const steepest = findSteepest(profile);

  const rows = [
    ["Route length", `${(profile[profile.length - 1].distance / 1000).toFixed(2)} km`],
    ...sourceRows,
    ["Lowest / highest", `${Math.round(Math.min(...elevations))} m / ${Math.round(Math.max(...elevations))} m`],
    ["Total ascent", `${Math.round(ascent)} m`],
    ["Steepest section", `${(steepest.grade * 100).toFixed(1)}% over ${Math.round(steepest.length)} m at ${(steepest.distance / 1000).toFixed(1)} km`],
  ];

  statsElement.innerHTML = rows.map(([name, value]) => `<dt>${name}</dt><dd>${value}</dd>`).join("");
}

// The steepest climb over at least 100 m. Single short gaps are left out: over a few meters,
// small differences in the terrain data turn into grades no road has.
function findSteepest(profile, minLength = 100) {
  let steepest = { grade: 0, distance: 0, length: 0 };
  let j = 0;

  for (let i = 0; i < profile.length; i++) {
    j = Math.max(j, i + 1);
    while (j < profile.length && profile[j].distance - profile[i].distance < minLength) j++;
    if (j >= profile.length) break;

    const run = profile[j].distance - profile[i].distance;
    const grade = (profile[j].elevation - profile[i].elevation) / run;
    if (grade > steepest.grade) {
      steepest = { grade, distance: profile[j].distance, length: run };
    }
  }
  return steepest;
}

// Each request costs max(1, ceil(locations / 100)) credits
function chunkCredits(pointCount) {
  let credits = 0;
  for (let left = pointCount; left > 0; left -= maxLocationsPerRequest) {
    credits += Math.max(1, Math.ceil(Math.min(left, maxLocationsPerRequest) / 100));
  }
  return credits;
}

// A plain SVG line chart: distance (km) on x, elevation (m) on y
function renderChart(profile) {
  const width = chartElement.clientWidth || 800;
  const height = chartElement.clientHeight || 200;
  const pad = { left: 52, right: 16, top: 16, bottom: 30 };
  const maxDistance = profile[profile.length - 1].distance;
  const elevations = profile.map((point) => point.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  const span = Math.max(maxElevation - minElevation, 1);

  const x = (distance) => pad.left + (distance / maxDistance) * (width - pad.left - pad.right);
  const y = (elevation) => height - pad.bottom - ((elevation - minElevation) / span) * (height - pad.top - pad.bottom);

  const line = profile.map((p, i) => `${i ? "L" : "M"}${x(p.distance).toFixed(1)},${y(p.elevation).toFixed(1)}`).join(" ");
  const area = `${line} L${x(maxDistance)},${height - pad.bottom} L${x(0)},${height - pad.bottom} Z`;
  const dotRadius = profile.length > 200 ? 1.6 : 2.5;
  const dots = profile.length <= 600
    ? profile.map((p) => `<circle cx="${x(p.distance).toFixed(1)}" cy="${y(p.elevation).toFixed(1)}" r="${dotRadius}" class="dot" />`).join("")
    : "";

  chartElement.setAttribute("viewBox", `0 0 ${width} ${height}`);
  chartElement.innerHTML = `
    <title id="profile-title">Route elevation profile</title>
    <path d="${area}" class="area" />
    <path d="${line}" class="line" />
    ${dots}
    <text x="${pad.left - 8}" y="${y(maxElevation) + 4}" class="label" text-anchor="end">${Math.round(maxElevation)} m</text>
    <text x="${pad.left - 8}" y="${y(minElevation) + 4}" class="label" text-anchor="end">${Math.round(minElevation)} m</text>
    <text x="${x(0)}" y="${height - 8}" class="label">0 km</text>
    <text x="${x(maxDistance)}" y="${height - 8}" class="label" text-anchor="end">${(maxDistance / 1000).toFixed(2)} km</text>
    <line id="hover-line" class="hover-line" y1="${pad.top}" y2="${height - pad.bottom}" visibility="hidden" />
    <text id="hover-label" class="hover-label" y="${pad.top + 12}"></text>`;

  chartElement.onmousemove = (event) => {
    const box = chartElement.getBoundingClientRect();
    const distance = ((event.clientX - box.left) * (width / box.width) - pad.left) / (width - pad.left - pad.right) * maxDistance;
    const point = profile.reduce((best, p) => (Math.abs(p.distance - distance) < Math.abs(best.distance - distance) ? p : best));
    const hoverLine = chartElement.querySelector("#hover-line");
    const hoverLabel = chartElement.querySelector("#hover-label");

    hoverLine.setAttribute("x1", x(point.distance));
    hoverLine.setAttribute("x2", x(point.distance));
    hoverLine.setAttribute("visibility", "visible");
    hoverLabel.setAttribute("x", Math.min(x(point.distance) + 6, width - 150));
    hoverLabel.textContent = `${(point.distance / 1000).toFixed(2)} km · ${Math.round(point.elevation)} m`;
    state.hoverMarker.setLngLat(point.location).addTo(state.map);
  };

  chartElement.onmouseleave = () => {
    chartElement.querySelector("#hover-line").setAttribute("visibility", "hidden");
    chartElement.querySelector("#hover-label").textContent = "";
    state.hoverMarker.remove();
  };
}

function showError(message) {
  statusElement.textContent = message;
  statsElement.innerHTML = "";
  chartElement.innerHTML = "";
}

function emptyCollection() {
  return { type: "FeatureCollection", features: [] };
}
