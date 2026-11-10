// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const MARKER_ICON_API = "https://api.geoapify.com/v2/icon";

const places = [
  { title: "Place de la Cathédrale", lat: 48.581555, lon: 7.750156 },
  { title: "Place Broglie", lat: 48.584987, lon: 7.750318 },
  { title: "Place Kléber", lat: 48.583311, lon: 7.745962 },
  { title: "Place Gutenberg", lat: 48.581190, lon: 7.748539 },
  { title: "Place Benjamin Zix", lat: 48.581323, lon: 7.742410 },
  { title: "Place du Marché aux Poissons", lat: 48.580372, lon: 7.751880 }
];

// Layer groups of the Geoapify osm-bright style: [layer id, paint property].
// A theme palette sets one color per group.
const layerGroups = {
  background: [["background", "background-color"]],
  landuse: [["landuse-residential", "fill-color"]],
  landuseOther: ["landuse-commercial", "landuse-industrial", "landuse-school", "landuse-hospital", "landuse-railway", "landuse-cemetery"].map((id) => [id, "fill-color"]),
  // City parks and green spaces. The "park" layer is left out: in osm-bright it also holds
  // protected areas (historic districts, nature reserves), so themed palettes hide it instead.
  park: ["landcover-grass", "landcover-grass-park"].map((id) => [id, "fill-color"]),
  wood: [["landcover-wood", "fill-color"]],
  water: [["water", "fill-color"], ["water-offset", "fill-color"], ...["waterway-river", "waterway-stream-canal", "waterway-other", "waterway_tunnel"].map((id) => [id, "line-color"])],
  building: [["building", "fill-color"], ["building", "fill-outline-color"]],
  buildingTop: [["building-top", "fill-color"], ["building-top", "fill-outline-color"]],
  roadMajor: ["highway-primary", "highway-trunk", "highway-motorway", "highway-motorway-link", "bridge-trunk-primary", "bridge-motorway", "bridge-motorway-link", "tunnel-trunk-primary", "tunnel-motorway"].map((id) => [id, "line-color"]),
  roadMajorCasing: ["highway-primary-casing", "highway-trunk-casing", "highway-motorway-casing", "highway-motorway-link-casing", "bridge-trunk-primary-casing", "bridge-motorway-casing", "bridge-motorway-link-casing", "tunnel-trunk-primary-casing", "tunnel-motorway-casing"].map((id) => [id, "line-color"]),
  roadMid: ["highway-secondary-tertiary", "bridge-secondary-tertiary", "tunnel-secondary-tertiary", "highway-link", "bridge-link"].map((id) => [id, "line-color"]),
  roadMidCasing: ["highway-secondary-tertiary-casing", "bridge-secondary-tertiary-casing", "tunnel-secondary-tertiary-casing", "highway-link-casing", "bridge-link-casing"].map((id) => [id, "line-color"]),
  roadMinor: [...["highway-minor", "tunnel-minor", "tunnel-service-track"].map((id) => [id, "line-color"]), ["highway-area", "fill-color"]],
  roadMinorCasing: ["highway-minor-casing", "tunnel-minor-casing", "tunnel-service-track-casing"].map((id) => [id, "line-color"]),
  path: ["highway-path", "bridge-path", "tunnel-path"].map((id) => [id, "line-color"]),
  rail: ["railway", "railway-transit", "railway-service", "bridge-railway", "tunnel-railway"].map((id) => [id, "line-color"]),
  label: labelLayers().map((id) => [id, "text-color"]),
  labelHalo: labelLayers().map((id) => [id, "text-halo-color"])
};

function labelLayers() {
  return ["place-other", "place-village", "place-town", "place-city", "place-city-capital", "highway-name-path", "highway-name-minor", "highway-name-major", "waterway-name", "water-name-other", "water-name-lakeline", "poi-level-1", "poi-level-2", "poi-level-3", "poi-railway"];
}

