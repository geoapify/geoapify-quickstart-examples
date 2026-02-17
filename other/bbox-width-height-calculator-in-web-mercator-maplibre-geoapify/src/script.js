// 👉 Replace with your own API key. Sign up at https://www.geoapify.com/ to get one.
const yourAPIKey = "f82ea38cb77543d59c597faaa263e714";

const initialCenter = [13.405, 52.52]; // Berlin, [lon, lat]
const initialZoom = 6;
const TILE_SIZE = 256; // Standard for interactive maps

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright-grey/style.json?apiKey=${yourAPIKey}`,
  center: initialCenter,
  zoom: initialZoom
});

map.addControl(
  new maplibregl.NavigationControl({ showCompass: true }),
  "top-right"
);

// --- Web Mercator helpers ---
const PI = Math.PI;
const MAX_LAT = 85.05112878;

function clampLat(lat) {
  return Math.max(Math.min(lat, MAX_LAT), -MAX_LAT);
}

function lonToX(lon) {
  // Convert longitude in degrees to normalized X coordinate in [0..1] range
  return (lon + 180) / 360;
}

function latToY(lat) {
  // Convert latitude from degrees to radians and clamp to Mercator limits
  const φ = (clampLat(lat) * PI) / 180;
  // Calculate sine of latitude in radians
  const s = Math.sin(φ);
  // Apply Web Mercator formula: normalized Y coordinate in [0..1]
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * PI);
}

function worldSizePx(z, tileSize) {
  return tileSize * Math.pow(2, z);
}

function dxNormalized(lon1, lon2) {
  // shortest path across antimeridian
  const x1 = lonToX(lon1),
    x2 = lonToX(lon2);
  let dx = Math.abs(x2 - x1);
  if (dx > 0.5) dx = 1 - dx; // wrap across 180°
  return dx;
}

function dyNormalized(lat1, lat2) {
  const y1 = latToY(lat1),
    y2 = latToY(lat2);
  return Math.abs(y2 - y1);
}

// Core calculators
function calcFromZoom(lon1, lat1, lon2, lat2, z, tileSize) {
  const dx = dxNormalized(lon1, lon2);
  const dy = dyNormalized(lat1, lat2);
  const ws = worldSizePx(z, tileSize);
  return { widthPx: dx * ws, heightPx: dy * ws, zoom: z };
}

function calcFromKnownWidth(lon1, lat1, lon2, lat2, widthPx, tileSize) {
  const dx = dxNormalized(lon1, lon2);
  const dy = dyNormalized(lat1, lat2);
  if (dx === 0) return { widthPx: 0, heightPx: 0, zoom: null };

  const heightPx = widthPx * (dy / dx);
  const ws = widthPx / dx; // world size in px
  const zoom = Math.log2(ws / tileSize);

  return { widthPx, heightPx, zoom };
}

function calcFromKnownHeight(lon1, lat1, lon2, lat2, heightPx, tileSize) {
  const dx = dxNormalized(lon1, lon2);
  const dy = dyNormalized(lat1, lat2);
  if (dy === 0) return { widthPx: 0, heightPx: 0, zoom: null };

  const widthPx = heightPx * (dx / dy);
  const ws = heightPx / dy; // world size in px
  const zoom = Math.log2(ws / tileSize);

  return { widthPx, heightPx, zoom };
}

// UI plumbing
const lon1El = document.getElementById("lon1"),
  lat1El = document.getElementById("lat1"),
  lon2El = document.getElementById("lon2"),
  lat2El = document.getElementById("lat2");
const modeEl = document.getElementById("mode");
const zoomEl = document.getElementById("zoom");
const knownWidthEl = document.getElementById("knownWidth");
const knownHeightEl = document.getElementById("knownHeight");
const resultEl = document.getElementById("result");

const modeZoomBox = document.getElementById("mode-zoom");
const modeWidthBox = document.getElementById("mode-knownWidth");
const modeHeightBox = document.getElementById("mode-knownHeight");

function syncModeVisibility() {
  const mode = modeEl.value;
  modeZoomBox.classList.toggle("hidden", mode !== "zoom");
  modeWidthBox.classList.toggle("hidden", mode !== "knownWidth");
  modeHeightBox.classList.toggle("hidden", mode !== "knownHeight");
}
modeEl.addEventListener("change", syncModeVisibility);
syncModeVisibility();

function readInputs() {
  return {
    lon1: parseFloat(lon1El.value),
    lat1: parseFloat(lat1El.value),
    lon2: parseFloat(lon2El.value),
    lat2: parseFloat(lat2El.value)
  };
}

function fmt(n, digits = 2) {
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

function calculate() {
  const { lon1, lat1, lon2, lat2 } = readInputs();
  const mode = modeEl.value;
  let out = null;

  if (mode === "zoom") {
    const z = parseFloat(zoomEl.value);
    out = calcFromZoom(lon1, lat1, lon2, lat2, z, TILE_SIZE);
  } else if (mode === "knownWidth") {
    const widthPx = parseFloat(knownWidthEl.value);
    out = calcFromKnownWidth(lon1, lat1, lon2, lat2, widthPx, TILE_SIZE);
  } else {
    const heightPx = parseFloat(knownHeightEl.value);
    out = calcFromKnownHeight(lon1, lat1, lon2, lat2, heightPx, TILE_SIZE);
  }

  resultEl.innerHTML = `
        <div><strong>Pixels width</strong>: ${fmt(out.widthPx)}, height: ${fmt(
    out.heightPx
  )}</div>
        <div><strong>Corresponding zoom</strong>: ${
          out.zoom == null ? "—" : fmt(out.zoom, 3)
        }</div>
      `;

  return out;
}

document.getElementById("calc").addEventListener("click", calculate);

function fitBBox() {
  const { lon1, lat1, lon2, lat2 } = readInputs();
  const sw = [Math.min(lon1, lon2), Math.min(lat1, lat2)];
  const ne = [Math.max(lon1, lon2), Math.max(lat1, lat2)];
  map.fitBounds([sw, ne], { padding: 40, duration: 600 });
}

document.getElementById("fit").addEventListener("click", () => {
  fitBBox();
});

// Draw bbox on map
const sourceId = "bbox-src";
const layerId = "bbox-layer";

function bboxPolygon(lon1, lat1, lon2, lat2) {
  // returns a simple bbox polygon (does not split at antimeridian)
  const sw = [lon1, lat1];
  const nw = [lon1, lat2];
  const ne = [lon2, lat2];
  const se = [lon2, lat1];
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [[sw, nw, ne, se, sw]] },
    properties: {}
  };
}

function drawBBox() {
  const { lon1, lat1, lon2, lat2 } = readInputs();
  const feat = bboxPolygon(
    Math.min(lon1, lon2),
    Math.min(lat1, lat2),
    Math.max(lon1, lon2),
    Math.max(lat1, lat2)
  );

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [feat] }
    });
    map.addLayer({
      id: layerId,
      type: "fill",
      source: sourceId,
      paint: { "fill-color": "#3b82f6", "fill-opacity": 0.2 }
    });
    map.addLayer({
      id: layerId + "-outline",
      type: "line",
      source: sourceId,
      paint: { "line-color": "#1d4ed8", "line-width": 2 }
    });
  } else {
    const src = map.getSource(sourceId);
    src.setData({ type: "FeatureCollection", features: [feat] });
  }
  
  fitBBox();
}

document.getElementById("draw").addEventListener("click", () => {
  drawBBox();
});

// Initial compute + draw
map.on("load", () => {
  calculate();
  drawBBox();
});