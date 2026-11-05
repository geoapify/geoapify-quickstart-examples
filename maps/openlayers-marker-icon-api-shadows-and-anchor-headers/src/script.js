// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const MARKER_ICON_API = "https://api.geoapify.com/v2/icon";

const places = [
  { title: "Art Institute of Chicago", icon: "landmark", color: "#6a1b9a", lat: 41.879584, lon: -87.623713 },
  { title: "Millennium Park", icon: "trees", color: "#2e7d32", lat: 41.882702, lon: -87.622554 },
  { title: "Chicago Union Station", icon: "train-front", color: "#1565c0", lat: 41.878691, lon: -87.640302 },
  { title: "Palmer House", icon: "hotel", color: "#c2185b", lat: 41.880695, lon: -87.626830 },
  { title: "Randolph Street restaurants", icon: "utensils", color: "#d55e00", lat: 41.884184, lon: -87.648021 },
  { title: "Chicago Riverwalk", icon: "coffee", color: "#5d4037", lat: 41.887580, lon: -87.627020 }
];

// Parameters shared by all markers. They define the marker layout: shape, size, shadow, and resolution.
function getStyleParams(shape, shadow) {
  const params = new URLSearchParams({
    type: shape,
    size: "48",
    contentSize: "20",
    scaleFactor: "2"
  });

  if (shadow === "none") {
    params.set("noShadow", "true");
  } else {
    params.set("shadowType", shadow);
  }

  return params;
}

// Per-place parameters: icon and colors. They change the picture, not the size or the anchor.
function getMarkerIconUrl(styleParams, place) {
  const params = new URLSearchParams(styleParams);
  params.set("iconType", "lucide");
  params.set("icon", place.icon);
  params.set("color", place.color);
  params.set("contentColor", "#ffffff");
  params.set("noWhiteCircle", "true");
  params.set("apiKey", yourAPIKey);

  return `${MARKER_ICON_API}?${params.toString()}`;
}

// One HEAD request per marker style returns the Icon-* layout headers without downloading the image.
const layoutCache = new Map();

async function getMarkerLayout(styleParams) {
  const key = styleParams.toString();

  if (!layoutCache.has(key)) {
    const response = await fetch(`${MARKER_ICON_API}?${key}&apiKey=${yourAPIKey}`, { method: "HEAD" });

    layoutCache.set(key, {
      width: Number(response.headers.get("Icon-Width")),
      height: Number(response.headers.get("Icon-Height")),
      anchorX: Number(response.headers.get("Icon-Anchor-X")),
      anchorY: Number(response.headers.get("Icon-Anchor-Y"))
    });
  }

  return layoutCache.get(key);
}

// The anchor many integrations hardcode: the bottom center of a pin image, or the center of a circle image.
// It ignores the shadow, so the marker moves away from its location when the shadow changes.
function getGuessedAnchor(layout, shape) {
  if (shape === "circle") {
    return { anchorX: layout.width / 2, anchorY: layout.height / 2 };
  }

  return { anchorX: layout.width / 2, anchorY: layout.height };
}

function getAnchor(layout, shape, useHeaders) {
  if (!useHeaders) {
    return getGuessedAnchor(layout, shape);
  }

  return { anchorX: layout.anchorX, anchorY: layout.anchorY };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function showLayout(layout) {
  document.getElementById("status-box").innerHTML = `
    Icon-Width: ${round(layout.width)}<br>
    Icon-Height: ${round(layout.height)}<br>
    Icon-Anchor-X: ${round(layout.anchorX)}<br>
    Icon-Anchor-Y: ${round(layout.anchorY)}
  `;
}

function getSettings() {
  return {
    shape: document.getElementById("shape-select").value,
    shadow: document.getElementById("shadow-select").value,
    useHeaders: document.getElementById("use-headers").checked
  };
}

function onSettingsChange(callback) {
  document.getElementById("shape-select").addEventListener("change", callback);
  document.getElementById("shadow-select").addEventListener("change", callback);
  document.getElementById("use-headers").addEventListener("change", callback);
}

const isRetina = window.devicePixelRatio > 1;
const retinaSuffix = isRetina ? "@2x" : "";

const markerSource = new ol.source.Vector({
  features: places.map((place) => {
    const feature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([place.lon, place.lat]))
    });
    feature.set("place", place);
    return feature;
  })
});

// A red dot marks the exact coordinate, so you can see where the marker anchor lands.
const pointStyle = new ol.style.Style({
  image: new ol.style.Circle({
    radius: 4,
    fill: new ol.style.Fill({ color: "#e53935" }),
    stroke: new ol.style.Stroke({ color: "#ffffff", width: 2 })
  })
});

// Marker styles by place title; the layer reads them, so the same features can also be drawn as red dots.
const markerStyles = new Map();

const markerLayer = new ol.layer.Vector({
  source: markerSource,
  style: (feature) => markerStyles.get(feature.get("place").title)
});

const map = new ol.Map({
  target: "my-map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: `https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}${retinaSuffix}.png?apiKey=${yourAPIKey}`,
        tilePixelRatio: isRetina ? 2 : 1,
        attributions:
          'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors'
      })
    }),
    markerLayer,
    new ol.layer.Vector({ source: markerSource, style: pointStyle })
  ],
  controls: ol.control.defaults.defaults({
    attributionOptions: { collapsible: false }
  }),
  view: new ol.View({
    center: ol.proj.fromLonLat([-87.6340, 41.8818]),
    zoom: 15
  })
});

map.getView().fit(markerSource.getExtent(), { padding: [60, 60, 60, 340] });

let latestUpdate = 0;

async function updateMarkers() {
  const update = ++latestUpdate;
  const { shape, shadow, useHeaders } = getSettings();
  const styleParams = getStyleParams(shape, shadow);
  const layout = await getMarkerLayout(styleParams);

  // Skip the result if the settings changed while the HEAD request was running.
  if (update !== latestUpdate) {
    return;
  }

  const { anchorX, anchorY } = getAnchor(layout, shape, useHeaders);
  const scaleFactor = Number(styleParams.get("scaleFactor"));

  places.forEach((place) => {
    markerStyles.set(
      place.title,
      new ol.style.Style({
        image: new ol.style.Icon({
          src: getMarkerIconUrl(styleParams, place),
          crossOrigin: "anonymous",
          // Pixel anchors refer to the PNG itself, which is scaleFactor times larger than the CSS size.
          anchor: [anchorX * scaleFactor, anchorY * scaleFactor],
          anchorXUnits: "pixels",
          anchorYUnits: "pixels",
          // Display the double-resolution PNG at its CSS size from the headers.
          scale: 1 / scaleFactor
        })
      })
    );
  });
  markerLayer.changed();

  showLayout(layout);
}

onSettingsChange(updateMarkers);
updateMarkers();