// Each theme: a palette for the map and a marker style with one icon per place.
// "marker" holds Marker Icon API parameters shared by all markers of the theme.
const themes = {
  default: {
    name: "Default",
    palette: {},
    marker: { type: "material", size: "46", contentSize: "20" },
    icons: ["church", "storefront", "star", "restaurant", "local_florist", "local_bar"],
    colors: ["#1e88e5"]
  },
  christmas: {
    name: "Christmas",
    palette: { background: "#fbfcff", landuse: "#f1f4f8", landuseOther: "#eef1f6", park: "#2f7d4a", wood: "#1e5a35", water: "#bfe3f5", building: "#e3e9f0", buildingTop: "#f4f7fa", roadMajor: "#e8a0aa", roadMajorCasing: "#c47883", roadMid: "#f5cdd2", roadMidCasing: "#d9a5ac", roadMinor: "#ffffff", roadMinorCasing: "#d8dee8", path: "#d4a017", rail: "#9aa6b5", label: "#1e5a35", labelHalo: "#ffffff" },
    marker: { type: "material", iconType: "awesome", size: "46", contentSize: "18" },
    icons: ["tree", "gifts", "star", "candy-cane", "snowflake", "holly-berry"],
    colors: ["#c8102e", "#1e5a35"]
  },
  winter: {
    name: "Winter",
    palette: { background: "#f7fbff", landuse: "#edf4fb", landuseOther: "#e6eef8", park: "#dcebf7", wood: "#c4d9ec", water: "#9cc9ea", building: "#dfe7f1", buildingTop: "#f2f6fb", roadMajor: "#1f4e8c", roadMajorCasing: "#14335c", roadMid: "#7fa8d6", roadMidCasing: "#5a84b3", roadMinor: "#ffffff", roadMinorCasing: "#c9d6e6", path: "#5a84b3", rail: "#8aa0b8", label: "#14335c", labelHalo: "#ffffff" },
    marker: { type: "circle", size: "34", contentSize: "18", shadowType: "drop" },
    icons: ["ac_unit", "downhill_skiing", "ice_skating", "sledding", "snowboarding", "local_fire_department"],
    colors: ["#1f4e8c", "#4f9fd6"]
  },
  valentine: {
    name: "Valentine's Day",
    palette: { background: "#fff5f8", landuse: "#ffeef3", landuseOther: "#fbe6ee", park: "#f6c1d4", wood: "#ee9fbd", water: "#f3d3e6", building: "#f7dbe5", buildingTop: "#fff0f5", roadMajor: "#d81b60", roadMajorCasing: "#a3124a", roadMid: "#f48fb1", roadMidCasing: "#d46f93", roadMinor: "#ffffff", roadMinorCasing: "#f1c6d6", path: "#e75c8e", rail: "#c9a3b4", label: "#8c1240", labelHalo: "#ffffff" },
    marker: { type: "awesome", size: "46", contentSize: "18" },
    icons: ["heart", "gem", "champagne-glasses", "cake-candles", "wine-glass", "heart-circle-check"],
    colors: ["#d81b60", "#e75c8e"]
  },
  stpatrick: {
    name: "St. Patrick's Day",
    palette: { background: "#f4fbf2", landuse: "#ebf6e7", landuseOther: "#e2f0dc", park: "#5fbf5a", wood: "#2e8b3e", water: "#bde3d6", building: "#dcebd6", buildingTop: "#eef7ea", roadMajor: "#169b45", roadMajorCasing: "#0d6b2f", roadMid: "#f2c94c", roadMidCasing: "#c9a12f", roadMinor: "#ffffff", roadMinorCasing: "#cfe3c8", path: "#d4a017", rail: "#93a98d", label: "#0d5a27", labelHalo: "#ffffff" },
    marker: { type: "tabler", size: "46", contentSize: "20" },
    icons: ["clover", "clover-2", "glass-full", "rainbow", "sparkles", "bottle"],
    colors: ["#169b45", "#0d6b2f"]
  },
  easter: {
    name: "Easter",
    palette: { background: "#fffdf3", landuse: "#fdf8e4", landuseOther: "#f6f1dc", park: "#b7e4c7", wood: "#8fd1a8", water: "#bfe4f7", building: "#efe8f7", buildingTop: "#faf6ff", roadMajor: "#9c6ade", roadMajorCasing: "#7646b8", roadMid: "#ffd54f", roadMidCasing: "#e0b43a", roadMinor: "#ffffff", roadMinorCasing: "#e8e0c9", path: "#f48fb1", rail: "#b9b0c8", label: "#5b3a8c", labelHalo: "#ffffff" },
    marker: { type: "phosphor", size: "46", contentSize: "20" },
    icons: ["egg", "flower-tulip", "butterfly", "flower", "bird", "plant"],
    colors: ["#9c6ade", "#f2b705", "#e75c8e"]
  },
  summer: {
    name: "Summer",
    palette: { background: "#fff8ec", landuse: "#fbefd9", landuseOther: "#f5e6cc", park: "#9ed39a", wood: "#6fbf73", water: "#4fc3d9", building: "#f3dfc0", buildingTop: "#fbf0dc", roadMajor: "#ff7043", roadMajorCasing: "#d4502a", roadMid: "#ffca7a", roadMidCasing: "#e0a556", roadMinor: "#ffffff", roadMinorCasing: "#ead9bd", path: "#ff8a65", rail: "#c2b39b", label: "#7a3b12", labelHalo: "#ffffff" },
    marker: { type: "material-symbols-rounded", size: "46", contentSize: "20" },
    icons: ["sunny", "beach_access", "icecream", "celebration", "local_florist", "cake"],
    colors: ["#ff7043", "#00acc1"]
  },
  autumn: {
    name: "Autumn",
    palette: { background: "#fbf4ea", landuse: "#f6ebdc", landuseOther: "#f0e2cf", park: "#e0a458", wood: "#c46a2b", water: "#a9c7d6", building: "#ecdcc6", buildingTop: "#f7ecdd", roadMajor: "#b7410e", roadMajorCasing: "#7f2c08", roadMid: "#e9a23b", roadMidCasing: "#c07d22", roadMinor: "#ffffff", roadMinorCasing: "#e3d1b8", path: "#8d6e63", rail: "#b3a08a", label: "#6b2c0a", labelHalo: "#ffffff" },
    marker: { type: "lucide", size: "46", contentSize: "20" },
    icons: ["leaf", "wheat", "apple", "cookie", "trees", "sprout"],
    colors: ["#b7410e", "#c07d22"]
  },
  halloween: {
    name: "Halloween",
    palette: { background: "#1b1325", landuse: "#221830", landuseOther: "#261b36", park: "#3b2a55", wood: "#2c1f42", water: "#0f2a3a", building: "#2e2240", buildingTop: "#38294d", roadMajor: "#ff7518", roadMajorCasing: "#b84d07", roadMid: "#b35d1f", roadMidCasing: "#6b3612", roadMinor: "#4a3a5e", roadMinorCasing: "#2a1f38", path: "#8bc34a", rail: "#6b5a80", label: "#ffb86b", labelHalo: "#1b1325" },
    marker: { type: "circle", iconType: "mdi", size: "34", contentSize: "20", shadowType: "glow", shadowColor: "#ff7518" },
    icons: ["halloween", "ghost", "skull", "bat", "spider", "candle"],
    colors: ["#ff7518", "#6a1b9a"]
  }
};

