/* global d3, topojson */

const worldDataUrl =
  "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";
// Demo API key for quickstart only.
// Get your own free key at https://myprojects.geoapify.com/.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";
const mercatorCode = "d3.geoMercator";
const sphere = { type: "Sphere" };

function createCassiniProjection() {
  return d3
    .geoEquirectangular()
    .rotate([0, -90, 90])
    .center([90, 0])
    .angle(-90);
}

const projectionOptions = [
  {
    code: "d3.geoMercator",
    label: "Mercator",
    group: "World projections",
    type: "Cylindrical · conformal",
    preserves: "Local angles and shapes",
    bestFor: "Interactive web maps and navigation",
    description:
      "Rhumb lines appear straight, which makes compass navigation convenient. Area expands rapidly toward the poles, so this view is clipped to the Web Mercator latitude limit and is unsuitable for comparing region sizes.",
    referenceUrl: "https://en.wikipedia.org/wiki/Mercator_projection",
    createProjection: () => d3.geoMercator(),
  },
  {
    code: "d3.geoEqualEarth",
    label: "Equal Earth",
    group: "World projections",
    type: "Pseudocylindrical · equal-area",
    preserves: "Relative area",
    bestFor: "Choropleths and thematic world maps",
    description:
      "Equal Earth keeps regions proportional in area while maintaining a balanced, rounded world outline. Shapes are not conformal and become more distorted toward the outer meridians.",
    referenceUrl: "https://en.wikipedia.org/wiki/Equal_Earth_projection",
    createProjection: () => d3.geoEqualEarth(),
  },
  {
    code: "d3.geoNaturalEarth1",
    label: "Natural Earth",
    group: "World projections",
    type: "Pseudocylindrical · compromise",
    preserves: "No property exactly",
    bestFor: "General-purpose reference world maps",
    description:
      "Natural Earth deliberately balances area, shape, and scale instead of preserving one property exactly. Its rounded outline and moderate polar compression produce a familiar-looking reference map.",
    referenceUrl: "https://en.wikipedia.org/wiki/Natural_Earth_projection",
    createProjection: () => d3.geoNaturalEarth1(),
  },
  {
    code: "d3.geoRobinson",
    label: "Robinson",
    group: "World projections",
    type: "Pseudocylindrical · compromise",
    preserves: "No property exactly",
    bestFor: "Visually balanced general world maps",
    description:
      "Robinson uses tabulated curves to make the whole world look visually balanced. Neither area nor local shape is exact, and distortion increases toward the poles and map edges.",
    referenceUrl: "https://en.wikipedia.org/wiki/Robinson_projection",
    createProjection: () => d3.geoRobinson(),
  },
  {
    code: "d3.geoMollweide",
    label: "Mollweide",
    group: "World projections",
    type: "Pseudocylindrical · equal-area",
    preserves: "Relative area",
    bestFor: "Global distributions and density maps",
    description:
      "Mollweide places the world inside a 2:1 ellipse and preserves area exactly. Shapes and angles stretch near the outer meridians, especially at high latitudes.",
    referenceUrl: "https://en.wikipedia.org/wiki/Mollweide_projection",
    createProjection: () => d3.geoMollweide(),
  },
  {
    code: "d3.geoEquirectangular",
    label: "Equirectangular",
    group: "World projections",
    type: "Cylindrical · equidistant",
    preserves: "Distances along meridians and the equator",
    bestFor: "Coordinate grids and simple global datasets",
    description:
      "Plate carrée maps longitude and latitude directly to a rectangular grid, making coordinates easy to read. Area and shape distortion grow strongly toward the poles.",
    referenceUrl: "https://en.wikipedia.org/wiki/Equirectangular_projection",
    createProjection: () => d3.geoEquirectangular(),
  },
  {
    code: "Cassini (transverse equirectangular)",
    label: "Cassini",
    group: "World projections",
    type: "Transverse cylindrical",
    preserves: "Scale along the central meridian",
    bestFor: "Narrow north–south regions",
    description:
      "Cassini is the transverse aspect of Equirectangular and keeps the central meridian at true scale. Distortion grows quickly away from that meridian, so the global view is mainly useful for understanding its geometry.",
    referenceUrl: "https://en.wikipedia.org/wiki/Cassini_projection",
    createProjection: createCassiniProjection,
  },
  {
    code: "d3.geoMiller",
    label: "Miller",
    group: "World projections",
    type: "Cylindrical · compromise",
    preserves: "No property exactly",
    bestFor: "Familiar rectangular reference maps",
    description:
      "Miller modifies Mercator to reduce its extreme polar stretching while retaining a rectangular layout. It is neither conformal nor equal-area, and high-latitude regions remain enlarged.",
    referenceUrl:
      "https://en.wikipedia.org/wiki/Miller_cylindrical_projection",
    createProjection: () => d3.geoMiller(),
  },
  {
    code: "d3.geoCylindricalEqualArea().parallel(30)",
    label: "Behrmann",
    group: "World projections",
    type: "Cylindrical · equal-area",
    preserves: "Relative area",
    bestFor: "Thematic maps emphasizing mid-latitudes",
    description:
      "Behrmann is cylindrical equal-area with true scale along 30° north and south. Area remains correct everywhere, while shapes become increasingly flattened or stretched away from those parallels.",
    referenceUrl: "https://en.wikipedia.org/wiki/Behrmann_projection",
    createProjection: () => d3.geoCylindricalEqualArea().parallel(30),
  },
  {
    code: "d3.geoEckert4",
    label: "Eckert IV",
    group: "World projections",
    type: "Pseudocylindrical · equal-area",
    preserves: "Relative area",
    bestFor: "Thematic and statistical world maps",
    description:
      "Eckert IV preserves area with straight parallels that become more closely spaced toward the poles and curved outer meridians. Its rounded outline distributes shape distortion more evenly than a rectangular equal-area map.",
    referenceUrl: "https://en.wikipedia.org/wiki/Eckert_IV_projection",
    createProjection: () => d3.geoEckert4(),
  },
  {
    code: "d3.geoLoximuthal",
    label: "Loximuthal",
    group: "World projections",
    type: "Pseudocylindrical · loxodromic",
    preserves: "Rhumb lines from the central point",
    bestFor: "Direction and distance from one origin",
    description:
      "Rhumb lines from the chosen central point are straight, correctly oriented, and true to scale. The projection is neither equal-area nor conformal, and distortion grows away from its center.",
    referenceUrl: "https://en.wikipedia.org/wiki/Loximuthal_projection",
    createProjection: () => d3.geoLoximuthal(),
  },
  {
    code: "d3.geoImago().k(0.68)",
    label: "AuthaGraph approximation (Imago)",
    group: "World projections",
    type: "Tetrahedral · polyhedral approximation",
    preserves: "No property exactly in this approximation",
    bestFor: "Experimental whole-world layouts",
    description:
      "This uses D3's Imago projection with k = 0.68, documented as the closest available AuthaGraph approximation. It unfolds a tetrahedral treatment of the globe and should not be presented as the exact AuthaGraph implementation.",
    referenceUrl: "https://en.wikipedia.org/wiki/AuthaGraph_projection",
    createProjection: () => d3.geoImago().k(0.68),
  },
];

