// 👉 Replace with your own API key. Sign up at https://www.geoapify.com/ to get one.
const yourAPIKey = "f82ea38cb77543d59c597faaa263e714";

const initialCenter = [2.351295, 48.857271]; // initial center Paris (lng, lat)
const initialZoom = 11;

const isolineData = {
  lat: initialCenter[1],
  lon: initialCenter[0],
  mode: "drive",
  type: "time"
};

const RANGES_PRESETS = {
  time: [5, 10, 15, 20, 30], // minutes
  distance: [1, 3, 5, 10, 20] // meters
};

const els = {
  mode: document.getElementById("mode"),
  type: document.getElementById("type"),
  rangesToggle: document.getElementById("rangesToggle"),
  legendItems: document.getElementById("legendItems")
};

// Initialize inputs
els.mode.value = isolineData.mode;
els.type.value = isolineData.type;

// The MapLibre GL map object
const map = new maplibregl.Map({
  container: "map", // ID of the container element
  style: `https://maps.geoapify.com/v1/styles/osm-bright-grey/style.json?apiKey=${yourAPIKey}`,
  center: initialCenter,
  zoom: initialZoom
});

// Basic controls
map.addControl(
  new maplibregl.NavigationControl({ showCompass: true }),
  "top-right"
);
map.addControl(
  new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: false,
    showAccuracyCircle: true
  }),
  "top-right"
);

// Center marker
const markerEl = document.createElement("div");
markerEl.style.cssText =
  "width:14px;height:14px;border-radius:50%;background:#60a5fa;border:2px solid white;box-shadow:0 0 0 2px rgba(96,165,250,.35)";
const centerMarker = new maplibregl.Marker({
  element: markerEl,
  draggable: true
})
  .setLngLat([isolineData.lon, isolineData.lat])
  .addTo(map);

centerMarker.on("dragend", () => {
  const { lng, lat } = centerMarker.getLngLat();
  isolineData.lat = lat;
  isolineData.lon = lng;
  getIsoline();
});

map.on("click", (e) => {
  const { lng, lat } = e.lngLat;
  isolineData.lat = lat;
  isolineData.lon = lng;
  centerMarker.setLngLat([lng, lat]);
  getIsoline();
});

// ===== Range toggles =====
function renderRangeToggles() {
  const type = els.type.value; // 'time' | 'distance'
  const values = RANGES_PRESETS[type];
  els.rangesToggle.innerHTML = "";
  isolineData.ranges = new Set(values.slice(0, 3)); // default select first three
  
  values.forEach((v) => {
    const btn = document.createElement("button");
    btn.className = "toggle";
    btn.type = "button";
    btn.dataset.value = String(v);
    btn.setAttribute("aria-pressed", isolineData.ranges.has(v) ? "true" : "false");
    btn.textContent = type === "time" ? `${v} min` : `${v} km`;
    if (isolineData.ranges.has(v)) btn.classList.add("active");
    btn.addEventListener("click", () => {
      const num =
        type === "time"
          ? parseInt(btn.dataset.value, 10)
          : parseInt(btn.dataset.value, 10);
      if (isolineData.ranges.has(num)) {
        isolineData.ranges.delete(num);
        btn.setAttribute("aria-pressed", "false");
        btn.classList.remove("active");
      } else {
        isolineData.ranges.add(num);
        btn.setAttribute("aria-pressed", "true");
        btn.classList.add("active");
      }
      
      getIsoline();
    });
    els.rangesToggle.appendChild(btn);
  });
}

renderRangeToggles();

els.type.addEventListener("change", () => {
  renderRangeToggles();
  getIsoline();
});

// Helpers
function colorForIndex(i, total) {
  const hue = Math.round((i / Math.max(total, 1)) * 300);
  return `hsl(${hue} 85% 60%)`;
}

async function fetchIsoline(lat, lon, type, mode, range, apiKey) {
  const p = new URLSearchParams({
    lat,
    lon,
    type,
    mode,
    range: String(range),
    apiKey: yourAPIKey
  });

  const res = await fetch(
    `https://api.geoapify.com/v1/isoline?${p.toString()}`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${res.statusText}`);
  return res.json();
}

function clearIsolines() {
  const layers = map.getStyle().layers.map((l) => l.id);
  layers.forEach((id) => {
    if (id.startsWith("isoline-fill-") || id.startsWith("isoline-line-")) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
  });

  els.legendItems.innerHTML = "in progress...";
}

function addLegendItem(label, color) {
  const el = document.createElement("span");
  el.className = "chip";
  el.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block"></span> ${label}`;
  els.legendItems.appendChild(el);
}

function fitToGeoJSON(geo) {
  const b = new maplibregl.LngLatBounds();
  function extend(coords) {
    for (const c of coords) {
      if (typeof c[0] === "number") b.extend(c);
      else extend(c);
    }
  }
  if (geo.type === "FeatureCollection")
    geo.features.forEach((f) => extend(f.geometry.coordinates));
  else if (geo.type === "Feature") extend(geo.geometry.coordinates);
  else extend(geo.coordinates);
  if (!b.isEmpty()) map.fitBounds(b, { padding: 20 });
}

async function getIsoline() {
  if (!isolineData.ranges.size) {
    alert("Please choose at least one range.");
    return;
  }

  // Convert for API: time -> seconds; distance -> meters
  const apiRanges =
    isolineData.type === "time"
      ? [...isolineData.ranges].map((m) => m * 60 /* min to sec */)
      : [...isolineData.ranges].map((m) => m * 1000 /* km to m */);

  clearIsolines();

  // One API call with multiple ranges (e.g., range=300,600,900)
  try {
    const rangesParam = apiRanges.join(",");
    const data = await fetchIsoline(
      isolineData.lat,
      isolineData.lon,
      isolineData.type,
      isolineData.mode,
      rangesParam,
      yourAPIKey
    );

    // Use a single source; paint each range as its own fill+line layer via filters.
    const srcId = "isoline-multi";
    
    if (!map.getSource(srcId)) {
       map.addSource(srcId, { type: "geojson", data });
    } else {
      map.getSource(srcId).setData(data);
    }
    

    // Draw largest first so smaller areas sit on top
    const ordered = [...apiRanges].sort((a, b) => b - a);

    // Reset legend
    els.legendItems.innerHTML = "";

    ordered.forEach((range, i) => {
      const color = colorForIndex(i, ordered.length);
      const fillId = `isoline-fill-${range}`;
      const lineId = `isoline-line-${range}`;

      // Remove existing layers if re-drawing
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getLayer(lineId)) map.removeLayer(lineId);

      // Filter tries common property names used for range on features
      const filterExpr = ["any", ["==", ["get", "range"], range]];

      map.addLayer({
        id: fillId,
        type: "fill",
        source: srcId,
        paint: { "fill-color": color, "fill-opacity": 0.25 },
        filter: filterExpr
      });

      map.addLayer({
        id: lineId,
        type: "line",
        source: srcId,
        paint: { "line-color": color, "line-width": 2 },
        filter: filterExpr
      });

      const label =
        type === "time" ? `${Math.round(range / 60)} min` : `${range} m`;
      addLegendItem(label, color);
    });

    // Fit to all returned geometry once
    fitToGeoJSON(data);
  } catch (err) {
    console.error(err);
    alert("Failed to fetch isolines. See console for details.");
  }
}

els.mode.addEventListener("change", () => {
  isolineData.mode = els.mode.value;
  getIsoline();
});

els.type.addEventListener("change", () => {
  isolineData.type = els.type.value;
  getIsoline();
});

map.once("load", () => {
  getIsoline();
});