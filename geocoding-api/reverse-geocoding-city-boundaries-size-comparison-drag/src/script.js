"use strict";

/* global maplibregl, turf */

// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";
const statusEl = document.getElementById("status");
const actionButtons = Array.from(document.querySelectorAll("[data-action]"));
const cityGeometryStore = [];
const MAX_MERCATOR_LAT = 85.05112878;
const MOVE_BUTTON_PIXELS_PER_SECOND = 1000;
const MAX_MOVE_FRAME_SECONDS = 0.02;
const STATUS_UPDATE_INTERVAL_MS = 120;

const cityColors = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899"
];

let nextColorIndex = 0;
let nextCityId = 1;
let selectedCityId = null;
let suppressNextClick = false;

const dragState = {
  active: false,
  cityId: null,
  startLngLat: null,
  baseGeometry: null,
  baseCenter: null,
  lastGeometry: null,
  latBounds: null,
  lastStatusTs: 0
};

const buttonMoveState = {
  active: false,
  direction: 0,
  rafId: null,
  lastFrameTs: 0,
  lastStatusTs: 0,
  lastMovedCount: 0
};

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=${yourAPIKey}`,
  center: [13.405, 52.52],
  zoom: 5
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

function setStatus(message, isError = false) {
  const nextColor = isError ? "#9f1239" : "#1f2933";
  if (statusEl.textContent !== message) {
    statusEl.textContent = message;
  }
  if (statusEl.style.color !== nextColor) {
    statusEl.style.color = nextColor;
  }
}

function formatBoundaryCount(count) {
  return `${count} boundar${count === 1 ? "y" : "ies"}`;
}

function getNextCityColor() {
  const color = cityColors[nextColorIndex % cityColors.length];
  nextColorIndex += 1;
  return color;
}

function isPolygonGeometry(geometry) {
  return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon";
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

  return [sumLng / count, sumLat / count];
}

function formatAreaKm2(value) {
  const rounded = value >= 1000 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded.toLocaleString()} km2`;
}

function formatPopulation(value) {
  return Number(value).toLocaleString();
}

function parsePopulationFromDetails(detailsFeature, reverseFeature) {
  const detailsProps = detailsFeature?.properties ?? {};
  const reverseProps = reverseFeature?.properties ?? {};

  const candidates = [
    detailsProps.datasource?.raw?.population,
    detailsProps.population,
    detailsProps.population_total,
    detailsProps.pop,
    detailsProps.datasources?.city?.population,
    reverseProps.population
  ];

  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function getLabelSubtitle(entry) {
  const base = formatAreaKm2(entry.areaKm2);
  if (entry.population) {
    return `${base} · POP ${formatPopulation(entry.population)}`;
  }
  return base;
}

function toBoundaryFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: cityGeometryStore.map((entry) => ({
      type: "Feature",
      id: entry.id,
      geometry: entry.geometry,
      properties: {
        cityId: entry.id,
        name: entry.name,
        color: entry.color
      }
    }))
  };
}

function toLabelFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: cityGeometryStore
      .map((entry) => {
        const center = getGeometryCenter(entry.geometry);
        if (!center) {
          return null;
        }

        return {
          type: "Feature",
          id: `label-${entry.id}`,
          geometry: {
            type: "Point",
            coordinates: center
          },
          properties: {
            cityId: entry.id,
            name: entry.name,
            subtitle: getLabelSubtitle(entry)
          }
        };
      })
      .filter(Boolean)
  };
}

function updateCitySource(options = {}) {
  const { updateLabels = true } = options;

  const boundarySource = map.getSource("city-boundaries");
  if (boundarySource) {
    boundarySource.setData(toBoundaryFeatureCollection());
  }

  if (updateLabels) {
    const labelSource = map.getSource("city-boundaries-labels");
    if (labelSource) {
      labelSource.setData(toLabelFeatureCollection());
    }
  }
}

function setLabelsVisibility(visible) {
  if (!map.getLayer("city-boundaries-labels-layer")) {
    return;
  }

  map.setLayoutProperty(
    "city-boundaries-labels-layer",
    "visibility",
    visible ? "visible" : "none"
  );
}

