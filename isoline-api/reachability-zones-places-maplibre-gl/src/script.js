// 👉 Replace with your own API key. Sign up at https://www.geoapify.com/ to get one.
const yourAPIKey = "f82ea38cb77543d59c597faaa263e714";

const initialCenter = [13.405, 52.52]; // Berlin (lng, lat)
const initialZoom = 11;
const ICON_API_BASE = "https://api.geoapify.com/v2/icon/";
const HOLE_SOURCE_ID = "isoline-hole";
const HOLE_LAYER_ID = "isoline-hole-fill";
const ISOLINE_FILL_OPACITY = 0.25;
const HOLE_OVERLAY_COLOR = "rgba(15, 23, 42, 0.35)";
const ISOLINE_POPUP_OFFSET = [0, -16];
const APARTMENT_COUNT = 30;
const APARTMENT_RADIUS_METERS = 15000;
const APARTMENT_MARKER_STYLE = {
  icon: "building",
  color: "#7c3aed",
  iconColor: "#ffffff",
  size: 48
};

const REACHABILITY_OPTIONS = [
  {
    id: "bike-20min",
    label: "20 min from here by bike",
    mode: "bicycle",
    type: "time",
    range: 1200,
    ranges: [600, 900, 1200, 1800],
    color: "#93b1e4ff",
    opacity: 0.15
  },
  {
    id: "car-20min",
    label: "20 min from here by car",
    mode: "drive",
    type: "time",
    range: 1200,
    ranges: [600, 1200, 1800, 2400],
    color: "#497766ff",
    opacity: 0.15
  },
  {
    id: "transit-30min",
    label: "30 min by transit (approx)",
    mode: "approximated_transit",
    type: "time",
    range: 1800,
    ranges: [1200, 1800, 2400],
    color: "#a177adff",
    opacity: 0.15
  }
];

const PLACE_REACHABILITY_OPTIONS = [
  {
    id: "walk-5min",
    label: "5 min walk from here",
    mode: "walk",
    type: "time",
    range: 300,
    ranges: [300, 600, 900, 1200],
    color: "#22c55e"
  },
  {
    id: "walk-10min",
    label: "10 min walk from here",
    mode: "walk",
    type: "time",
    range: 600,
    ranges: [300, 600, 900, 1200],
    color: "#16a34a"
  },
  {
    id: "walk-2km",
    label: "2 km walk from here",
    mode: "walk",
    type: "distance",
    range: 2000,
    ranges: [1000, 2000, 3000, 4000],
    color: "#10b981"
  }
];

const PLACES_QUERY_OPTIONS = [
  {
    id: "supermarkets",
    label: "Find supermarkets",
    categories: ["commercial.supermarket"],
    icon: "cart-shopping",
    color: "#f97316",
    limit: 100
  },
  {
    id: "parks",
    label: "Find parks",
    categories: ["leisure.park"],
    icon: "tree",
    color: "#22c55e",
    limit: 100
  },
  {
    id: "public-transport",
    label: "Find public transport stops",
    categories: ["public_transport.bus", "public_transport.subway.entrance", "public_transport.train", "public_transport.tram"],
    icon: "bus",
    color: "#0ea5e9",
    limit: 100
  }
];

const isolineState = {
  lat: initialCenter[1],
  lon: initialCenter[0],
  mode: REACHABILITY_OPTIONS[0].mode,
  type: REACHABILITY_OPTIONS[0].type,
  range: REACHABILITY_OPTIONS[0].range,
  ranges: REACHABILITY_OPTIONS[0].ranges || null,
  color: REACHABILITY_OPTIONS[0].color,
  opacity: REACHABILITY_OPTIONS[0].opacity
};

