/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const apiKey = "5402608de7c44a2d95121c407ad2110b";
const maxElevationLocationsPerRequest = 1000;
const maxGeometryPointsPerRequest = 1000;
const maxGridPoints = 3000;
const elevationRequestUrl = `https://api.geoapify.com/v1/geodata/elevation?apiKey=${apiKey}`;

const modes = {
  location: "location",
  city: "city",
  mapView: "map-view",
};

const cityGridTargetPoints = 2200;
const cityGridMinCellSideKm = 0.1;
const cityGridCellSideGrowthFactor = 1.4;
const mapViewTargetColumns = 48;
const mapViewTargetRows = 34;
const circleHighZoomStart = 12;
const circleHighZoomGrowthFactor = 0.75;
const maxCircleRadius = 260;
const circleDensityBreakpoints = [
  { minPointsPerSquareKilometer: 20, radius: 8 },
  { minPointsPerSquareKilometer: 8, radius: 12 },
  { minPointsPerSquareKilometer: 3, radius: 18 },
  { minPointsPerSquareKilometer: 1, radius: 26 },
];
const defaultCircleRadius = 36;

const selectors = {
  map: "map",
  myElevationButton: "#my-elevation-button",
  myCityElevationButton: "#my-city-elevation-button",
  mapViewElevationButton: "#map-view-elevation-button",
  elevationInfo: "#elevation-info",
  cityElevationLegend: "#city-elevation-legend",
  legendMin: "#legend-min",
  legendMax: "#legend-max",
};

const state = {
  map: null,
  browserLocation: null,
  ipLocation: null,
  lastClickedLocation: null,
  mode: modes.location,
  activeRequestId: 0,
  hasUserInteractedWithMap: false,
};

function initMap() {
  const map = new maplibregl.Map({
    container: selectors.map,
    style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
    center: [0, 20],
    zoom: 2,
  });

  map.addControl(new maplibregl.NavigationControl());
  map.on("click", handleMapClick);
  map.on("dragstart", () => {
    state.hasUserInteractedWithMap = true;
  });
  map.on("zoomstart", () => {
    state.hasUserInteractedWithMap = true;
  });

  return map;
}

function initModeButtons() {
  document
    .querySelector(selectors.myElevationButton)
    .addEventListener("click", handleMyElevationClick);
  document
    .querySelector(selectors.myCityElevationButton)
    .addEventListener("click", handleMyCityElevationClick);
  document
    .querySelector(selectors.mapViewElevationButton)
    .addEventListener("click", handleMapViewElevationClick);
}

function initCurrentElevationTool() {
  state.map = initMap();
  state.map.on("load", () => {
    initLocationCircleLayer();
    initCityBoundaryLayer();
    initCityElevationLayer();
  });
  centerMapByIpLocation(state.map);
  initModeButtons();
  setMode(state.mode);
}

async function centerMapByIpLocation(map) {
  const ipLocation = await fetchIpLocation();
  const coordinates = getCoordinatesFromIpLocation(ipLocation);

  if (!coordinates) {
    throw new Error("IP Geolocation API returned no coordinates.");
  }

  state.ipLocation = {
    longitude: coordinates[0],
    latitude: coordinates[1],
  };

  if (!state.hasUserInteractedWithMap) {
    map.setCenter(coordinates);
    map.setZoom(12);
  }
}

async function handleMyElevationClick() {
  state.hasUserInteractedWithMap = true;
  const requestId = startRequest();
  setMode(modes.location);
  document.querySelector(selectors.elevationInfo).textContent = "Requesting your current location...";

  const location = await requestCurrentPositionWithIpFallback();

  if (state.activeRequestId !== requestId) {
    return;
  }

  await queryElevationForLocation(location.latitude, location.longitude, requestId);

  if (state.activeRequestId !== requestId) {
    return;
  }

  state.map.flyTo({
    center: [location.longitude, location.latitude],
    zoom: 12,
  });
}

async function handleMyCityElevationClick() {
  state.hasUserInteractedWithMap = true;
  const requestId = startRequest();
  setMode(modes.city);
  document.querySelector(selectors.elevationInfo).textContent = "Requesting city boundary...";

  const location = await getLocationForCityElevation();

  if (state.activeRequestId !== requestId) {
    return;
  }

  await queryCityElevationForLocation(location.latitude, location.longitude, requestId);
}

