/* global ol, proj4 */

// Demo API key for quickstart only.
// Get your own free key at https://myprojects.geoapify.com/.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";
const geographicWorldExtent = [-180, -90, 180, 90];
const webMercatorGeographicExtent = [
  -180,
  -85.05112878,
  180,
  85.05112878,
];

const projectionOptions = [
  {
    code: "EPSG:3857",
    label: "Web Mercator",
    group: "World projections",
    type: "Conformal",
    description:
      "The standard for interactive web maps. It preserves local angles, but greatly enlarges areas near the poles.",
  },
  {
    code: "EPSG:8857",
    label: "Equal Earth",
    group: "World projections",
    type: "Equal-area",
    description:
      "A modern world projection that preserves relative land area. The UN recently encouraged its use when accurate relative size matters.",
    definition:
      "+proj=eqearth +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs",
    extent: [-17243959.06, -8392927.6, 17243959.06, 8392927.6],
  },
  {
    code: "EPSG:4326",
    label: "WGS 84 / Plate Carrée",
    group: "World projections",
    type: "Geographic",
    description:
      "Longitude and latitude are plotted directly as x and y. It is simple and familiar, but stretches high latitudes.",
  },
  {
    code: "ESRI:54030",
    label: "Robinson",
    group: "World projections",
    type: "Compromise",
    description:
      "A balanced-looking world map that moderates distortion of area, shape, and distance instead of preserving one exactly.",
    definition:
      "+proj=robin +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs",
    extent: [-17005833.33, -8625154.67, 17005833.33, 8625154.67],
  },
  {
    code: "ESRI:54009",
    label: "Mollweide",
    group: "World projections",
    type: "Equal-area",
    description:
      "An elliptical equal-area projection often used for global distributions such as climate, population, and land cover.",
    definition:
      "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +type=crs",
    extent: [-18040095.7, -9020047.85, 18040095.7, 9020047.85],
  },
  {
    code: "CUSTOM:CHINA_ALBERS",
    label: "China — Albers Equal Area",
    group: "Country-specific projections",
    type: "Equal-area",
    description:
      "An Albers Equal Area view centered on China, useful for national-scale thematic maps and area comparisons.",
    definition:
      "+proj=aea +lat_0=0 +lon_0=105 +lat_1=25 +lat_2=47 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs",
    geographicExtent: [73.5, 18, 135.1, 53.6],
  },
  {
    code: "EPSG:4490",
    label: "China — CGCS2000",
    group: "Country-specific projections",
    type: "Geographic",
    description:
      "China's official nationwide geodetic reference system. It displays CGCS2000 longitude and latitude directly in degrees.",
    definition:
      "+proj=longlat +ellps=GRS80 +no_defs +type=crs",
    geographicExtent: [73.5, 18, 135.1, 53.6],
  },
  {
    code: "EPSG:27700",
    label: "United Kingdom — British National Grid",
    group: "Country-specific projections",
    type: "Conformal",
    description:
      "The Ordnance Survey grid used for detailed mapping across Great Britain, based on a Transverse Mercator projection.",
    definition:
      "+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.1502,0.247,0.8421,-20.4894 +units=m +no_defs +type=crs",
    geographicExtent: [-8.82, 49.79, 1.92, 60.94],
  },
  {
    code: "EPSG:9794",
    label: "France — RGF93 v2b / Lambert-93",
    group: "Country-specific projections",
    type: "Conformal",
    description:
      "France's official Lambert Conformal Conic projection for mainland mapping, designed to keep scale distortion low across the country.",
    definition:
      "+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +units=m +no_defs +type=crs",
    geographicExtent: [-9.86, 41.15, 10.38, 51.56],
  },
  {
    code: "EPSG:5070",
    label: "United States — Conus Albers",
    group: "Country-specific projections",
    type: "Equal-area",
    description:
      "An Albers Equal Area projection for analysis and thematic maps of the contiguous United States.",
    definition:
      "+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs",
    geographicExtent: [-124.79, 24.41, -66.91, 49.38],
  },
  {
    code: "EPSG:9473",
    label: "Australia — GDA2020 / Australian Albers",
    group: "Country-specific projections",
    type: "Equal-area",
    description:
      "Australia's GDA2020 Albers projection, suited to continental mapping and measurements where preserving area matters.",
    definition:
      "+proj=aea +lat_0=0 +lon_0=132 +lat_1=-18 +lat_2=-36 +x_0=0 +y_0=0 +ellps=GRS80 +units=m +no_defs +type=crs",
    geographicExtent: [112.85, -43.7, 153.69, -9.86],
  },
];

projectionOptions.forEach((option) => {
  if (option.definition) {
    proj4.defs(option.code, option.definition);
  }
});
ol.proj.proj4.register(proj4);