// The MapLibre GL map object
const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright-grey/style.json?apiKey=${yourAPIKey}`,
  center: initialCenter,
  zoom: initialZoom
});

map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

// Center marker
const markerEl = document.createElement("div");
markerEl.className = "center-marker";

const centerMarker = new maplibregl.Marker({
  element: markerEl
}).setLngLat(initialCenter);

let markerAdded = false;
const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 12 });
const isolinePopup = new maplibregl.Popup({
  closeButton: true,
  closeOnClick: false,
  offset: 12
});
let isolineIdCounter = 0;
let activeHoleIsolineId = null;
const isolines = new Map();
const placeMarkersByIsolineId = new Map();
const loadingIndicator = document.getElementById("loadingIndicator");
let pendingRequests = 0;
const apartmentMarkers = [];
const infoPanel = document.getElementById("infoPanel");
const infoPanelClose = document.getElementById("infoPanelClose");

if (infoPanelClose) {
  infoPanelClose.addEventListener("click", () => {
    if (infoPanel) infoPanel.style.display = "none";
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  popup.remove();
  isolinePopup.remove();
  if (markerAdded) {
    centerMarker.remove();
    markerAdded = false;
  }
});

map.on("click", (e) => {
  const { lng, lat } = e.lngLat;
  isolineState.lat = lat;
  isolineState.lon = lng;

  isolinePopup.remove();

  if (!markerAdded) {
    centerMarker.setLngLat([lng, lat]).addTo(map);
    markerAdded = true;
  }
  centerMarker.setLngLat([lng, lat]);
  openOptionMenu(e.lngLat);
});

map.once("load", () => {
  initApartments();
});

async function fetchIsoline(lat, lon, type, mode, range, apiKey) {
  const params = new URLSearchParams({
    lat,
    lon,
    type,
    mode,
    range: String(range),
    apiKey
  });
  if (mode === "drive") {
    params.set("traffic", "approximated");
  }

  const response = await fetch(
    `https://api.geoapify.com/v1/isoline?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
  }

  return response.json();
}

function openOptionMenu(lngLat, options = {}) {
  const { title, removeMarker, offset, reachabilityOptions } = options;
  const menu = document.createElement("div");
  menu.className = "popup-menu";

  if (title) {
    const name = document.createElement("div");
    name.className = "popup-place-name";
    name.textContent = title;
    menu.appendChild(name);
  }

  const optionList = reachabilityOptions || REACHABILITY_OPTIONS;
  optionList.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "popup-option";
    button.textContent = option.label;
    button.addEventListener("click", () => {
      applyOption(option, lngLat, removeMarker);
      popup.remove();
    });
    menu.appendChild(button);
  });

  if (offset) {
    popup.setOffset(offset);
  } else {
    popup.setOffset(12);
  }

  popup.setLngLat(lngLat).setDOMContent(menu).addTo(map);
}

function formatRange(type, rangeValue) {
  if (type === "time") {
    return `${Math.round(rangeValue / 60)} min`;
  }
  return `${Math.round(rangeValue / 1000)} km`;
}

function applyOption(option, lngLat, removeMarker) {
  if (removeMarker) {
    removeAnyMarker(removeMarker);
  }
  isolineState.mode =
    option.mode === "drive" ? "drive_traffic_approximated" : option.mode;
  isolineState.type = option.type;
  isolineState.range = option.range;
  isolineState.ranges = option.ranges || null;
  isolineState.color = option.color;
  isolineState.opacity = option.opacity;
  isolineState.lat = lngLat.lat;
  isolineState.lon = lngLat.lng;
  getIsoline();
}

function setIsolineData(data) {
  const isolineId = ++isolineIdCounter;
  const sourceId = `isoline-${isolineId}`;
  const fillId = `isoline-fill-${isolineId}`;
  const lineId = `isoline-line-${isolineId}`;
  const isolineColor = isolineState.color || "#60a5fa";
  const isolineOpacity =
    typeof isolineState.opacity === "number"
      ? isolineState.opacity
      : ISOLINE_FILL_OPACITY;

  map.addSource(sourceId, { type: "geojson", data });

  map.addLayer({
    id: fillId,
    type: "fill",
    source: sourceId,
    paint: {
      "fill-color": isolineColor,
      "fill-opacity": isolineOpacity
    }
  });

  map.addLayer({
    id: lineId,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": isolineColor,
      "line-width": 2
    }
  });

  updateIsolineCenterMarker(
    isolineId,
    data,
    { sourceId, fillId, lineId },
    isolineColor,
    isolineOpacity,
    isolineState.ranges
  );
}

