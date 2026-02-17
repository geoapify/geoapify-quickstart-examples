// Simple Leaflet + Geoapify demo: search places by categories on map move
const GEOAPIFY_API_KEY = "f82ea38cb77543d59c597faaa263e714";

// Configure categories, labels, and icons (Geoapify Icons API)
// icon names are from the "awesome" icon set; adjust if preferred
const CATEGORY_CONFIG = [
  { category: "entertainment.activity_park", label: "Activity Park", icon: "tree", enabled: true },
  { category: "entertainment.activity_park.climbing", label: "Climbing", icon: "mountain", enabled: true },
  { category: "entertainment.activity_park.trampoline", label: "Trampoline", icon: "person-running", enabled: true },
  { category: "entertainment.amusement_arcade", label: "Arcade", icon: "gamepad", enabled: true },
  { category: "entertainment.aquarium", label: "Aquarium", icon: "fish", enabled: true },
  { category: "entertainment.bowling_alley", label: "Bowling", icon: "bowling-ball", enabled: true },
  { category: "entertainment.cinema", label: "Cinema", icon: "film", enabled: true },
  { category: "entertainment.culture.arts_centre", label: "Arts Centre", icon: "palette", enabled: true },
  { category: "entertainment.culture.gallery", label: "Gallery", icon: "images", enabled: true },
  { category: "entertainment.culture.theatre", label: "Theatre", icon: "masks-theater", enabled: true },
  { category: "entertainment.escape_game", label: "Escape Game", icon: "person-running", enabled: true },
  { category: "entertainment.flying_fox", label: "Flying Fox", icon: "plane", enabled: true },
  { category: "entertainment.miniature_golf", label: "Mini Golf", icon: "golf-ball-tee", enabled: true },
  { category: "entertainment.museum", label: "Museum", icon: "university", enabled: true },
  { category: "entertainment.planetarium", label: "Planetarium", icon: "meteor", enabled: true },
  { category: "entertainment.theme_park", label: "Theme Park", icon: "parachute-box", enabled: true },
  { category: "entertainment.water_park", label: "Water Park", icon: "water", enabled: true },
  { category: "entertainment.zoo", label: "Zoo", icon: "paw", enabled: true }
];

// Map setup
const initialCenter = [51.5074, -0.1278]; // London
const map = L.map("map", { zoomControl: true }).setView(initialCenter, 14);

const SEARCH_DELAY_MS = 600;
const MIN_SEARCH_ZOOM = 13;

// Detect retina/high-DPI screens for crisper tiles & icons
const IS_RETINA = ((typeof window !== "undefined" ? window.devicePixelRatio : 1) || 1) > 1 || (L && L.Browser && L.Browser.retina);

// Geoapify map tiles using klokantech-basic. Use @2x for retina.
const tileBase = "https://maps.geoapify.com/v1/tile/klokantech-basic/{z}/{x}/{y}";
const tileUrl = `${tileBase}${IS_RETINA ? "@2x" : ""}.png?apiKey=${GEOAPIFY_API_KEY}`;
const tileAttrib =
  'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener">Geoapify</a> | Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
L.tileLayer(tileUrl, { attribution: tileAttrib, maxZoom: 20 }).addTo(map);

// Layers & accumulated results state
const resultsLayer = L.layerGroup().addTo(map);
const seenPlaceIds = new Set();

function clearAllResults() {
  resultsLayer.clearLayers();
  seenPlaceIds.clear();
}

let activeSearchId = 0;

function getFragments(bounds, zoom) {
  if (!bounds) return [];
  const chunks = getAxisChunksForZoom(zoom);
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  if (chunks <= 1) {
    return [{ minLng: sw.lng, minLat: sw.lat, maxLng: ne.lng, maxLat: ne.lat }];
  }
  
  console.log(chunks);

  const latStep = (ne.lat - sw.lat) / chunks;
  const lngStep = (ne.lng - sw.lng) / chunks;
  const rects = [];

  for (let row = 0; row < chunks; row += 1) {
    const minLat = sw.lat + row * latStep;
    const maxLat = row === chunks - 1 ? ne.lat : minLat + latStep;

    for (let col = 0; col < chunks; col += 1) {
      const minLng = sw.lng + col * lngStep;
      const maxLng = col === chunks - 1 ? ne.lng : minLng + lngStep;
      rects.push({ minLng, minLat, maxLng, maxLat });
    }
  }

  return rects;
}