async function queryCityElevationForLocation(latitude, longitude, requestId) {
  const boundaries = await fetchBoundariesPartOf(latitude, longitude);
  const cityBoundary = await getSmallestPolygonBoundary(boundaries);

  if (state.activeRequestId !== requestId) {
    return;
  }

  renderCityBoundary(cityBoundary);
  await fitMapToFeature(cityBoundary);

  if (state.activeRequestId !== requestId) {
    return;
  }

  document.querySelector(selectors.elevationInfo).textContent = "Creating city elevation grid...";
  const gridPoints = await createGridInsideBoundary(cityBoundary);

  if (state.activeRequestId !== requestId) {
    return;
  }

  document.querySelector(selectors.elevationInfo).textContent = "Requesting city elevation grid...";
  const elevationResult = await fetchElevationForLocations(gridPoints);
  const elevationFeatures = createElevationFeatureCollection(elevationResult);
  const stats = getElevationStats(elevationFeatures);

  if (state.activeRequestId !== requestId) {
    return;
  }

  renderCityElevationLayer(elevationFeatures, stats);
  renderCityElevationStats(stats);
}

function setMode(mode) {
  state.mode = mode;
  document
    .querySelectorAll(".mode-button")
    .forEach((button) => button.classList.remove("mode-button--active"));

  const activeSelectorByMode = {
    [modes.location]: selectors.myElevationButton,
    [modes.city]: selectors.myCityElevationButton,
    [modes.mapView]: selectors.mapViewElevationButton,
  };
  document
    .querySelector(activeSelectorByMode[mode])
    .classList.add("mode-button--active");
}

function handleMapViewElevationClick() {
  state.hasUserInteractedWithMap = true;
  const requestId = startRequest();
  setMode(modes.mapView);
  queryMapViewElevation(requestId);
}

async function handleMapClick(event) {
  state.hasUserInteractedWithMap = true;
  const requestId = startRequest();
  const coordinates = getCoordinatesFromMapClick(event);

  if (state.mode === modes.city) {
    await queryCityElevationForLocation(coordinates.latitude, coordinates.longitude, requestId);
    return;
  }

  if (state.mode === modes.location) {
    await queryElevationForLocation(coordinates.latitude, coordinates.longitude, requestId);
    return;
  }

  document.querySelector(selectors.elevationInfo).textContent =
    "Map view elevation mode is selected. Use the button to refresh the visible area.";
}

async function queryMapViewElevation(requestId) {
  document.querySelector(selectors.elevationInfo).textContent = "Creating map view elevation grid...";
  const gridPoints = createGridInsideMapView();

  if (state.activeRequestId !== requestId) {
    return;
  }

  document.querySelector(selectors.elevationInfo).textContent = "Requesting map view elevation grid...";
  const elevationResult = await fetchElevationForLocations(gridPoints);
  const elevationFeatures = createElevationFeatureCollection(elevationResult);
  const stats = getElevationStats(elevationFeatures);

  if (state.activeRequestId !== requestId) {
    return;
  }

  clearCityBoundary();
  renderCityElevationLayer(elevationFeatures, stats);
  renderCityElevationStats(stats);
}

function getCoordinatesFromMapClick(event) {
  const longitude = event?.lngLat?.lng;
  const latitude = event?.lngLat?.lat;

  if (typeof longitude !== "number" || typeof latitude !== "number") {
    throw new Error("Map click did not include valid coordinates.");
  }

  state.lastClickedLocation = { latitude, longitude };

  return state.lastClickedLocation;
}

function startRequest() {
  state.activeRequestId += 1;
  return state.activeRequestId;
}

async function queryElevationForLocation(latitude, longitude, requestId) {
  validateCoordinates(latitude, longitude);
  document.querySelector(selectors.elevationInfo).textContent = "Requesting elevation data...";
  showLocationCircle(longitude, latitude);

  const elevationResult = await fetchElevationForLocations([{ latitude, longitude }]);

  if (state.activeRequestId !== requestId) {
    return;
  }

  renderElevationResult(elevationResult);
}