function updateIsolineCenterMarker(
  isolineId,
  isolineData,
  layerIds,
  color,
  opacity,
  ranges
) {
  if (markerAdded) {
    centerMarker.remove();
    markerAdded = false;
  }

  const geometryId = getIsolineGeometryId(isolineData);

  const isolineCenterMarker = createTravelModeMarkerFromCoordinates(
    isolineState.lat,
    isolineState.lon,
    isolineState.mode,
    isolineState.range,
    isolineState.type,
    color || "#60a5fa"
  );

  isolineCenterMarker._isolineId = isolineId;
  isolineCenterMarker._isolineData = isolineData;

  isolineCenterMarker.addTo(map);

  attachIsolineMarkerPopup(isolineCenterMarker);

  isolines.set(isolineId, {
    id: isolineId,
    data: isolineData,
    marker: isolineCenterMarker,
    layerIds,
    meta: {
      mode: isolineState.mode,
      type: isolineState.type,
      range: isolineState.range,
      color,
      opacity,
      ranges,
      geometryId,
      lat: isolineState.lat,
      lon: isolineState.lon
    }
  });
}

function openIsolinePopup(marker) {
  const container = document.createElement("div");
  container.className = "popup-menu";

  const isoline = isolines.get(marker._isolineId);
  const ranges = isoline?.meta?.ranges;

  if (Array.isArray(ranges) && ranges.length) {
    const block = document.createElement("div");
    block.className = "range-block";

    const label = document.createElement("div");
    label.className = "range-title";
    label.textContent = "Change range";
    block.appendChild(label);

    const buttons = document.createElement("div");
    buttons.className = "range-buttons";

    ranges.forEach((rangeValue) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "popup-option range-button";
      button.textContent = formatRange(isoline.meta.type, rangeValue);
      button.addEventListener("click", () => {
        updateIsolineRange(marker._isolineId, rangeValue);
        isolinePopup.remove();
      });
      buttons.appendChild(button);
    });

    block.appendChild(buttons);
    container.appendChild(block);
  }

  const label = document.createElement("label");
  label.className = "hole-toggle";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = activeHoleIsolineId === marker._isolineId;

  const text = document.createElement("span");
  text.textContent = "Invert visualization (hole)";

  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      enableHoleForIsoline(marker._isolineId, marker._isolineData);
    } else if (activeHoleIsolineId === marker._isolineId) {
      disableHole();
    }
  });

  label.appendChild(checkbox);
  label.appendChild(text);
  container.appendChild(label);

  const placesTitle = document.createElement("div");
  placesTitle.className = "popup-section-title";
  placesTitle.textContent = "Query places inside isoline";
  container.appendChild(placesTitle);

  PLACES_QUERY_OPTIONS.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "popup-option";
    button.textContent = option.label;
    button.addEventListener("click", () => {
      queryPlacesForIsoline(marker._isolineId, option);
      isolinePopup.remove();
    });
    container.appendChild(button);
  });

  isolinePopup
    .setOffset(ISOLINE_POPUP_OFFSET)
    .setLngLat(marker.getLngLat())
    .setDOMContent(container)
    .addTo(map);
}

function attachIsolineMarkerPopup(marker) {
  const markerElement = marker.getElement();
  markerElement.addEventListener("click", (event) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    popup.remove();
    openIsolinePopup(marker);
  });
}