function getAxisChunksForZoom(zoom) {
  const z = Math.floor(zoom);
  const delta = Math.max(0, 16 - z);
  return delta;
}

// UI elements
const statusEl = document.getElementById("status");
const zoomInfoEl = document.getElementById("zoom-info");
const buttonsContainer = document.getElementById("category-buttons");

// Create toggle buttons for categories
const state = new Map();
CATEGORY_CONFIG.forEach(({ category, label, icon, enabled }) => {
  state.set(category, { enabled: !!enabled, icon, label });
  const btn = document.createElement("button");
  btn.className = `toggle ${enabled ? "toggle--on" : ""}`;
  btn.dataset.category = category;
  btn.title = `${label} (${category})`;

  const img = document.createElement("img");
  img.className = "toggle__icon";
  img.alt = label;
  img.src = buttonIconUrl(icon, "#37a961");

  const span = document.createElement("span");
  span.className = "toggle__label";
  span.textContent = label;

  btn.appendChild(img);
  btn.appendChild(span);
  btn.addEventListener("click", () => {
    const current = state.get(category);
    current.enabled = !current.enabled;
    btn.classList.toggle("toggle--on", current.enabled);
    // update icon tint to show on/off
    img.src = buttonIconUrl(icon, current.enabled ? "#37a961" : "#9ca3af");
    clearAllResults();
    setStatus("Updating categories…");
    activeSearchId += 1;
    scheduleSearch();
  });

  buttonsContainer.appendChild(btn);
});

// Helper: Build Geoapify Icon URL
function iconUrl(iconName, colorHex = "#37a961") {
  const color = encodeURIComponent(colorHex);
  const icon = encodeURIComponent(iconName);
  return `https://api.geoapify.com/v2/icon/?type=awesome&color=${color}&size=50&icon=${icon}&contentSize=20&scaleFactor=2&apiKey=${GEOAPIFY_API_KEY}`
}

function buttonIconUrl(iconName, colorHex = "#37a961") {
  const color = encodeURIComponent(colorHex);
  const icon = encodeURIComponent(iconName);
  return `https://api.geoapify.com/v2/icon/?type=circle&color=${color}&size=30&iconType=awesome&icon=${icon}&contentSize=17&&scaleFactor=2&noWhiteCircle&apiKey=${GEOAPIFY_API_KEY}`
}


// Helper: Find icon by categories array from feature
function iconForFeature(categoriesArr) {
  if (!Array.isArray(categoriesArr)) return iconUrl("map-marker");
  // find the first matching configured category
  for (const { category, icon } of CATEGORY_CONFIG) {
    if (categoriesArr.includes(category)) {
      const isOn = state.get(category)?.enabled;
      return iconUrl(icon, isOn ? "#22c55e" : "#9ca3af");
    }
  }
  return iconUrl("map-marker");
}

// Debounced search logic
let pendingTimer = null;

function scheduleSearch() {
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = setTimeout(searchPlaces, SEARCH_DELAY_MS);
}