projectionOptions.forEach((option) => {
  const projection = ol.proj.get(option.code);

  if (option.geographicExtent) {
    projection.setGlobal(false);
    projection.setExtent(
      ol.proj.transformExtent(
        option.geographicExtent,
        "EPSG:4326",
        projection,
        8
      )
    );
    projection.setWorldExtent(option.geographicExtent);
  } else if (option.extent) {
    projection.setGlobal(true);
    projection.setExtent(option.extent);
    projection.setWorldExtent(geographicWorldExtent);
  } else {
    projection.setWorldExtent(geographicWorldExtent);
  }
});

const projectionSelect = document.getElementById("projection-select");
const projectionType = document.getElementById("projection-type");
const projectionCode = document.getElementById("projection-code");
const projectionDescription = document.getElementById(
  "projection-description"
);

const projectionGroups = new Map();

projectionOptions.forEach((option) => {
  let optionGroup = projectionGroups.get(option.group);

  if (!optionGroup) {
    optionGroup = document.createElement("optgroup");
    optionGroup.label = option.group;
    projectionGroups.set(option.group, optionGroup);
    projectionSelect.appendChild(optionGroup);
  }

  const optionElement = document.createElement("option");
  optionElement.value = option.code;
  optionElement.textContent = option.label;
  optionGroup.appendChild(optionElement);
});

const mapTileUrl = `https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}@2x.png?apiKey=${yourAPIKey}`;

// Raster tiles avoid gaps in whole-world vector-tile reprojection.
const mapTileLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: mapTileUrl,
    tilePixelRatio: 2,
    projection: "EPSG:3857",
    maxZoom: 20,
    wrapX: false,
    crossOrigin: "anonymous",
    attributions:
      'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | ' +
      '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap</a> contributors',
  }),
});

const map = new ol.Map({
  target: "map",
  layers: [mapTileLayer],
  controls: ol.control.defaults.defaults({
    attributionOptions: { collapsible: false },
  }),
  view: createView("EPSG:3857", [10, 22], 1.6),
});

map.addControl(
  new ol.control.ScaleLine({
    bar: true,
    steps: 4,
    text: true,
    minWidth: 120,
  })
);

function createView(projectionCodeValue, centerLonLat, zoom) {
  const projection = ol.proj.get(projectionCodeValue);

  return new ol.View({
    projection,
    center: ol.proj.transform(
      centerLonLat,
      "EPSG:4326",
      projection
    ),
    zoom,
    minZoom: -2,
    maxZoom: 9,
    // Let the padded fit zoom out beyond a viewport-filling world.
    // The raster source still disables repeated worlds with wrapX: false.
    multiWorld: projection.isGlobal(),
    extent: projection.isGlobal() ? undefined : projection.getExtent(),
    constrainOnlyCenter: true,
    showFullExtent: true,
  });
}

function getProjectionCenter(option) {
  if (!option.geographicExtent) {
    return null;
  }

  const [minLon, minLat, maxLon, maxLat] = option.geographicExtent;
  return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
}

function fitProjection(option, view) {
  if (!map.getSize()) {
    return;
  }

  const [mapWidth, mapHeight] = map.getSize();
  const isCompact = window.matchMedia("(max-width: 620px)").matches;
  const padding = isCompact
    ? [Math.min(300, mapHeight * 0.45), 24, 36, 24]
    : [40, 40, 40, Math.min(400, mapWidth * 0.4)];
  const projection = view.getProjection();
  const visibleExtent = option.geographicExtent
    ? projection.getExtent()
    : ol.proj.transformExtent(
        webMercatorGeographicExtent,
        "EPSG:4326",
        projection,
        8
      );

  view.fit(visibleExtent, {
    size: map.getSize(),
    padding,
  });
}

function updateProjectionInfo(option) {
  projectionType.textContent = option.type;
  projectionCode.textContent = option.code;
  projectionDescription.textContent = option.description;
}

function getSafeLonLat(center, projection) {
  const transformedCenter = center
    ? ol.proj.transform(center, projection, "EPSG:4326")
    : [10, 22];

  if (!transformedCenter.every(Number.isFinite)) {
    return [10, 22];
  }

  return [
    Math.max(-180, Math.min(180, transformedCenter[0])),
    Math.max(-85, Math.min(85, transformedCenter[1])),
  ];
}

function switchProjection(projectionCodeValue) {
  const selectedOption = projectionOptions.find(
    (option) => option.code === projectionCodeValue
  );
  const oldView = map.getView();
  const oldProjection = oldView.getProjection();
  const centerLonLat =
    getProjectionCenter(selectedOption) ??
    getSafeLonLat(oldView.getCenter(), oldProjection);
  const zoom = selectedOption.geographicExtent
    ? 1
    : (oldView.getZoom() ?? 1.6);
  const newView = createView(projectionCodeValue, centerLonLat, zoom);

  map.setView(newView);
  fitProjection(selectedOption, newView);

  updateProjectionInfo(selectedOption);
}

projectionSelect.addEventListener("change", (event) => {
  switchProjection(event.target.value);
});

updateProjectionInfo(projectionOptions[0]);
fitProjection(projectionOptions[0], map.getView());