async function updateIsolineRange(isolineId, newRange) {
  const isoline = isolines.get(isolineId);
  if (!isoline) return;

  try {
    setLoading(true, "Updating isoline…");
    const data = await fetchIsoline(
      isoline.meta.lat,
      isoline.meta.lon,
      isoline.meta.type,
      isoline.meta.mode,
      newRange,
      yourAPIKey
    );

    const source = map.getSource(isoline.layerIds.sourceId);
    if (source) source.setData(data);

    if (isoline.marker) isoline.marker.remove();

    const updatedMarker = createTravelModeMarkerFromCoordinates(
      isoline.meta.lat,
      isoline.meta.lon,
      isoline.meta.mode,
      newRange,
      isoline.meta.type,
      isoline.meta.color || "#60a5fa"
    );

    updatedMarker._isolineId = isolineId;
    updatedMarker._isolineData = data;
    updatedMarker.addTo(map);
    attachIsolineMarkerPopup(updatedMarker);

    isoline.marker = updatedMarker;
    isoline.data = data;
    isoline.meta.range = newRange;
    isoline.meta.geometryId = getIsolineGeometryId(data);

    if (activeHoleIsolineId === isolineId) {
      const holeData = buildHoleGeoJSON(data);
      if (holeData) setHoleOverlay(isolineId, holeData);
    }

    isolinePopup.setOffset(ISOLINE_POPUP_OFFSET);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}

function enableHoleForIsoline(isolineId, isolineData) {
  const holeData = buildHoleGeoJSON(isolineData);
  if (holeData) {
    if (activeHoleIsolineId && activeHoleIsolineId !== isolineId) {
      setIsolineFillOpacity(activeHoleIsolineId, getIsolineBaseOpacity(activeHoleIsolineId));
    }
    activeHoleIsolineId = isolineId;
    setHoleOverlay(isolineId, holeData);
    setIsolineFillOpacity(isolineId, 0);
  }
}

function disableHole() {
  if (activeHoleIsolineId) {
    setIsolineFillOpacity(activeHoleIsolineId, getIsolineBaseOpacity(activeHoleIsolineId));
  }
  activeHoleIsolineId = null;
  clearHoleOverlay();
}

async function queryPlacesForIsoline(isolineId, placeOption) {
  const isoline = isolines.get(isolineId);
  if (!isoline) return;

  const geometryId = isoline.meta.geometryId;
  if (!geometryId) {
    console.warn("No isoline geometry id available for places query.");
    return;
  }

  clearPlaceMarkers(isolineId, placeOption.id);

  const params = new URLSearchParams({
    categories: (placeOption.categories || []).join(","),
    filter: `geometry:${geometryId}`,
    bias: `proximity:${isoline.meta.lon},${isoline.meta.lat}`,
    limit: String(placeOption.limit ?? 20),
    apiKey: yourAPIKey
  });

  try {
    setLoading(true, "Loading places…");
    const response = await fetch(
      `https://api.geoapify.com/v2/places?${params.toString()}`
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    const markers = [];

    if (data?.features?.length) {
      data.features.forEach((feature) => {
        const coords = feature?.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const [lon, lat] = coords;
        const marker = createPlaceMarkerFromCoordinates(
          lat,
          lon,
          placeOption,
          feature.properties,
          isolineId
        );
        marker.addTo(map);
        markers.push(marker);
      });
    }

    const isolineMarkers = getPlaceMarkersStore(isolineId);
    isolineMarkers.set(placeOption.id, markers);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}

function getPlaceMarkersStore(isolineId) {
  if (!placeMarkersByIsolineId.has(isolineId)) {
    placeMarkersByIsolineId.set(isolineId, new Map());
  }
  return placeMarkersByIsolineId.get(isolineId);
}

function clearPlaceMarkers(isolineId, optionId) {
  const store = placeMarkersByIsolineId.get(isolineId);
  if (!store) return;

  if (optionId) {
    const markers = store.get(optionId);
    if (markers?.length) {
      markers.forEach((marker) => marker.remove());
    }
    store.delete(optionId);
    if (store.size === 0) {
      placeMarkersByIsolineId.delete(isolineId);
    }
    return;
  }

  store.forEach((markers) => {
    markers.forEach((marker) => marker.remove());
  });
  placeMarkersByIsolineId.delete(isolineId);
}

function removePlaceMarker(marker) {
  if (!marker) return;
  marker.remove();
  const isolineId = marker._isolineId;
  if (!isolineId) return;
  const optionId = marker._placeOptionId;
  if (!optionId) return;
  const store = placeMarkersByIsolineId.get(isolineId);
  if (!store) return;
  const markers = store.get(optionId);
  if (!markers?.length) return;
  const nextMarkers = markers.filter((item) => item !== marker);
  if (nextMarkers.length) {
    store.set(optionId, nextMarkers);
  } else {
    store.delete(optionId);
    if (store.size === 0) {
      placeMarkersByIsolineId.delete(isolineId);
    }
  }
}

function removeApartmentMarker(marker) {
  if (!marker) return;
  marker.remove();
  const index = apartmentMarkers.indexOf(marker);
  if (index >= 0) apartmentMarkers.splice(index, 1);
}

function removeAnyMarker(marker) {
  if (!marker) return;
  if (marker._apartmentId) {
    removeApartmentMarker(marker);
  } else {
    removePlaceMarker(marker);
  }
}

function createPlaceMarkerFromCoordinates(lat, lng, option, properties, isolineId) {
  const markerElement = document.createElement("img");
  markerElement.className = "place-marker-icon";
  markerElement.src = generatePlaceMarkerIconUrl(option);
  markerElement.alt = option.label;
  markerElement.loading = "lazy";
  if (properties?.name) markerElement.title = properties.name;

  const marker = new maplibregl.Marker({
    element: markerElement,
    anchor: "bottom"
  }).setLngLat([lng, lat]);

  marker._isolineId = isolineId;
  marker._placeOptionId = option.id;
  marker._placeName = properties?.name || option.label;
  marker._placeProperties = properties || null;
  marker._placeOption = option;

  markerElement.addEventListener("click", (event) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    popup.remove();
    isolinePopup.remove();
    openPlaceInfoPopup({ lng, lat }, marker);
  });

  return marker;
}

function createApartmentMarkerFromCoordinates(lat, lng, name, style) {
  const markerElement = document.createElement("img");
  markerElement.className = "apartment-marker-icon";
  markerElement.src = generatePlaceMarkerIconUrl(style);
  markerElement.alt = "Apartment";
  markerElement.loading = "lazy";
  if (name) markerElement.title = name;

  const marker = new maplibregl.Marker({
    element: markerElement,
    anchor: "bottom"
  }).setLngLat([lng, lat]);

  marker._apartmentId = `${lat},${lng}`;
  marker._placeName = name || "Apartment";

  markerElement.addEventListener("click", (event) => {
    event.stopPropagation();
    event.stopImmediatePropagation();
    popup.remove();
    isolinePopup.remove();
    openOptionMenu(
      { lng, lat },
      {
        title: marker._placeName,
        removeMarker: marker,
        offset: [0, -40],
        reachabilityOptions: PLACE_REACHABILITY_OPTIONS
      }
    );
  });

  return marker;
}

function generatePlaceMarkerIconUrl(option) {
  const icon = option.icon || "map-marker";
  const colorCode = (option.color || "#0f172a").replace("#", "");
  const iconColorCode = (option.iconColor || "#ffffff").replace("#", "");
  const size = option.size || 30;

  return `${ICON_API_BASE}?type=awesome&icon=${icon}&noShadow&iconType=awesome&color=%23${colorCode}&iconColor=%23${iconColorCode}&size=${size}&scaleFactor=2&apiKey=${yourAPIKey}`;
}

function openPlaceInfoPopup(lngLat, marker) {
  const container = document.createElement("div");
  container.className = "popup-menu";

  const name = document.createElement("div");
  name.className = "popup-place-name";
  name.textContent = marker._placeName || "Place";
  container.appendChild(name);

  const props = marker._placeProperties || {};
  const categories =
    Array.isArray(props.categories) && props.categories.length
      ? props.categories
      : marker._placeOption?.categories || [];

  if (categories.length) {
    const categoryBlock = document.createElement("div");
    categoryBlock.className = "place-info-block";
    const label = document.createElement("div");
    label.className = "place-info-label";
    label.textContent = "Categories";
    const value = document.createElement("div");
    value.className = "place-info-value";
    value.textContent = categories.join(", ");
    categoryBlock.appendChild(label);
    categoryBlock.appendChild(value);
    container.appendChild(categoryBlock);
  }

  const infoList = buildPlaceInfoList(props);
  if (infoList) {
    container.appendChild(infoList);
  }

  popup.setOffset([0, -30]);
  popup.setLngLat(lngLat).setDOMContent(container).addTo(map);
}

function buildPlaceInfoList(properties) {
  if (!properties || typeof properties !== "object") return null;

  const excludedKeys = new Set([
    "additional_name",
    "country",
    "country_code"
  ]);

  const entries = Object.entries(properties).filter(([key, value]) => {
    if (value === null || value === undefined || value === "") return false;
    if (excludedKeys.has(key)) return false;
    return true;
  });

  if (!entries.length) return null;

  const list = document.createElement("div");
  list.className = "place-info-list";

  entries.forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "place-info-row";

    const label = document.createElement("div");
    label.className = "place-info-key";
    label.textContent = key.replace(/_/g, " ");

    const val = document.createElement("div");
    val.className = "place-info-value";
    if (Array.isArray(value)) {
      val.textContent = value.join(", ");
    } else if (typeof value === "object") {
      val.textContent = JSON.stringify(value);
    } else {
      val.textContent = String(value);
    }

    row.appendChild(label);
    row.appendChild(val);
    list.appendChild(row);
  });

  return list;
}

