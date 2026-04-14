/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";
const returnedMarkerIconUrl =
  `https://api.geoapify.com/v2/icon/?type=material&color=%23ff0066&size=52&contentColor=%238004ff&noShadow&noWhiteCircle&scaleFactor=2&apiKey=${yourAPIKey}`;
const requestUrlElement = document.getElementById("request-url");
const clickedCoordsElement = document.getElementById("clicked-coords");
const returnedCoordsElement = document.getElementById("returned-coords");
const returnedAddressElement = document.getElementById("returned-address");
const returnedDistanceElement = document.getElementById("distance-returned");
const actualDistanceElement = document.getElementById("distance-actual");
const responseJsonElement = document.getElementById("response-json");
const GREAT_CIRCLE_SOURCE_ID = "great-circle-source";
const GREAT_CIRCLE_LINE_LAYER_ID = "great-circle-line";
const SMALL_DISTANCE_THRESHOLD_METERS = 1000;
const DIRECT_LINE_COLOR = "#2563eb";
const GREAT_CIRCLE_LINE_COLOR = "#db2777";
const EMPTY_FEATURE_COLLECTION = {
  type: "FeatureCollection",
  features: [],
};

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${yourAPIKey}`,
  center: [-73.985428, 40.748817],
  zoom: 16,
});

map.addControl(new maplibregl.NavigationControl(), "top-left");
map.on("load", ensureGreatCircleLayers);

let clickedMarker = null;
let returnedMarker = null;

map.on("click", async (event) => {
  const lngLat = event?.lngLat;

  if (
    !lngLat ||
    typeof lngLat.lng !== "number" ||
    typeof lngLat.lat !== "number"
  ) {
    return;
  }

  const clickedLonRaw = lngLat.lng;
  const clickedLatRaw = lngLat.lat;
  const clickedLon = normalizeLongitude(clickedLonRaw);
  const clickedLat = clampLatitude(clickedLatRaw);
  const requestUrl = buildReverseGeocodeUrl(clickedLat, clickedLon);
  const displayRequestUrl = toDisplayRequestUrl(requestUrl);

  setPanelLoading(displayRequestUrl, clickedLat, clickedLon);
  renderClickedMarker(clickedLonRaw, clickedLatRaw);

  try {
    const data = await reverseGeocode(requestUrl);
    const result = data?.results?.[0];

    if (!result) {
      throw new Error("No reverse geocoding result found.");
    }

    const returnedLonRaw = typeof result.lon === "number"
      ? normalizeLongitude(result.lon)
      : clickedLon;
    const returnedLat = typeof result.lat === "number"
      ? clampLatitude(result.lat)
      : clickedLat;
    const returnedLon = alignLongitudeToReference(returnedLonRaw, clickedLonRaw);

    const reverseDistanceMeters =
      typeof result.distance === "number" ? result.distance : null;

    let geometryDistanceMeters = null;
    let geometryResponse = null;
    let geometryError = null;
    try {
      geometryResponse = await calculateGeometryDistanceMeters(
        clickedLon,
        clickedLat,
        returnedLonRaw,
        returnedLat,
      );
      geometryDistanceMeters =
        extractDistanceMetersFromGeometryResponse(geometryResponse);
    } catch (error) {
      geometryError = error instanceof Error ? error.message : "Distance calculation failed";
    }

    let geometryPathMode = "great_circle";
    let greatCircleResponse = null;
    let greatCircleError = null;
    const useDirectLine =
      typeof geometryDistanceMeters === "number" &&
      geometryDistanceMeters < SMALL_DISTANCE_THRESHOLD_METERS;

    if (useDirectLine) {
      geometryPathMode = "line";
      greatCircleResponse = {
        skipped: true,
        reason: `Distance is below ${SMALL_DISTANCE_THRESHOLD_METERS} m, direct line is used.`,
      };
      drawGreatCircle(
        buildDirectLineFeatureCollection(clickedLonRaw, clickedLatRaw, returnedLon, returnedLat),
        "line",
      );
    } else {
      try {
        greatCircleResponse = await calculateGreatCircleGeoJson(
          clickedLon,
          clickedLat,
          returnedLonRaw,
          returnedLat,
        );
        const greatCircleFeatureCollection =
          extractGeoJsonFeatureCollectionFromGeometryResponse(greatCircleResponse);
        drawGreatCircle(greatCircleFeatureCollection, "great_circle");
      } catch (error) {
        greatCircleError =
          error instanceof Error ? error.message : "Great-circle calculation failed";
        clearGreatCircle();
      }
    }

    renderReturnedMarker(returnedLon, returnedLat);
    setPanelSuccess(
      displayRequestUrl,
      clickedLat,
      clickedLon,
      returnedLat,
      returnedLon,
      result,
      data,
      reverseDistanceMeters,
      geometryDistanceMeters,
      geometryResponse,
      geometryError,
      geometryPathMode,
      greatCircleResponse,
      greatCircleError,
    );
    ensureReturnedPositionVisible(returnedLon, returnedLat, clickedLonRaw, clickedLatRaw);
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    const message =
      error instanceof Error ? error.message : "Unknown reverse geocoding error";
    renderReturnedMarker(clickedLonRaw, clickedLatRaw);
    clearGreatCircle();
    setPanelError(displayRequestUrl, clickedLat, clickedLon, message);
  }
});

function buildReverseGeocodeUrl(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "json",
    apiKey: yourAPIKey,
  });

  return `https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`;
}

function toDisplayRequestUrl(url) {
  return url.replace(`apiKey=${yourAPIKey}`, "apiKey=YOUR_API_KEY");
}

async function reverseGeocode(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed with status ${response.status}. ${errorBody}`);
  }

  return response.json();
}