// Date ranges for "Auto". Holidays come first, so they win over the longer seasons.
// Months are 1-12. A range may cross the new year (Dec 1 - Jan 6).
const seasonRules = [
  { theme: "christmas", from: [12, 1], to: [1, 6] },
  { theme: "valentine", from: [2, 7], to: [2, 14] },
  { theme: "stpatrick", from: [3, 14], to: [3, 17] },
  { theme: "easter", easter: true },
  { theme: "halloween", from: [10, 24], to: [10, 31] },
  { theme: "winter", from: [1, 7], to: [2, 29] },
  { theme: "summer", from: [6, 21], to: [8, 31] },
  { theme: "autumn", from: [9, 22], to: [11, 30] }
];

// Easter Sunday in the Gregorian calendar (Anonymous Gregorian algorithm).
function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function matchesRule(rule, date) {
  if (rule.easter) {
    // From Palm Sunday to Easter Monday.
    const easter = getEasterSunday(date.getFullYear());
    const from = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 7);
    const to = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() + 1);
    return date >= from && date <= to;
  }

  const value = (date.getMonth() + 1) * 100 + date.getDate();
  const from = rule.from[0] * 100 + rule.from[1];
  const to = rule.to[0] * 100 + rule.to[1];

  return from <= to ? value >= from && value <= to : value >= from || value <= to;
}