function setIsolineFillOpacity(isolineId, opacity) {
  const isoline = isolines.get(isolineId);
  if (isoline && map.getLayer(isoline.layerIds.fillId)) {
    map.setPaintProperty(isoline.layerIds.fillId, "fill-opacity", opacity);
  }
}

function getIsolineBaseOpacity(isolineId) {
  const isoline = isolines.get(isolineId);
  if (isoline?.meta && typeof isoline.meta.opacity === "number") {
    return isoline.meta.opacity;
  }
  return ISOLINE_FILL_OPACITY;
}

function setHoleOverlay(isolineId, geojson) {
  if (!map.getSource(HOLE_SOURCE_ID)) {
    map.addSource(HOLE_SOURCE_ID, { type: "geojson", data: geojson });
  } else {
    map.getSource(HOLE_SOURCE_ID).setData(geojson);
  }

  if (!map.getLayer(HOLE_LAYER_ID)) {
    const isoline = isolines.get(isolineId);
    const beforeId = isoline?.layerIds?.lineId;
    map.addLayer(
      {
        id: HOLE_LAYER_ID,
        type: "fill",
        source: HOLE_SOURCE_ID,
        paint: {
          "fill-color": HOLE_OVERLAY_COLOR,
          "fill-opacity": 1
        }
      },
      beforeId
    );
  }
}