const svg = d3.select("#map");
const rasterGroup = svg.append("g").attr("class", "raster-tile-map");
const mapGroup = svg.append("g");
const projectionSelect = document.getElementById("projection-select");
const projectionType = document.getElementById("projection-type");
const projectionPreserves = document.getElementById("projection-preserves");
const projectionBestFor = document.getElementById("projection-best-for");
const projectionCode = document.getElementById("projection-code");
const projectionDescription = document.getElementById(
  "projection-description"
);
const projectionReference = document.getElementById("projection-reference");
const status = document.getElementById("status");
const panel = document.querySelector(".projection-panel");
const tileAttribution = document.getElementById("tile-attribution");
const mapHint = document.querySelector(".map-hint");
const projectionGroups = new Map();

let countries;
let activeOption;
let mercatorView;

const rasterTileLayout = d3.tile().tileSize(256);

const zoom = d3
  .zoom()
  .scaleExtent([1, 12])
  .on("zoom", (event) => {
    mapGroup.attr("transform", event.transform);
    updateMercatorRasterTiles(event.transform);
  });

svg.call(zoom);

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

function getProjectionPadding(width, height) {
  const panelRect = panel.getBoundingClientRect();
  const isCompact = window.matchMedia("(max-width: 620px)").matches;

  if (isCompact) {
    return {
      top: panelRect.bottom + 16,
      right: 24,
      bottom: 32,
      left: 24,
    };
  }

  return {
    top: 40,
    right: 40,
    bottom: 40,
    left: Math.min(panelRect.width + 40, width * 0.42),
  };
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("status--error", isError);
  status.hidden = false;
}

function hideStatus() {
  status.hidden = true;
  status.classList.remove("status--error");
}

function getMercatorTileUrl(tile) {
  const [tileX, tileY, tileZoom] = tile;

  return (
    "https://maps.geoapify.com/v1/tile/osm-bright/" +
    `${tileZoom}/${tileX}/${tileY}@2x.png?apiKey=${yourAPIKey}`
  );
}