async function searchPlaces() {
  pendingTimer = null;
  const zoom = map.getZoom();
  if (zoom < MIN_SEARCH_ZOOM) {
    setStatus(`Zoom in to load places (zoom >= ${MIN_SEARCH_ZOOM})`);
    clearAllResults();
    return;
  }

  const enabledCategories = CATEGORY_CONFIG
    .filter(({ category }) => state.get(category)?.enabled)
    .map(({ category }) => category);

  if (enabledCategories.length === 0) {
    setStatus("No categories selected");
    clearAllResults();
    return;
  }

  const bounds = map.getBounds();
  const fragments = getFragments(bounds, zoom);
  if (fragments.length === 0) return;
  const searchId = ++activeSearchId;
  const categoriesParam = encodeURIComponent(enabledCategories.join(","));
  setStatus(`Loading places…`);

  const requestFns = fragments.map((fragment) => {
    const rect = `${fragment.minLng},${fragment.minLat},${fragment.maxLng},${fragment.maxLat}`;
    const url = `https://api.geoapify.com/v2/places?categories=${categoriesParam}&filter=rect:${rect}&limit=200&apiKey=${GEOAPIFY_API_KEY}`;

    return async () => {
      if (activeSearchId !== searchId || map.getZoom() < MIN_SEARCH_ZOOM) {
        return { success: false, skipped: true };
      }
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (activeSearchId !== searchId || map.getZoom() < MIN_SEARCH_ZOOM) {
          return { success: false, skipped: true };
        }
        renderResults(data, searchId);
        return { success: true, count: data.features?.length || 0 };
      } catch (err) {
        console.error("Failed to load fragment", fragment, err);
        return { success: false, error: err };
      }
    };
  });

  const rateLimiterOptions = {
    onProgress: (progress) => {
      if (activeSearchId !== searchId) return;
      console.log(`Progress: ${progress.completedRequests}/${progress.totalRequests} completed`);
    }
  };

  let results;
  try {
    results = await RequestRateLimiter.rateLimitedRequests(requestFns, 5, 1000, rateLimiterOptions);

    console.log(results);
  } catch (err) {
    console.error("Rate-limited requests failed", err);
    if (activeSearchId === searchId) {
      setStatus("Failed to load places");
    }
    return;
  }

  if (activeSearchId !== searchId || map.getZoom() < MIN_SEARCH_ZOOM) {
    return;
  }

  const successCount = Array.isArray(results)
    ? results.filter((res) => res && res.success).length
    : 0;

  if (successCount > 0) {
    setStatus(`${seenPlaceIds.size} places locaded`);
  } else {
    setStatus("Failed to load places");
  }
}

function renderResults(geojson, searchId) {
  if (searchId && activeSearchId !== searchId) return;
  if (map.getZoom() < MIN_SEARCH_ZOOM) return;
  if (!geojson || !Array.isArray(geojson.features)) return;

  geojson.features.forEach((f) => {
    const { geometry, properties } = f;
    if (!geometry || geometry.type !== "Point") return;
    const [lng, lat] = geometry.coordinates;
    const pid = properties?.place_id || `${lng},${lat}:${properties?.name || ""}`;
    if (seenPlaceIds.has(pid)) return;
    const icon = L.icon({
      iconUrl: iconForFeature(properties?.categories),
      iconSize: [38, 55],
      iconAnchor: [18, 50], 
      popupAnchor: [0, -50]
    });

    const name = properties?.name || properties?.address_line1 || "Unnamed place";
    const secondary = properties?.address_line2 || properties?.formatted || "";
    const cats = Array.isArray(properties?.categories) ? properties.categories.join(", ") : "";

    const popupHtml = `
      <div>
        <div style="font-weight:600;">${escapeHtml(name)}</div>
        ${secondary ? `<div style="color:#9ca3af; font-size:0.9em;">${escapeHtml(secondary)}</div>` : ""}
        ${cats ? `<div style="margin-top:4px; color:#9ca3af; font-size:0.85em;">${escapeHtml(cats)}</div>` : ""}
      </div>
    `;

    L.marker([lat, lng], { icon }).bindPopup(popupHtml).addTo(resultsLayer);
    seenPlaceIds.add(pid);
  });
}

function updateZoomInfo() {
  if (!zoomInfoEl) return;
  const zoomValue = map.getZoom();
  const zoomLabel = Number.isInteger(zoomValue) ? zoomValue : zoomValue.toFixed(2);
  zoomInfoEl.textContent = `Zoom: ${zoomLabel}`;
}

function setStatus(text) {
  statusEl.textContent = text || "";
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Trigger search on map move or zoom (debounced)
map.on("moveend", scheduleSearch);
map.on("zoomend", scheduleSearch);
map.on("zoomend", updateZoomInfo);

// Initial status and search
updateZoomInfo();
setStatus("Pan or zoom the map to search");
scheduleSearch();