function clearHoleOverlay() {
  if (map.getLayer(HOLE_LAYER_ID)) {
    map.removeLayer(HOLE_LAYER_ID);
  }
  if (map.getSource(HOLE_SOURCE_ID)) {
    map.removeSource(HOLE_SOURCE_ID);
  }
}

function getIsolineGeometryId(data) {
  if (!data) return null;
  if (data.type === "FeatureCollection" && data.features?.length) {
    const props = data.features[0]?.properties;
    return props?.id || props?.geometry_id || null;
  }
  if (data.type === "Feature") {
    return data.properties?.id || data.properties?.geometry_id || null;
  }
  return data.properties?.id || data.properties?.geometry_id || null;
}

function buildHoleGeoJSON(data) {
  const rings = extractOuterRings(data);
  if (!rings.length) return null;

  const worldRing = ensureWinding(
    [
      [-180, -90],
      [-180, 90],
      [180, 90],
      [180, -90],
      [-180, -90]
    ],
    false
  );

  const holes = rings.map((ring) => ensureWinding(ring, true));

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [worldRing, ...holes]
    }
  };
}

function extractOuterRings(data) {
  const rings = [];

  function handleGeometry(geometry) {
    if (!geometry) return;
    if (geometry.type === "Polygon") {
      if (geometry.coordinates?.length) {
        rings.push(geometry.coordinates[0]);
      }
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates?.forEach((polygon) => {
        if (polygon.length) {
          rings.push(polygon[0]);
        }
      });
    }
  }

  if (data.type === "FeatureCollection") {
    data.features.forEach((feature) => handleGeometry(feature.geometry));
  } else if (data.type === "Feature") {
    handleGeometry(data.geometry);
  } else {
    handleGeometry(data);
  }

  return rings;
}

function ensureWinding(ring, clockwise) {
  const closedRing = closeRing(ring);
  const area = signedArea(closedRing);
  const isClockwise = area < 0;

  if (isClockwise === clockwise) {
    return closedRing;
  }

  return closedRing.slice().reverse();
}

function closeRing(ring) {
  if (!ring || ring.length < 3) return ring || [];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring.slice();
  }
  return [...ring, first];
}

function signedArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += x1 * y2 - x2 * y1;
  }
  return sum / 2;
}