async function callGeometryOperation(body) {
  const geometryOperationUrl =
    `https://api.geoapify.com/v1/geometry/operation?apiKey=${yourAPIKey}`;
  const response = await fetch(geometryOperationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Geometry API failed with status ${response.status}. ${errorBody}`);
  }

  return response.json();
}

async function calculateGeometryDistanceMeters(lon1, lat1, lon2, lat2) {
  const body = {
    operation: "distance",
    point1: {
      type: "Point",
      coordinates: [lon1, lat1],
    },
    point2: {
      type: "Point",
      coordinates: [lon2, lat2],
    },
    params: {
      units: "meters",
    },
  };

  return callGeometryOperation(body);
}

async function calculateGreatCircleGeoJson(lon1, lat1, lon2, lat2) {
  const body = {
    operation: "greatCircle",
    point1: {
      type: "Point",
      coordinates: [lon1, lat1],
    },
    point2: {
      coordinates: [lon2, lat2],
      type: "Point",
    },
    params: {
      npoints: 100,
    },
  };

  return callGeometryOperation(body);
}

function extractDistanceMetersFromGeometryResponse(data) {
  if (data?.type === "number" && typeof data?.data === "number") {
    return data.data;
  }

  throw new Error("Distance value was not found in Geometry API response.");
}

function extractGeoJsonFeatureCollectionFromGeometryResponse(data) {
  if (data?.type !== "geojson" || !data?.data) {
    throw new Error("Great-circle response does not contain GeoJSON data.");
  }

  const geoJson = data.data;

  if (geoJson.type === "FeatureCollection") {
    return geoJson;
  }

  if (geoJson.type === "Feature") {
    return {
      type: "FeatureCollection",
      features: [geoJson],
    };
  }

  if (typeof geoJson.type === "string") {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: geoJson,
        },
      ],
    };
  }

  throw new Error("GeoJSON data format is not supported.");
}

function buildDirectLineFeatureCollection(lon1, lat1, lon2, lat2) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [lon1, lat1],
            [lon2, lat2],
          ],
        },
      },
    ],
  };
}

function ensureGreatCircleLayers() {
  if (map.getSource(GREAT_CIRCLE_SOURCE_ID)) {
    return true;
  }

  if (!map.isStyleLoaded()) {
    return false;
  }

  map.addSource(GREAT_CIRCLE_SOURCE_ID, {
    type: "geojson",
    data: EMPTY_FEATURE_COLLECTION,
  });

  map.addLayer({
    id: GREAT_CIRCLE_LINE_LAYER_ID,
    type: "line",
    source: GREAT_CIRCLE_SOURCE_ID,
    paint: {
      "line-color": GREAT_CIRCLE_LINE_COLOR,
      "line-width": 3,
      "line-opacity": 0.95,
    },
  });

  return true;
}

function drawGreatCircle(featureCollection, pathMode = "great_circle") {
  if (!ensureGreatCircleLayers()) {
    return;
  }

  map.setPaintProperty(
    GREAT_CIRCLE_LINE_LAYER_ID,
    "line-color",
    pathMode === "line" ? DIRECT_LINE_COLOR : GREAT_CIRCLE_LINE_COLOR,
  );

  const source = map.getSource(GREAT_CIRCLE_SOURCE_ID);
  if (source) {
    source.setData(featureCollection);
  }
}

function clearGreatCircle() {
  if (!ensureGreatCircleLayers()) {
    return;
  }

  const source = map.getSource(GREAT_CIRCLE_SOURCE_ID);
  if (source) {
    source.setData(EMPTY_FEATURE_COLLECTION);
  }
}

function renderClickedMarker(lon, lat) {
  if (!clickedMarker) {
    clickedMarker = new maplibregl.Marker({
      element: createOriginalLocationCircleElement(),
      anchor: "center",
    })
      .setLngLat([lon, lat])
      .addTo(map);
  } else {
    clickedMarker.setLngLat([lon, lat]);
  }
}

function renderReturnedMarker(lon, lat) {
  if (!returnedMarker) {
    returnedMarker = new maplibregl.Marker({
      element: createReturnedMarkerElement(),
      anchor: "bottom"
    })
      .setLngLat([lon, lat])
      .addTo(map);
  } else {
    returnedMarker.setLngLat([lon, lat]);
  }
}

function createReturnedMarkerElement() {
  const img = document.createElement("img");
  img.src = returnedMarkerIconUrl;
  img.alt = "Returned location marker";
  img.width = 37;
  img.height = 52;
  return img;
}

function createOriginalLocationCircleElement() {
  const circle = document.createElement("div");
  circle.style.width = "12px";
  circle.style.height = "12px";
  circle.style.borderRadius = "9999px";
  circle.style.backgroundColor = "#4f46e5";
  circle.style.border = "2px solid #ffffff";
  circle.style.boxShadow = "0 0 0 2px rgba(79, 70, 229, 0.35)";
  circle.style.pointerEvents = "none";
  circle.style.boxSizing = "border-box";

  return circle;
}

function alignLongitudeToReference(lon, referenceLon) {
  let aligned = lon;

  while (aligned - referenceLon > 180) {
    aligned -= 360;
  }

  while (aligned - referenceLon < -180) {
    aligned += 360;
  }

  return aligned;
}

function normalizeLongitude(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function clampLatitude(lat) {
  return Math.max(-90, Math.min(90, lat));
}

function ensureReturnedPositionVisible(returnedLon, returnedLat, clickedLon, clickedLat) {
  if (isPointVisibleOnMap(returnedLon, returnedLat, 50)) {
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  bounds.extend([clickedLon, clickedLat]);
  bounds.extend([returnedLon, returnedLat]);
  map.fitBounds(bounds, {
    padding: 70,
    duration: 600,
    maxZoom: 16,
  });
}

function isPointVisibleOnMap(lon, lat, padding = 0) {
  const point = map.project([lon, lat]);
  const canvas = map.getCanvas();
  return (
    point.x >= padding &&
    point.y >= padding &&
    point.x <= canvas.clientWidth - padding &&
    point.y <= canvas.clientHeight - padding
  );
}

function setPanelLoading(requestUrl, clickedLat, clickedLon) {
  requestUrlElement.textContent = requestUrl;
  clickedCoordsElement.textContent = formatCoordinates(clickedLat, clickedLon);
  returnedCoordsElement.textContent = "Loading...";
  returnedAddressElement.textContent = "Loading...";
  returnedDistanceElement.textContent = "Loading...";
  actualDistanceElement.textContent = "Loading...";
  responseJsonElement.textContent = "Loading...";
}

function setPanelSuccess(
  requestUrl,
  clickedLat,
  clickedLon,
  returnedLat,
  returnedLon,
  result,
  data,
  reverseDistanceMeters,
  geometryDistanceMeters,
  geometryResponse,
  geometryError,
  geometryPathMode,
  greatCircleResponse,
  greatCircleError,
) {
  const formattedAddress = result.formatted || "-";
  const reverseDistanceText =
    typeof reverseDistanceMeters === "number"
      ? `${reverseDistanceMeters.toFixed(2)} m`
      : "-";
  const geometryDistanceText =
    typeof geometryDistanceMeters === "number"
      ? `${geometryDistanceMeters.toFixed(2)} m`
      : geometryError
        ? `Error: ${geometryError}`
        : "-";

  requestUrlElement.textContent = requestUrl;
  clickedCoordsElement.textContent = formatCoordinates(clickedLat, clickedLon);
  returnedCoordsElement.textContent = formatCoordinates(returnedLat, returnedLon);
  returnedAddressElement.textContent = formattedAddress;
  returnedDistanceElement.textContent = reverseDistanceText;
  actualDistanceElement.textContent = geometryDistanceText;
  responseJsonElement.textContent = JSON.stringify(
    {
      reverse_geocoding: data,
      geometry_distance_operation: geometryResponse || { error: geometryError || "No data" },
      geometry_path_mode: geometryPathMode,
      geometry_great_circle_operation: greatCircleResponse || { error: greatCircleError || "No data" },
    },
    null,
    2,
  );
}

function setPanelError(requestUrl, clickedLat, clickedLon, message) {
  requestUrlElement.textContent = requestUrl;
  clickedCoordsElement.textContent = formatCoordinates(clickedLat, clickedLon);
  returnedCoordsElement.textContent = "-";
  returnedAddressElement.textContent = "No address returned";
  returnedDistanceElement.textContent = "-";
  actualDistanceElement.textContent = "-";
  responseJsonElement.textContent = JSON.stringify({ error: message }, null, 2);
}

function formatCoordinates(lat, lon) {
  return `lat: ${lat.toFixed(6)}\nlon: ${lon.toFixed(6)}`;
}