function updateMercatorRasterTiles(transform) {
  if (activeOption?.code !== mercatorCode || !mercatorView) {
    rasterGroup.selectAll("*").remove();
    return;
  }

  const tiles = rasterTileLayout
    .size([mercatorView.width, mercatorView.height])
    .scale(mercatorView.worldSize * transform.k)
    .translate([
      transform.applyX(mercatorView.worldCenterX),
      transform.applyY(mercatorView.worldCenterY),
    ])();

  rasterGroup
    .selectAll("image.mercator-raster-tile")
    .data(tiles, (tile) => tile.join("/"))
    .join("image")
    .attr("class", "mercator-raster-tile")
    .attr("href", getMercatorTileUrl)
    .attr("crossorigin", "anonymous")
    .attr("x", (tile) => (tile[0] + tiles.translate[0]) * tiles.scale)
    .attr("y", (tile) => (tile[1] + tiles.translate[1]) * tiles.scale)
    .attr("width", tiles.scale + 0.5)
    .attr("height", tiles.scale + 0.5)
    .attr("preserveAspectRatio", "none")
    .on("error", () => {
      if (projectionSelect.value === mercatorCode) {
        setStatus("Could not load the Geoapify raster tiles.", true);
      }
    });
}

function fitProjection(option, projection, width, height, padding) {
  if (option.code !== mercatorCode) {
    projection.fitExtent(
      [
        [padding.left, padding.top],
        [width - padding.right, height - padding.bottom],
      ],
      sphere
    );
    return null;
  }

  const availableWidth = width - padding.left - padding.right;
  const availableHeight = height - padding.top - padding.bottom;
  const worldSize = Math.min(availableWidth, availableHeight);
  const worldLeft = padding.left + (availableWidth - worldSize) / 2;
  const worldTop = padding.top + (availableHeight - worldSize) / 2;

  projection
    .scale(worldSize / (2 * Math.PI))
    .translate([worldLeft + worldSize / 2, worldTop + worldSize / 2])
    .clipExtent([
      [worldLeft, worldTop],
      [worldLeft + worldSize, worldTop + worldSize],
    ]);

  return {
    width,
    height,
    worldSize,
    worldCenterX: worldLeft + worldSize / 2,
    worldCenterY: worldTop + worldSize / 2,
  };
}

function updateProjectionInfo(option) {
  projectionType.textContent = option.type;
  projectionPreserves.textContent = option.preserves;
  projectionBestFor.textContent = option.bestFor;
  projectionCode.textContent = option.code;
  projectionDescription.textContent = option.description;
  projectionReference.href = option.referenceUrl;
}

function renderProjection(option) {
  if (!countries) {
    return;
  }

  // Measure the panel after its content and loading status have changed.
  updateProjectionInfo(option);
  hideStatus();
  const mapElement = document.getElementById("map");
  const { width, height } = mapElement.getBoundingClientRect();
  const padding = getProjectionPadding(width, height);
  const projection = option.createProjection();

  activeOption = option;
  mercatorView = fitProjection(option, projection, width, height, padding);

  const path = d3.geoPath(projection);
  const graticule = d3.geoGraticule10();

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  mapGroup.selectAll("*").remove();
  const showTileAttribution = option.code === mercatorCode;
  tileAttribution.hidden = !showTileAttribution;
  mapHint.classList.toggle(
    "map-hint--with-attribution",
    showTileAttribution
  );

  if (option.code !== mercatorCode) {
    mapGroup
      .append("path")
      .datum(sphere)
      .attr("class", "sphere")
      .attr("d", path);
  }

  mapGroup
    .append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);

  mapGroup
    .selectAll("path.country")
    .data(countries.features)
    .join("path")
    .attr("class", () =>
      option.code === mercatorCode ? "country country--outline" : "country"
    )
    .attr("d", path);

  svg.call(zoom.transform, d3.zoomIdentity);
}

projectionSelect.addEventListener("change", (event) => {
  const selectedOption = projectionOptions.find(
    (option) => option.code === event.target.value
  );
  renderProjection(selectedOption);
});

new ResizeObserver(() => {
  const selectedOption = projectionOptions.find(
    (option) => option.code === projectionSelect.value
  );

  if (selectedOption) {
    renderProjection(selectedOption);
  }
}).observe(document.querySelector(".map-shell"));

fetch(worldDataUrl)
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Country data request failed with ${response.status}`);
    }

    return response.json();
  })
  .then((worldTopology) => {
    countries = topojson.feature(
      worldTopology,
      worldTopology.objects.countries
    );
    projectionSelect.disabled = false;
    renderProjection(projectionOptions[0]);
  })
  .catch((error) => {
    status.textContent = `Could not load country boundaries: ${error.message}`;
    status.classList.add("status--error");
  });

updateProjectionInfo(projectionOptions[0]);