function createTravelModeMarkerFromCoordinates(
  lat,
  lng,
  travelMode,
  range,
  rangeType,
  color
) {
  const iconUrl = generateTravelModeIconUrl(travelMode, color);

  let displayValue;
  if (rangeType === "time") {
    displayValue = Math.round(range / 60).toString();
  } else {
    displayValue = (range / 1000).toString();
  }

  const markerElement = document.createElement("div");
  markerElement.className = "travel-mode-marker";
  markerElement.innerHTML = `
      <div class="travel-mode-marker-content">
        <img src="${iconUrl}" class="travel-mode-marker-icon" />
        <div class="travel-mode-marker-value" style="background: ${color}">${displayValue}</div>
      </div>
    `;

  return new maplibregl.Marker({
    element: markerElement,
    anchor: "center"
  }).setLngLat([lng, lat]);
}

function getTravelModeIcon(travelMode) {
  const icons = {
    walk: "walking",
    hike: "person-hiking",
    scooter: "motorcycle",
    motorcycle: "motorcycle",
    drive: "car",
    truck: "truck",
    light_truck: "truck-pickup",
    medium_truck: "truck-moving",
    truck_dangerous_goods: "truck-monster",
    heavy_truck: "truck-ramp-box",
    long_truck: "truck-moving",
    bicycle: "person-biking",
    mountain_bike: "bicycle",
    road_bike: "bicycle",
    bus: "bus",
    drive_shortest: "car-side",
    drive_traffic_approximated: "car-on",
    truck_traffic_approximated: "truck-front",
    transit: "train-subway",
    approximated_transit: "train-tram"
  };

  return icons[travelMode] || "map-marker";
}

function generateTravelModeIconUrl(travelMode, color) {
  const icon = getTravelModeIcon(travelMode);
  const colorCode = color.replace("#", "");

  return `${ICON_API_BASE}?type=circle&color=%23${colorCode}&size=40&icon=${icon}&iconType=awesome&contentSize=20&contentColor=%23${colorCode}&scaleFactor=2&apiKey=${yourAPIKey}`;
}

async function getIsoline() {
  if (!map.isStyleLoaded()) {
    map.once("load", () => getIsoline());
    return;
  }

  try {
    setLoading(true, "Loading isoline…");
    const data = await fetchIsoline(
      isolineState.lat,
      isolineState.lon,
      isolineState.type,
      isolineState.mode,
      isolineState.range,
      yourAPIKey
    );
    setIsolineData(data);
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}

async function initApartments() {
  setLoading(true, "Loading apartments…");
  try {
    const points = generateRandomPoints(
      { lon: initialCenter[0], lat: initialCenter[1] },
      APARTMENT_COUNT,
      APARTMENT_RADIUS_METERS
    );

    const results = await Promise.all(
      points.map(async (point) => {
        const address = await reverseGeocode(point.lat, point.lon);
        return { ...point, address };
      })
    );

    results.forEach(({ lat, lon, address }) => {
      const marker = createApartmentMarkerFromCoordinates(
        lat,
        lon,
        address,
        APARTMENT_MARKER_STYLE
      );
      marker.addTo(map);
      apartmentMarkers.push(marker);
    });
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}

async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    apiKey: yourAPIKey
  });

  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`
  );
  if (!response.ok) return "Apartment";
  const data = await response.json();
  const props = data?.features?.[0]?.properties;
  return (
    props?.formatted ||
    props?.address_line2 ||
    props?.address_line1 ||
    "Apartment"
  );
}

function generateRandomPoints(center, count, radiusMeters) {
  const points = [];
  const latFactor = 1 / 111320;
  const lonFactor = 1 / (111320 * Math.cos((center.lat * Math.PI) / 180));

  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.sqrt(Math.random()) * radiusMeters;
    const dLat = distance * Math.sin(angle) * latFactor;
    const dLon = distance * Math.cos(angle) * lonFactor;
    points.push({
      lat: center.lat + dLat,
      lon: center.lon + dLon
    });
  }

  return points;
}

function setLoading(isLoading, text) {
  if (!loadingIndicator) return;
  if (isLoading) {
    pendingRequests += 1;
    if (text) {
      const label = loadingIndicator.querySelector(".loading-text");
      if (label) label.textContent = text;
    }
    loadingIndicator.classList.add("is-visible");
    loadingIndicator.setAttribute("aria-busy", "true");
  } else {
    pendingRequests = Math.max(0, pendingRequests - 1);
    if (pendingRequests === 0) {
      loadingIndicator.classList.remove("is-visible");
      loadingIndicator.setAttribute("aria-busy", "false");
    }
  }
}