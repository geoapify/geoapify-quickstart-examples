/* global maplibregl */

// Demo key for preview purposes only; create your own Geoapify key for production usage.
const GEOAPIFY_API_KEY = "5402608de7c44a2d95121c407ad2110b";
const MAX_MERCATOR_LAT = 85.05112878;

const styleOptions = [
  { id: "osm-bright-grey", label: "OSM Bright Grey" },
  { id: "osm-carto", label: "OSM Carto" },
  { id: "klokantech-basic", label: "Klokantech Basic" },
  { id: "positron", label: "Positron" },
  { id: "dark-matter", label: "Dark Matter" },
];

const styleSelect = document.getElementById("style-select");
const colorPicker = document.getElementById("color-picker");
const statusEl = document.getElementById("status");
const infoSelection = document.getElementById("info-selection");
const infoGeometry = document.getElementById("info-geometry");
const infoOrigin = document.getElementById("info-origin");
const infoMoved = document.getElementById("info-moved");
const infoZoom = document.getElementById("info-zoom");
const infoStatus = document.getElementById("info-status");

styleOptions.forEach((option, index) => {
  const optionEl = document.createElement("option");
  optionEl.value = option.id;
  optionEl.textContent = option.label;
  if (index === 0) {
    optionEl.selected = true;
  }
  styleSelect.appendChild(optionEl);
});

function buildStyleUrl(styleId) {
  return `https://maps.geoapify.com/v1/styles/${styleId}/style.json?apiKey=${GEOAPIFY_API_KEY}`;
}

const map = new maplibregl.Map({
  container: "map",
  style: buildStyleUrl(styleOptions[0].id),
  center: [12, 28],
  zoom: 2.2,
  attributionControl: true,
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");

let currentFeature = null;
let currentColor = colorPicker.value;
let suppressNextClick = false;
let latestSelectionId = 0;

const dragState = {
  active: false,
  startLngLat: null,
  baseGeometry: null,
  lastGeometry: null,
  countryName: "",
  latBounds: null,
};

function setStatus(message, state = "idle") {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function updateMapInfo() {
  infoZoom.textContent = map.getZoom().toFixed(2);
}

function formatLatLng(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "—";
  }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function getGeometryCenter(geometry) {
  if (!geometry) {
    return null;
  }

  let count = 0;
  let sumLng = 0;
  let sumLat = 0;

  const visit = (coords) => {
    coords.forEach((value) => {
      if (typeof value[0] === "number") {
        sumLng += value[0];
        sumLat += value[1];
        count += 1;
      } else {
        visit(value);
      }
    });
  };

  visit(geometry.coordinates);

  if (!count) {
    return null;
  }

  return { lng: sumLng / count, lat: sumLat / count };
}

function updateMovedInfo(geometry) {
  const center = getGeometryCenter(geometry);
  infoMoved.textContent = center ? formatLatLng(center.lat, center.lng) : "—";
}

function updateSelectionInfo(feature) {
  if (!feature) {
    infoSelection.textContent = "None";
    infoGeometry.textContent = "—";
    infoOrigin.textContent = "—";
    infoMoved.textContent = "—";
    return;
  }

  infoSelection.textContent =
    feature.properties?.name || feature.properties?.country || "Selected country";
  infoGeometry.textContent = feature.geometry?.type || "—";
  infoOrigin.textContent = formatLatLng(
    feature.properties?.lat,
    feature.properties?.lon
  );
  updateMovedInfo(feature.geometry);
}

function updateInfoStatus(message) {
  infoStatus.textContent = message;
}

function updateCountrySource(feature) {
  const source = map.getSource("country-geometry");
  if (!source) {
    return;
  }
  source.setData({
    type: "FeatureCollection",
    features: feature ? [feature] : [],
  });
}

function updatePaintColors() {
  if (map.getLayer("country-fill")) {
    map.setPaintProperty("country-fill", "fill-color", currentColor);
  }
  if (map.getLayer("country-outline")) {
    map.setPaintProperty("country-outline", "line-color", currentColor);
  }
}

function setupCountryLayers() {
  if (!map.getSource("country-geometry")) {
    map.addSource("country-geometry", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });
  }

  if (!map.getLayer("country-fill")) {
    map.addLayer({
      id: "country-fill",
      type: "fill",
      source: "country-geometry",
      paint: {
        "fill-color": currentColor,
        "fill-opacity": 0.35,
      },
    });
  }

  if (!map.getLayer("country-outline")) {
    map.addLayer({
      id: "country-outline",
      type: "line",
      source: "country-geometry",
      paint: {
        "line-color": currentColor,
        "line-width": 2,
      },
    });
  }

  updatePaintColors();
  registerDragHandlers();

  if (currentFeature) {
    updateCountrySource(currentFeature);
  }
}

function registerDragHandlers() {
  map.off("mousedown", "country-fill", onDragStart);
  map.off("mousedown", "country-outline", onDragStart);
  map.off("touchstart", "country-fill", onDragStart);
  map.off("touchstart", "country-outline", onDragStart);

  map.on("mousedown", "country-fill", onDragStart);
  map.on("mousedown", "country-outline", onDragStart);
  map.on("touchstart", "country-fill", onDragStart);
  map.on("touchstart", "country-outline", onDragStart);
}

function getDeltaLngAcrossAntimeridian(startLng, currentLng) {
  let delta = currentLng - startLng;
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  return delta;
}

function shiftGeometry(geometry, deltaLng, deltaLat) {
  // Keep the geometry continuous while dragging; wrapping each vertex causes flips at the antimeridian.
  const shiftPoint = (point) => {
    const [lng, lat, ...rest] = point;
    return [lng + deltaLng, lat + deltaLat, ...rest];
  };

  if (!geometry) {
    return geometry;
  }

  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => ring.map(shiftPoint)),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => ring.map(shiftPoint))
      ),
    };
  }

  return geometry;
}