function adjustMapViewToBoundaries() {
  if (!cityGeometryStore.length) {
    return;
  }

  const collection = toBoundaryFeatureCollection();
  if (!collection.features.length) {
    return;
  }

  const [minLng, minLat, maxLng, maxLat] = turf.bbox(collection);
  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    return;
  }

  let west = minLng;
  let south = minLat;
  let east = maxLng;
  let north = maxLat;

  if (west === east) {
    west -= 0.05;
    east += 0.05;
  }

  if (south === north) {
    south -= 0.03;
    north += 0.03;
  }

  south = Math.max(-MAX_MERCATOR_LAT, south);
  north = Math.min(MAX_MERCATOR_LAT, north);

  map.fitBounds(
    [[west, south], [east, north]],
    {
      padding: { top: 100, right: 40, bottom: 40, left: 40 },
      duration: 700
    }
  );
}

function setupCityLayers() {
  if (!map.getSource("city-boundaries")) {
    map.addSource("city-boundaries", {
      type: "geojson",
      data: toBoundaryFeatureCollection()
    });
  }

  if (!map.getLayer("city-boundaries-fill")) {
    map.addLayer({
      id: "city-boundaries-fill",
      type: "fill",
      source: "city-boundaries",
      paint: {
        "fill-color": ["coalesce", ["get", "color"], "#2563eb"],
        "fill-opacity": 0.35
      }
    });
  }

  if (!map.getLayer("city-boundaries-outline")) {
    map.addLayer({
      id: "city-boundaries-outline",
      type: "line",
      source: "city-boundaries",
      paint: {
        "line-color": ["coalesce", ["get", "color"], "#1d4ed8"],
        "line-width": 2
      }
    });
  }

  if (!map.getSource("city-boundaries-labels")) {
    map.addSource("city-boundaries-labels", {
      type: "geojson",
      data: toLabelFeatureCollection()
    });
  }

  if (!map.getLayer("city-boundaries-labels-layer")) {
    map.addLayer({
      id: "city-boundaries-labels-layer",
      type: "symbol",
      source: "city-boundaries-labels",
      layout: {
        "text-field": [
          "format",
          ["coalesce", ["get", "name"], ""], { "font-scale": 1 },
          "\n", {},
          ["coalesce", ["get", "subtitle"], ""], { "font-scale": 0.78 }
        ],
        "text-size": 14,
        "text-font": ["Noto Sans Bold", "Noto Sans Regular"],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.08,
        "text-anchor": "center",
        "text-offset": [0, 0]
      },
      paint: {
        "text-color": "#0f172a",
        "text-halo-color": "#fef3c7",
        "text-halo-width": 2,
        "text-halo-blur": 0.4
      }
    });
  }

  registerDragHandlers();
  updateCitySource();
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
      coordinates: geometry.coordinates.map((ring) => ring.map(shiftPoint))
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => ring.map(shiftPoint))
      )
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

function getCityById(cityId) {
  return cityGeometryStore.find((entry) => entry.id === cityId) || null;
}

function getSelectedCity() {
  if (selectedCityId !== null) {
    const selected = getCityById(selectedCityId);
    if (selected) {
      return selected;
    }
  }

  if (!cityGeometryStore.length) {
    return null;
  }

  const last = cityGeometryStore[cityGeometryStore.length - 1];
  selectedCityId = last.id;
  return last;
}

function resetDragState() {
  dragState.active = false;
  dragState.cityId = null;
  dragState.startLngLat = null;
  dragState.baseGeometry = null;
  dragState.baseCenter = null;
  dragState.lastGeometry = null;
  dragState.latBounds = null;
  dragState.lastStatusTs = 0;
}

function selectCityFromFeature(event) {
  const feature = event.features?.[0];
  const cityId = Number(feature?.properties?.cityId);
  if (!Number.isFinite(cityId)) {
    return null;
  }

  const city = getCityById(cityId);
  if (!city) {
    return null;
  }

  selectedCityId = city.id;
  return city;
}

function registerDragHandlers() {
  map.off("mousedown", "city-boundaries-fill", onDragStart);
  map.off("mousedown", "city-boundaries-outline", onDragStart);
  map.off("mousedown", "city-boundaries-labels-layer", onDragStart);
  map.off("touchstart", "city-boundaries-fill", onDragStart);
  map.off("touchstart", "city-boundaries-outline", onDragStart);
  map.off("touchstart", "city-boundaries-labels-layer", onDragStart);

  map.on("mousedown", "city-boundaries-fill", onDragStart);
  map.on("mousedown", "city-boundaries-outline", onDragStart);
  map.on("mousedown", "city-boundaries-labels-layer", onDragStart);
  map.on("touchstart", "city-boundaries-fill", onDragStart);
  map.on("touchstart", "city-boundaries-outline", onDragStart);
  map.on("touchstart", "city-boundaries-labels-layer", onDragStart);
}