async function fetchIpLocation() {
  const response = await fetch(`https://api.geoapify.com/v1/ipinfo?apiKey=${apiKey}`);

  if (!response.ok) {
    throw new Error(`IP Geolocation request failed with status ${response.status}`);
  }

  return response.json();
}

function getCoordinatesFromIpLocation(ipLocation) {
  const longitude =
    ipLocation?.location?.longitude ??
    ipLocation?.location?.lon ??
    ipLocation?.longitude ??
    ipLocation?.lon;
  const latitude =
    ipLocation?.location?.latitude ??
    ipLocation?.location?.lat ??
    ipLocation?.latitude ??
    ipLocation?.lat;

  if (typeof longitude !== "number" || typeof latitude !== "number") {
    return null;
  }

  return [longitude, latitude];
}

function requestCurrentPositionWithIpFallback() {
  if (!("geolocation" in navigator)) {
    document.querySelector(selectors.elevationInfo).textContent =
      "Browser location unavailable. Using IP geolocation...";
    return requestIpLocation();
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        state.browserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        document.querySelector(selectors.elevationInfo).textContent =
          "Browser location unavailable. Using IP geolocation...";
        requestIpLocation().then(resolve, reject);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}

async function requestIpLocation() {
  if (state.ipLocation) {
    return state.ipLocation;
  }

  const ipLocation = await fetchIpLocation();
  const coordinates = getCoordinatesFromIpLocation(ipLocation);

  if (!coordinates) {
    throw new Error("IP Geolocation API returned no coordinates.");
  }

  state.ipLocation = {
    longitude: coordinates[0],
    latitude: coordinates[1],
  };

  return state.ipLocation;
}

async function getLocationForCityElevation() {
  if (state.lastClickedLocation) {
    return state.lastClickedLocation;
  }

  if (state.browserLocation) {
    return state.browserLocation;
  }

  return requestIpLocation();
}

async function fetchBoundariesPartOf(latitude, longitude) {
  const params = new URLSearchParams({
    lon: longitude.toString(),
    lat: latitude.toString(),
    geometry: "geometry_1000",
    apiKey,
  });
  const response = await fetch(`https://api.geoapify.com/v1/boundaries/part-of?${params.toString()}`);

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Boundaries request failed with status ${response.status}. ${responseText}`);
  }

  return response.json();
}

async function getSmallestPolygonBoundary(boundaries) {
  const polygonFeatures = boundaries?.features?.filter((feature) => {
    return feature?.geometry?.type === "Polygon" || feature?.geometry?.type === "MultiPolygon";
  }) ?? [];

  if (!polygonFeatures.length) {
    throw new Error("Boundaries API returned no polygon boundaries.");
  }

  const featuresWithArea = await Promise.all(
    polygonFeatures.map(async (feature) => ({
      feature,
      area: await calculateGeometryArea(feature.geometry),
    })),
  );

  return featuresWithArea.sort((a, b) => a.area - b.area)[0].feature;
}

async function callGeometryOperation(body) {
  const response = await fetch(`https://api.geoapify.com/v1/geometry/operation?apiKey=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Geometry operation failed with status ${response.status}. ${responseText}`);
  }

  return response.json();
}

async function calculateGeometryArea(geometry) {
  const result = await callGeometryOperation({
    operation: "area",
    polygon: geometry,
  });

  if (result?.type !== "number" || typeof result.data !== "number") {
    throw new Error("Geometry area operation returned no numeric result.");
  }

  return result.data;
}

async function fetchElevationForLocations(locations) {
  const chunks = splitIntoChunks(locations, maxElevationLocationsPerRequest);
  const responses = await Promise.all(
    chunks.map((chunk) => fetchElevationForLocationChunk(chunk)),
  );

  return {
    results: responses.flatMap((response) => response.results ?? []),
  };
}