function getLatBounds(geometry) {
  if (!geometry) {
    return null;
  }

  let minLat = Infinity;
  let maxLat = -Infinity;

  const visit = (coords) => {
    coords.forEach((value) => {
      if (typeof value[0] === "number") {
        const lat = value[1];
        if (typeof lat === "number") {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }
      } else {
        visit(value);
      }
    });
  };

  visit(geometry.coordinates);

  if (!Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
    return null;
  }

  return { minLat, maxLat };
}

function normalizeGeometryToMapCenter(geometry) {
  // After dragging, choose the geometry copy closest to the map center to avoid unbounded longitudes.
  if (!geometry) {
    return geometry;
  }

  const collectLngs = (coords, acc = []) => {
    coords.forEach((value) => {
      if (typeof value[0] === "number") {
        acc.push(value[0]);
      } else {
        collectLngs(value, acc);
      }
    });
    return acc;
  };

  const longitudes = collectLngs(geometry.coordinates, []);
  if (!longitudes.length) {
    return geometry;
  }

  const avgLng = longitudes.reduce((sum, lng) => sum + lng, 0) / longitudes.length;
  const mapCenterLng = map.getCenter().lng;
  const shift = Math.round((mapCenterLng - avgLng) / 360) * 360;

  if (!shift) {
    return geometry;
  }

  return shiftGeometry(geometry, shift, 0);
}

function onDragStart(event) {
  if (!currentFeature || !event.lngLat) {
    return;
  }

  event.preventDefault();
  suppressNextClick = true;

  dragState.active = true;
  dragState.startLngLat = event.lngLat.wrap();
  dragState.baseGeometry = JSON.parse(JSON.stringify(currentFeature.geometry));
  dragState.lastGeometry = dragState.baseGeometry;
  dragState.latBounds = getLatBounds(dragState.baseGeometry);
  dragState.countryName =
    currentFeature.properties?.name ||
    currentFeature.properties?.country ||
    "Selected country";

  map.dragPan.disable();
  map.getCanvas().style.cursor = "grabbing";
  setStatus(`Dragging ${dragState.countryName}. Drop anywhere.`, "loading");
  updateInfoStatus("Dragging");
}

function onDragMove(event) {
  if (!dragState.active || !event.lngLat || !dragState.baseGeometry) {
    return;
  }

  const currentLngLat = event.lngLat.wrap();
  const deltaLng = getDeltaLngAcrossAntimeridian(
    dragState.startLngLat.lng,
    currentLngLat.lng
  );
  const rawDeltaLat = currentLngLat.lat - dragState.startLngLat.lat;
  let deltaLat = rawDeltaLat;
  if (dragState.latBounds) {
    const minDelta = -MAX_MERCATOR_LAT - dragState.latBounds.minLat;
    const maxDelta = MAX_MERCATOR_LAT - dragState.latBounds.maxLat;
    deltaLat = Math.max(minDelta, Math.min(maxDelta, rawDeltaLat));
  }
  const shifted = shiftGeometry(dragState.baseGeometry, deltaLng, deltaLat);

  dragState.lastGeometry = shifted;

  if (currentFeature) {
    const updated = {
      ...currentFeature,
      geometry: shifted,
    };
    updateCountrySource(updated);
    updateMovedInfo(shifted);
  }
}