function moveCityToLatitude(city, targetLat) {
  const center = getGeometryCenter(city.geometry);
  if (!center) {
    return false;
  }

  const currentLat = center[1];
  let deltaLat = targetLat - currentLat;
  const bounds = getLatBounds(city.geometry);

  if (bounds) {
    const minDelta = -MAX_MERCATOR_LAT - bounds.minLat;
    const maxDelta = MAX_MERCATOR_LAT - bounds.maxLat;
    deltaLat = Math.max(minDelta, Math.min(maxDelta, deltaLat));
  }

  city.geometry = normalizeGeometryToMapCenter(shiftGeometry(city.geometry, 0, deltaLat));
  return true;
}

function moveCityByDeltaLatitude(city, deltaLat) {
  let clampedDeltaLat = deltaLat;
  const bounds = getLatBounds(city.geometry);

  if (bounds) {
    const minDelta = -MAX_MERCATOR_LAT - bounds.minLat;
    const maxDelta = MAX_MERCATOR_LAT - bounds.maxLat;
    clampedDeltaLat = Math.max(minDelta, Math.min(maxDelta, deltaLat));
  }

  if (!clampedDeltaLat) {
    return false;
  }

  city.geometry = normalizeGeometryToMapCenter(
    shiftGeometry(city.geometry, 0, clampedDeltaLat)
  );
  return true;
}

function shiftAllBoundariesByDeltaLat(deltaLat) {
  let movedCount = 0;
  cityGeometryStore.forEach((city) => {
    if (moveCityByDeltaLatitude(city, deltaLat)) {
      movedCount += 1;
    }
  });

  return movedCount;
}

function getLatDegreesPerPixelAtCenter() {
  const center = map.getCenter();
  const centerPoint = map.project(center);
  const onePixelDownLatLng = map.unproject([centerPoint.x, centerPoint.y + 1]);
  const degreesPerPixel = Math.abs(onePixelDownLatLng.lat - center.lat);
  return Number.isFinite(degreesPerPixel) && degreesPerPixel > 0
    ? degreesPerPixel
    : 0.0005;
}

function moveMapByDeltaLatitude(deltaLat) {
  if (!Number.isFinite(deltaLat) || deltaLat === 0) {
    return;
  }

  const center = map.getCenter();
  const nextLat = Math.max(
    -MAX_MERCATOR_LAT,
    Math.min(MAX_MERCATOR_LAT, center.lat + deltaLat)
  );

  map.jumpTo({
    center: [center.lng, nextLat]
  });
}

function startButtonMove(direction) {
  if (!cityGeometryStore.length) {
    setStatus("Add at least one city first, then use move north/south.", true);
    return;
  }

  stopButtonMove(false);
  setLabelsVisibility(false);

  buttonMoveState.active = true;
  buttonMoveState.direction = direction;
  buttonMoveState.lastFrameTs = 0;
  buttonMoveState.lastStatusTs = 0;
  buttonMoveState.lastMovedCount = 0;

  const tick = (timestampMs) => {
    if (!buttonMoveState.active) {
      return;
    }

    if (!buttonMoveState.lastFrameTs) {
      buttonMoveState.lastFrameTs = timestampMs;
      buttonMoveState.rafId = window.requestAnimationFrame(tick);
      return;
    }

    const elapsedSeconds = Math.min(
      (timestampMs - buttonMoveState.lastFrameTs) / 1000,
      MAX_MOVE_FRAME_SECONDS
    );
    buttonMoveState.lastFrameTs = timestampMs;

    const deltaLat =
      buttonMoveState.direction *
      getLatDegreesPerPixelAtCenter() *
      MOVE_BUTTON_PIXELS_PER_SECOND *
      elapsedSeconds;

    const movedCount = shiftAllBoundariesByDeltaLat(deltaLat);
    if (!movedCount) {
      stopButtonMove(false);
      setStatus("Reached movement limit at this latitude.", true);
      return;
    }
    buttonMoveState.lastMovedCount = movedCount;

    updateCitySource({ updateLabels: false });
    moveMapByDeltaLatitude(deltaLat);
    if (
      !buttonMoveState.lastStatusTs ||
      timestampMs - buttonMoveState.lastStatusTs >= STATUS_UPDATE_INTERVAL_MS
    ) {
      setStatus(`Moving ${buttonMoveState.direction > 0 ? "north" : "south"}... (${formatBoundaryCount(movedCount)})`);
      buttonMoveState.lastStatusTs = timestampMs;
    }

    buttonMoveState.rafId = window.requestAnimationFrame(tick);
  };

  buttonMoveState.rafId = window.requestAnimationFrame(tick);
}

