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

const map = new maplibregl.Map({
  container: "my-map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright-grey/style.json?apiKey=${yourAPIKey}`,
  center: [-87.6340, 41.8818],
  zoom: 14.5
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const markers = places.map((place) => {
  const image = document.createElement("img");
  image.alt = place.title;

  return new maplibregl.Marker({ element: image, anchor: "top-left" })
    .setLngLat([place.lon, place.lat])
    .setPopup(new maplibregl.Popup().setText(place.title))
    .addTo(map);
});

map.on("load", () => {
  // A red dot marks the exact coordinate, so you can see where the marker anchor lands.
  map.addSource("place-points", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: places.map((place) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [place.lon, place.lat] },
        properties: { title: place.title }
      }))
    }
  });

  map.addLayer({
    id: "place-points",
    type: "circle",
    source: "place-points",
    paint: {
      "circle-radius": 4,
      "circle-color": "#e53935",
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2
    }
  });

  map.fitBounds(
    places.reduce((bounds, place) => bounds.extend([place.lon, place.lat]), new maplibregl.LngLatBounds()),
    { padding: { top: 60, bottom: 60, left: 340, right: 60 } }
  );
});

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

  places.forEach((place, index) => {
    const marker = markers[index];
    const image = marker.getElement();

    // Display the double-resolution PNG at its CSS size from the headers.
    image.src = getMarkerIconUrl(styleParams, place);
    image.style.width = `${layout.width}px`;
    image.style.height = `${layout.height}px`;

    // The element's top-left corner sits on the location; shift it back by the anchor.
    marker.setOffset([-anchorX, -anchorY]);
    // Open popups just above the top edge of the marker.
    marker.getPopup().setOffset([layout.width / 2 - anchorX, -anchorY]);
  });

  showLayout(layout);
}

onSettingsChange(updateMarkers);
updateMarkers();