function onDragEnd() {
  if (!dragState.active) {
    return;
  }

  dragState.active = false;
  map.dragPan.enable();
  map.getCanvas().style.cursor = "";

  if (currentFeature && dragState.lastGeometry) {
    currentFeature = {
      ...currentFeature,
      geometry: normalizeGeometryToMapCenter(dragState.lastGeometry),
    };
    updateMovedInfo(currentFeature.geometry);
  }

  setStatus(
    `${dragState.countryName} moved. Click another country or drag again.`,
    "idle"
  );
  updateInfoStatus("Idle");
}

async function fetchCountryByReverseGeocode(lngLat) {
  const params = new URLSearchParams({
    lon: lngLat.lng.toString(),
    lat: lngLat.lat.toString(),
    type: "country",
    format: "geojson",
    apiKey: GEOAPIFY_API_KEY,
  });

  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed (${response.status}).`);
  }

  const data = await response.json();
  return data.features?.[0] ?? null;
}

async function fetchCountryDetails(placeId, lngLat) {
  const params = new URLSearchParams({ apiKey: GEOAPIFY_API_KEY });

  if (placeId) {
    params.set("id", placeId);
  } else if (lngLat) {
    params.set("lat", lngLat.lat.toString());
    params.set("lon", lngLat.lng.toString());
  }

  const response = await fetch(
    `https://api.geoapify.com/v2/place-details?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Place details failed (${response.status}).`);
  }

  const data = await response.json();
  return data.features?.[0] ?? null;
}

async function selectCountryAt(lngLat) {
  const requestId = ++latestSelectionId;
  setStatus("Looking up country geometry...", "loading");

  try {
    const reverseFeature = await fetchCountryByReverseGeocode(lngLat);
    if (!reverseFeature) {
      setStatus("No country found here. Try a land area.", "error");
      return;
    }

    const countryName =
      reverseFeature.properties?.country ||
      reverseFeature.properties?.name ||
      "Selected country";

    const placeId = reverseFeature.properties?.place_id;
    const detailsFeature = await fetchCountryDetails(placeId, lngLat);
    if (requestId !== latestSelectionId) {
      return;
    }

    if (!detailsFeature?.geometry) {
      setStatus("Country geometry unavailable for this location.", "error");
      return;
    }

    const geometryType = detailsFeature.geometry.type;
    if (!geometryType || !["Polygon", "MultiPolygon"].includes(geometryType)) {
      setStatus("This place has no polygon geometry.", "error");
      return;
    }

    currentFeature = {
      ...detailsFeature,
      properties: {
        ...(detailsFeature.properties ?? {}),
        name: countryName,
      },
    };

    updateCountrySource(currentFeature);
    updateSelectionInfo(currentFeature);
    setStatus(`Selected ${countryName}. Drag it to compare projections.`, "idle");
    updateInfoStatus("Selected");
  } catch (error) {
    console.error(error);
    if (requestId === latestSelectionId) {
      setStatus("Something went wrong. Please try again.", "error");
      updateInfoStatus("Error");
    }
  }
}

styleSelect.addEventListener("change", (event) => {
  const styleId = event.target.value;
  map.setStyle(buildStyleUrl(styleId));
});

colorPicker.addEventListener("input", (event) => {
  currentColor = event.target.value;
  updatePaintColors();
});

map.on("load", () => {
  setupCountryLayers();
  updateMapInfo();
});

map.on("style.load", () => {
  setupCountryLayers();
  updateMapInfo();
});

map.on("move", () => {
  updateMapInfo();
});

map.on("mousemove", onDragMove);
map.on("touchmove", onDragMove);
map.on("mouseup", onDragEnd);
map.on("touchend", onDragEnd);
map.on("touchcancel", onDragEnd);
map.on("mouseleave", onDragEnd);

map.on("click", (event) => {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }

  if (dragState.active) {
    return;
  }

  selectCountryAt(event.lngLat.wrap());
});