function getThemeForDate(date) {
  const rule = seasonRules.find((item) => matchesRule(item, date));
  return rule ? rule.theme : "default";
}

// The original paint values of every layer a theme can change, saved once after the style loads.
// Restoring them first means themes never mix.
const originalPaint = [];

function saveOriginalPaint() {
  Object.values(layerGroups).flat().forEach(([layerId, property]) => {
    if (map.getLayer(layerId)) {
      originalPaint.push([layerId, property, map.getPaintProperty(layerId, property)]);
    }
  });
}

function applyPalette(palette) {
  originalPaint.forEach(([layerId, property, value]) => map.setPaintProperty(layerId, property, value));

  Object.entries(palette).forEach(([group, color]) => {
    layerGroups[group].forEach(([layerId, property]) => {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, property, color);
      }
    });
  });

  // Hide the protected-area tint while a theme is on; the default style keeps it.
  if (map.getLayer("park")) {
    map.setLayoutProperty("park", "visibility", Object.keys(palette).length ? "none" : "visible");
  }
}

function getMarkerIconUrl(theme, index) {
  const params = new URLSearchParams(theme.marker);
  params.set("icon", theme.icons[index]);
  params.set("color", theme.colors[index % theme.colors.length]);
  // A white icon right on the colored shape, without the default white circle behind it.
  params.set("contentColor", "#ffffff");
  params.set("noWhiteCircle", "true");
  params.set("scaleFactor", "2");
  params.set("apiKey", yourAPIKey);

  return `${MARKER_ICON_API}?${params.toString()}`;
}

// One HEAD request per theme returns the marker size and anchor (the Icon-* headers).
// All markers of a theme share the same layout, because only the icon and color differ.
const layoutCache = new Map();

async function getMarkerLayout(theme) {
  const params = new URLSearchParams(theme.marker);
  params.set("scaleFactor", "2");
  const key = params.toString();

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

const map = new maplibregl.Map({
  container: "my-map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${yourAPIKey}`,
  center: [7.7470, 48.5823],
  zoom: 15.4
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

function getSelectedDate() {
  const [year, month, day] = document.getElementById("date-input").value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

let latestUpdate = 0;

async function updateTheme() {
  const update = ++latestUpdate;
  const selected = document.getElementById("theme-select").value;
  const date = getSelectedDate();
  const themeId = selected === "auto" ? getThemeForDate(date) : selected;
  const theme = themes[themeId];
  const layout = await getMarkerLayout(theme);

  // Skip the result if the settings changed while the HEAD request was running.
  if (update !== latestUpdate) {
    return;
  }

  applyPalette(theme.palette);

  markers.forEach((marker, index) => {
    const image = marker.getElement();
    image.src = getMarkerIconUrl(theme, index);
    image.style.width = `${layout.width}px`;
    image.style.height = `${layout.height}px`;
    marker.setOffset([-layout.anchorX, -layout.anchorY]);
    marker.getPopup().setOffset([layout.width / 2 - layout.anchorX, -layout.anchorY]);
  });

  document.getElementById("status-box").innerHTML = `
    ${date.toDateString()}<br>
    Theme: <b>${theme.name}</b> (${selected === "auto" ? "by date" : "forced"})<br>
    Markers: type=${theme.marker.type}${theme.marker.iconType ? `, iconType=${theme.marker.iconType}` : ""}
  `;
}

// Force a theme regardless of the date, for example during a campaign or to preview it:
// set forcedTheme to a theme id ("christmas", "halloween", ...), or open the page with ?theme=halloween.
// null keeps the automatic choice by date.
const forcedTheme = null;

const requestedTheme = new URLSearchParams(window.location.search).get("theme") || forcedTheme;

if (requestedTheme && themes[requestedTheme]) {
  document.getElementById("theme-select").value = requestedTheme;
}

// Today's date in the local time zone, as yyyy-mm-dd for the date input.
const today = new Date();
document.getElementById("date-input").value = [
  today.getFullYear(),
  String(today.getMonth() + 1).padStart(2, "0"),
  String(today.getDate()).padStart(2, "0")
].join("-");

document.getElementById("date-input").addEventListener("change", updateTheme);
document.getElementById("theme-select").addEventListener("change", updateTheme);

map.on("load", () => {
  saveOriginalPaint();
  updateTheme();
});