async function fetchElevationForLocationChunk(locations) {
  const response = await fetch(elevationRequestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      format: "json",
      units: "metric",
      locations: locations.map((location) => ({
        lat: location.latitude,
        lon: location.longitude,
      })),
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Elevation request failed with status ${response.status}. ${responseText}`);
  }

  return response.json();
}

function splitIntoChunks(items, chunkSize) {
  const chunks = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

function renderElevationResult(elevationResult) {
  const result = elevationResult?.results?.[0];
  const longitude = result?.location?.lon;
  const latitude = result?.location?.lat;

  if (
    !result ||
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    typeof result.elevation !== "number"
  ) {
    throw new Error("Elevation API returned no usable result.");
  }

  showLocationCircle(longitude, latitude);
  document.querySelector(selectors.cityElevationLegend).hidden = true;

  const elevationInfo = document.querySelector(selectors.elevationInfo);
  elevationInfo.textContent = [
    `Elevation: ${result.elevation} ${result.units}`,
    `Latitude: ${latitude}`,
    `Longitude: ${longitude}`,
  ].join("\n");
}

function showLocationCircle(longitude, latitude) {
  validateCoordinates(latitude, longitude);
  const source = state.map.getSource("selected-location");

  if (!source) {
    return;
  }

  source.setData(getLocationCircleGeoJson(longitude, latitude));
}

function initLocationCircleLayer() {
  state.map.addSource("selected-location", {
    type: "geojson",
    data: getEmptyLocationCircleGeoJson(),
  });

  state.map.addLayer({
    id: "selected-location-circle",
    type: "circle",
    source: "selected-location",
    paint: {
      "circle-radius": 11,
      "circle-color": "#0ea5e9",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3,
    },
  });
}

function initCityBoundaryLayer() {
  state.map.addSource("city-boundary", {
    type: "geojson",
    data: getEmptyLocationCircleGeoJson(),
  });

  state.map.addLayer({
    id: "city-boundary-fill",
    type: "fill",
    source: "city-boundary",
    paint: {
      "fill-color": "#38bdf8",
      "fill-opacity": 0.15,
    },
  });

  state.map.addLayer({
    id: "city-boundary-outline",
    type: "line",
    source: "city-boundary",
    paint: {
      "line-color": "#0369a1",
      "line-width": 2,
    },
  });
}

function initCityElevationLayer() {
  state.map.addSource("city-elevation", {
    type: "geojson",
    data: getEmptyLocationCircleGeoJson(),
  });

  state.map.addLayer({
    id: "city-elevation-points",
    type: "circle",
    source: "city-elevation",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        8, 0,
        20, 0,
      ],
      "circle-blur": 0.85,
      "circle-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        8, 0.38,
        12, 0.46,
        15, 0.58,
      ],
      "circle-stroke-width": 0,
      "circle-color": [
        "interpolate",
        ["linear"],
        ["get", "elevation"],
        0, "#38bdf8",
        500, "#facc15",
        1000, "#dc2626",
      ],
    },
  });

  state.map.moveLayer("city-boundary-outline");
  state.map.moveLayer("selected-location-circle");
}

function renderCityBoundary(boundaryFeature) {
  const source = state.map.getSource("city-boundary");
  source.setData({
    type: "FeatureCollection",
    features: [boundaryFeature],
  });
}

function clearCityBoundary() {
  const source = state.map.getSource("city-boundary");
  source.setData(getEmptyLocationCircleGeoJson());
}

function renderCityElevationLayer(elevationFeatures, stats) {
  state.map.setPaintProperty(
    "city-elevation-points",
    "circle-radius",
    getCityElevationCircleRadiusExpression(elevationFeatures),
  );
  state.map.setPaintProperty(
    "city-elevation-points",
    "circle-color",
    getCityElevationColorExpression(stats),
  );

  const source = state.map.getSource("city-elevation");
  source.setData(elevationFeatures);
}

function getCityElevationCircleRadiusExpression(elevationFeatures) {
  const density = getPointDensityPerSquareKilometer(elevationFeatures);
  const baseRadius = getCircleRadiusForDensity(density);

  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    8, Math.max(2, baseRadius * 0.35),
    10, baseRadius * 0.7,
    12, baseRadius,
    14, getSquaredZoomRadius(baseRadius, 14),
    15, getSquaredZoomRadius(baseRadius, 15),
    16, getSquaredZoomRadius(baseRadius, 16),
    17, getSquaredZoomRadius(baseRadius, 17),
    18, getSquaredZoomRadius(baseRadius, 18),
    19, getSquaredZoomRadius(baseRadius, 19),
    20, getSquaredZoomRadius(baseRadius, 20),
  ];
}

function getSquaredZoomRadius(baseRadius, zoom) {
  const zoomDelta = zoom - circleHighZoomStart;
  const multiplier = 1 + (zoomDelta * circleHighZoomGrowthFactor) ** 2;

  return Math.min(baseRadius * multiplier, maxCircleRadius);
}

function getCircleRadiusForDensity(pointsPerSquareKilometer) {
  const breakpoint = circleDensityBreakpoints.find((item) => {
    return pointsPerSquareKilometer >= item.minPointsPerSquareKilometer;
  });

  return breakpoint?.radius ?? defaultCircleRadius;
}

function getCityElevationColorExpression(stats) {
  if (stats.min === stats.max) {
    return "#facc15";
  }

  return [
    "interpolate",
    ["linear"],
    ["get", "elevation"],
    stats.min, "#38bdf8",
    stats.average, "#facc15",
    stats.max, "#dc2626",
  ];
}

async function fitMapToFeature(feature) {
  const [minLng, minLat, maxLng, maxLat] = await calculateGeometryBbox(feature.geometry);
  state.map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    {
      padding: 48,
      duration: 700,
    },
  );
}

function getLocationCircleGeoJson(longitude, latitude) {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        properties: {},
      },
    ],
  };
}

function getEmptyLocationCircleGeoJson() {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

async function createGridInsideBoundary(boundaryFeature) {
  const bbox = await calculateGeometryBbox(boundaryFeature.geometry);
  const areaKm2 = await calculateGeometryArea(boundaryFeature.geometry) / 1000000;
  let cellSideKm = Math.max(cityGridMinCellSideKm, Math.sqrt(areaKm2 / cityGridTargetPoints));

  let pointFeatures = await createPointGrid(bbox, cellSideKm);

  while (pointFeatures.length > maxGridPoints) {
    cellSideKm *= cityGridCellSideGrowthFactor;
    pointFeatures = await createPointGrid(bbox, cellSideKm);
  }

  const pointsInsideBoundary = await filterPointsWithinBoundary(pointFeatures, boundaryFeature.geometry);

  if (!pointsInsideBoundary.length) {
    throw new Error("Geometry operations returned no grid points inside the city boundary.");
  }

  return pointsInsideBoundary.map((feature) => ({
    longitude: feature.geometry.coordinates[0],
    latitude: feature.geometry.coordinates[1],
  }));
}

function createGridInsideMapView() {
  const bounds = state.map.getBounds();
  const west = bounds.getWest();
  const south = bounds.getSouth();
  const east = bounds.getEast();
  const north = bounds.getNorth();
  const longitudeStep = (east - west) / mapViewTargetColumns;
  const latitudeStep = (north - south) / mapViewTargetRows;
  const points = [];

  for (let row = 0; row <= mapViewTargetRows; row += 1) {
    const latitude = south + latitudeStep * row;

    for (let column = 0; column <= mapViewTargetColumns; column += 1) {
      const longitude = west + longitudeStep * column;
      points.push({ latitude, longitude });
    }
  }

  return points;
}

function getPointDensityPerSquareKilometer(featureCollection) {
  const bbox = bboxFromPointFeatures(featureCollection.features);
  const areaKm2 = getApproximateBboxAreaSquareKilometers(bbox);

  if (!Number.isFinite(areaKm2) || areaKm2 <= 0) {
    return featureCollection.features.length;
  }

  return featureCollection.features.length / areaKm2;
}

function bboxFromPointFeatures(features) {
  const longitudes = features.map((feature) => feature.geometry.coordinates[0]);
  const latitudes = features.map((feature) => feature.geometry.coordinates[1]);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function getApproximateBboxAreaSquareKilometers(bbox) {
  const [west, south, east, north] = bbox;
  const centerLatitude = (south + north) / 2;
  const widthKm = Math.abs(east - west) * 111.32 * Math.cos((centerLatitude * Math.PI) / 180);
  const heightKm = Math.abs(north - south) * 110.57;

  return widthKm * heightKm;
}

async function calculateGeometryBbox(geometry) {
  const result = await callGeometryOperation({
    operation: "bbox",
    geometry,
  });

  if (result?.type !== "geojson" || !result.data) {
    throw new Error("Geometry bbox operation returned no GeoJSON result.");
  }

  return bboxFromPolygonGeometry(result.data);
}

async function createPointGrid(bbox, cellSideKm) {
  const result = await callGeometryOperation({
    operation: "grid",
    bbox,
    type: "point",
    cellSide: cellSideKm,
    params: {
      units: "kilometers",
    },
  });

  if (result?.type !== "geojson" || !result.data) {
    throw new Error("Geometry grid operation returned no GeoJSON result.");
  }

  return getPointFeaturesFromGeoJson(result.data);
}

async function filterPointsWithinBoundary(pointFeatures, geometry) {
  const chunks = splitIntoChunks(pointFeatures, maxGeometryPointsPerRequest);
  const responses = await Promise.all(
    chunks.map((chunk) => filterPointChunkWithinBoundary(chunk, geometry)),
  );

  return responses.flatMap((featureCollection) => getPointFeaturesFromGeoJson(featureCollection));
}

async function filterPointChunkWithinBoundary(pointFeatures, geometry) {
  const result = await callGeometryOperation({
    operation: "pointsWithinPolygon",
    points: pointFeatures.map((feature) => feature.geometry),
    polygon: geometry,
  });

  if (result?.type !== "geojson" || !result.data) {
    throw new Error("Geometry pointsWithinPolygon operation returned no GeoJSON result.");
  }

  return result.data;
}

function bboxFromPolygonGeometry(geometry) {
  const coordinates = getAllPositionsFromGeoJson(geometry);
  const longitudes = coordinates.map((position) => position[0]);
  const latitudes = coordinates.map((position) => position[1]);

  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}

function getAllPositionsFromGeoJson(geoJson) {
  if (geoJson.type === "Feature") {
    return getAllPositionsFromGeometry(geoJson.geometry);
  }

  if (geoJson.type === "FeatureCollection") {
    return geoJson.features.flatMap((feature) => getAllPositionsFromGeoJson(feature));
  }

  return getAllPositionsFromGeometry(geoJson);
}

function getPointFeaturesFromGeoJson(geoJson) {
  if (geoJson.type === "FeatureCollection") {
    return geoJson.features.filter((feature) => feature?.geometry?.type === "Point");
  }

  if (geoJson.type === "Point") {
    return [
      {
        type: "Feature",
        geometry: geoJson,
        properties: {},
      },
    ];
  }

  if (geoJson.type === "MultiPoint") {
    return geoJson.coordinates.map((coordinates) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates,
      },
      properties: {},
    }));
  }

  throw new Error("GeoJSON result does not contain point features.");
}

function getAllPositionsFromGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flat(2);
  }

  throw new Error(`Geometry bbox result is not a polygon. Result type: ${geometry.type}`);
}

function createElevationFeatureCollection(elevationResult) {
  const results = elevationResult?.results ?? [];
  const elevations = results.map((result) => result.elevation);
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);

  if (!results.length || !Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error("Elevation API returned no usable city elevation results.");
  }

  return {
    type: "FeatureCollection",
    features: results.map((result) => {
      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [result.location.lon, result.location.lat],
        },
        properties: {
          elevation: result.elevation,
          units: result.units,
        },
      };
    }),
  };
}

function getElevationStats(elevationFeatures) {
  const elevations = elevationFeatures.features.map((feature) => feature.properties.elevation);
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const average = elevations.reduce((sum, value) => sum + value, 0) / elevations.length;
  const units = elevationFeatures.features[0].properties.units;

  return { min, max, average, units, count: elevations.length };
}

function renderCityElevationStats(stats) {
  const elevationInfo = document.querySelector(selectors.elevationInfo);
  elevationInfo.textContent = [
    `Min: ${stats.min.toFixed(0)} ${stats.units}`,
    `Max: ${stats.max.toFixed(0)} ${stats.units}`,
    `Average: ${stats.average.toFixed(0)} ${stats.units}`,
  ].join("\n");

  renderCityElevationLegend(stats);
}

function renderCityElevationLegend(stats) {
  document.querySelector(selectors.legendMin).textContent = `${stats.min.toFixed(0)} ${stats.units}`;
  document.querySelector(selectors.legendMax).textContent = `${stats.max.toFixed(0)} ${stats.units}`;
  document.querySelector(selectors.cityElevationLegend).hidden = false;
}

function validateCoordinates(latitude, longitude) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("Location coordinates are missing.");
  }
}

initCurrentElevationTool();