function stopButtonMove(shouldFitView = true, announceStop = false) {
  if (!buttonMoveState.active) {
    return;
  }

  const directionLabel = buttonMoveState.direction > 0 ? "north" : "south";
  const movedCount = buttonMoveState.lastMovedCount;

  buttonMoveState.active = false;
  buttonMoveState.direction = 0;
  buttonMoveState.lastFrameTs = 0;
  buttonMoveState.lastStatusTs = 0;
  buttonMoveState.lastMovedCount = 0;

  if (buttonMoveState.rafId) {
    window.cancelAnimationFrame(buttonMoveState.rafId);
    buttonMoveState.rafId = null;
  }

  updateCitySource({ updateLabels: true });
  setLabelsVisibility(true);

  if (shouldFitView) {
    adjustMapViewToBoundaries();
  }

  if (announceStop) {
    setStatus(
      `Stopped moving ${directionLabel}. (${formatBoundaryCount(movedCount || cityGeometryStore.length)})`
    );
  }
}

function runAlignBySelectedLabel() {
  if (!cityGeometryStore.length) {
    setStatus("Add at least one city first, then use align.", true);
    return;
  }

  const referenceCity = getSelectedCity();
  if (!referenceCity) {
    setStatus("Select a city label first, then use align.", true);
    return;
  }

  const referenceCenter = getGeometryCenter(referenceCity.geometry);
  if (!referenceCenter) {
    setStatus("Reference city has no valid geometry center.", true);
    return;
  }

  const targetLat = referenceCenter[1];
  let movedCount = 0;
  cityGeometryStore.forEach((city) => {
    if (moveCityToLatitude(city, targetLat)) {
      movedCount += 1;
    }
  });

  if (!movedCount) {
    setStatus("Couldn't align boundaries by the selected label.", true);
    return;
  }

  updateCitySource();
  adjustMapViewToBoundaries();
  setStatus(
    `Aligned ${formatBoundaryCount(movedCount)} to ${referenceCity.name} (${targetLat.toFixed(2)}°).`
  );
}

function runClean() {
  stopButtonMove(false, false);

  if (dragState.active) {
    resetDragState();
    map.dragPan.enable();
    map.getCanvas().style.cursor = "";
  }

  cityGeometryStore.length = 0;
  selectedCityId = null;
  nextColorIndex = 0;
  nextCityId = 1;

  updateCitySource({ updateLabels: true });
  setLabelsVisibility(true);
  setStatus("Cleared all boundaries.");
}

function onDragStart(event) {
  const city = selectCityFromFeature(event);

  if (!city || !event.lngLat) {
    return;
  }

  event.preventDefault();
  suppressNextClick = true;

  dragState.active = true;
  dragState.cityId = city.id;
  dragState.startLngLat = event.lngLat.wrap();
  dragState.baseGeometry = JSON.parse(JSON.stringify(city.geometry));
  dragState.baseCenter = getGeometryCenter(dragState.baseGeometry);
  dragState.lastGeometry = dragState.baseGeometry;
  dragState.latBounds = getLatBounds(dragState.baseGeometry);
  dragState.lastStatusTs = 0;

  map.dragPan.disable();
  map.getCanvas().style.cursor = "grabbing";
  setLabelsVisibility(false);
  setStatus(`Dragging ${city.name}.`);
}

function onDragMove(event) {
  if (!dragState.active || !event.lngLat || !dragState.baseGeometry || !dragState.baseCenter) {
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
    deltaLat = Math.max(minDelta, Math.min(maxDelta, deltaLat));
  }

  dragState.lastGeometry = shiftGeometry(dragState.baseGeometry, deltaLng, deltaLat);

  const city = getCityById(dragState.cityId);
  if (!city) {
    return;
  }

  city.geometry = dragState.lastGeometry;
  updateCitySource({ updateLabels: false });
  const currentTargetLat = dragState.baseCenter[1] + deltaLat;
  const nowTs = performance.now();
  if (!dragState.lastStatusTs || nowTs - dragState.lastStatusTs >= STATUS_UPDATE_INTERVAL_MS) {
    setStatus(`Dragging ${city.name}. Latitude ${currentTargetLat.toFixed(2)}°.`);
    dragState.lastStatusTs = nowTs;
  }
}

function onDragEnd() {
  if (!dragState.active) {
    return;
  }

  const city = getCityById(dragState.cityId);
  if (city && dragState.lastGeometry) {
    city.geometry = normalizeGeometryToMapCenter(dragState.lastGeometry);
    updateCitySource({ updateLabels: true });
    setStatus(`Moved ${city.name}. Boundaries on map: ${formatBoundaryCount(cityGeometryStore.length)}.`);
  }

  resetDragState();

  map.dragPan.enable();
  map.getCanvas().style.cursor = "";
  setLabelsVisibility(true);
}

async function fetchCityByReverseGeocode(lngLat) {
  const params = new URLSearchParams({
    lon: lngLat.lng.toString(),
    lat: lngLat.lat.toString(),
    type: "city",
    format: "geojson",
    apiKey: yourAPIKey
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

async function fetchCityDetails(placeId, lngLat) {
  const params = new URLSearchParams({ apiKey: yourAPIKey });

  if (placeId) {
    params.set("id", placeId);
  } else {
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

async function addCityBoundaryByClick(lngLat) {
  setStatus("Loading city boundary...");

  try {
    const reverseFeature = await fetchCityByReverseGeocode(lngLat);
    if (!reverseFeature) {
      setStatus("No city found at this point.", true);
      return;
    }

    const cityName =
      reverseFeature.properties?.city ||
      reverseFeature.properties?.name ||
      reverseFeature.properties?.formatted ||
      "Selected city";

    const placeId = reverseFeature.properties?.place_id;
    const detailsFeature = await fetchCityDetails(placeId, lngLat);

    if (!isPolygonGeometry(detailsFeature?.geometry)) {
      setStatus(`No polygon boundary available for ${cityName}.`, true);
      return;
    }

    const areaSqMeters = turf.area({
      type: "Feature",
      geometry: detailsFeature.geometry,
      properties: {}
    });
    const population = parsePopulationFromDetails(detailsFeature, reverseFeature);

    const labelName =
      detailsFeature?.properties?.address_line_1 ||
      detailsFeature?.properties?.address_line1 ||
      reverseFeature.properties?.address_line_1 ||
      reverseFeature.properties?.address_line1 ||
      cityName;

    cityGeometryStore.push({
      id: nextCityId,
      name: labelName,
      color: getNextCityColor(),
      geometry: detailsFeature.geometry,
      areaKm2: areaSqMeters / 1e6,
      population
    });
    selectedCityId = nextCityId;
    nextCityId += 1;

    updateCitySource();
    setStatus(
      `Added ${labelName}. Boundaries on map: ${cityGeometryStore.length}.`
    );
  } catch (error) {
    console.error(error);
    setStatus("Failed to load boundary. Try another point.", true);
  }
}

map.on("load", () => {
  setupCityLayers();
  setStatus("Click map to reverse geocode a city boundary, then drag to compare apparent size.");
});

map.on("style.load", () => {
  setupCityLayers();
});

map.on("click", (event) => {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }

  if (dragState.active) {
    return;
  }

  addCityBoundaryByClick(event.lngLat.wrap());
});

map.on("mousemove", onDragMove);
map.on("touchmove", onDragMove);
map.on("mouseup", onDragEnd);
map.on("touchend", onDragEnd);
map.on("touchcancel", onDragEnd);
map.on("mouseleave", onDragEnd);

actionButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    const action = button.dataset.action;
    if (action === "north" || action === "south") {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      startButtonMove(action === "north" ? 1 : -1);
      return;
    }

    if (action === "align") {
      runAlignBySelectedLabel();
      return;
    }

    if (action === "clean") {
      runClean();
    }
  });

  button.addEventListener("pointerup", () => {
    stopButtonMove(false, true);
  });

  button.addEventListener("pointercancel", () => {
    stopButtonMove(false, true);
  });

  button.addEventListener("lostpointercapture", () => {
    stopButtonMove(false, true);
  });
});
