// 👉 Replace with your own API key. Sign up at https://www.geoapify.com/ to get one.
const yourAPIKey = "f82ea38cb77543d59c597faaa263e714";

// Jacksonville, US
const lat = 30.332039;
const lon = -81.601305;

// Initialize the map and set its view to Jacksonville, US (lat/lon) with zoom level 12
const map = L.map("my-map").setView([lat, lon], 10);

// Retina displays require different map tiles quality
var isRetina = L.Browser.retina;
var baseUrl =
  "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey={apiKey}";
var retinaUrl =
  "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}@2x.png?apiKey={apiKey}";

// Add Geoapify tile layer with Retina support

// ℹ️ Notes:
// 1. You can choose different map styles (e.g., osm-bright, osm-bright-grey, dark-matter, positron, etc.)
// Check available styles and previews here: https://apidocs.geoapify.com/docs/maps/map-tiles/
// 2. To change the style, replace "osm-bright-grey" in the baseUrl/retinaUrl with the desired style name.
// 3. Leaflet by default uses raster map tiles (ZXY) as the base layer (PNG or JPG images).
// Vector maps require additional plugins (like maplibre-gl-leaflet).

L.tileLayer(isRetina ? retinaUrl : baseUrl, {
  attribution:
    'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors',
  maxZoom: 20,
  id: "osm-bright",
  apiKey: yourAPIKey
}).addTo(map);

// Panes for ordering
map.createPane("isoline-fill");
map.getPane("isoline-fill").style.zIndex = 400;
map.createPane("markers-top");
map.getPane("markers-top").style.zIndex = 650;

// Origin marker (Geoapify Marker Icon API)
const originIcon = L.icon({
  iconUrl: `https://api.geoapify.com/v2/icon/?type=circle&color=%23d784c2&strokeColor=%231e3a8a&size=42&icon=car&iconType=awesome&contentSize=24&noWhiteCircle&scaleFactor=2&apiKey=${yourAPIKey}`,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -25]
});
L.marker([lat, lon], { icon: originIcon, pane: "markers-top" })
  .addTo(map)
  .bindPopup("Origin");

// Get isolines
const url = `https://api.geoapify.com/v1/isoline?lat=${lat}&lon=${lon}&type=time&mode=drive&range=900,1200,1800,2400,3000&apiKey=${yourAPIKey}`;
// Color palette light → dark by increasing time
const palette = [
  "#fff3bf",
  "#b2f2bb",
  "#a5d8ff",
  "#d0bfff",
  "#ffc9c9",
  "#ffd8a8"
];

fetch(url)
  .then((res) => res.json())
  .then((isolineData) => {
    const ranges = Array.from(
      new Set(
        isolineData.features
          .map((f) => f.properties?.range)
          .filter((r) => typeof r === "number")
      )
    ).sort((a, b) => a - b);

    // Map ranges to colors
    const colorByRange = {};
    ranges.forEach((r, i) => {
      colorByRange[r] = palette[Math.min(i, palette.length - 1)];
    });

    updateSummaryAndLegend(ranges, colorByRange);
    drawIsolines(isolineData, colorByRange);
  });

// Helpers
const toMinutes = (s) => Math.round(s / 60);
const rangeLabel = (r) => `${toMinutes(r)} min`;

function updateSummaryAndLegend(ranges, colorByRange) {
  // Summary + legend
  const summary = document.getElementById("summary");
  summary.textContent = `Mode: drive • Ranges: ${ranges
    .map(rangeLabel)
    .join(", ")}`;

  const legend = document.getElementById("legend");
  legend.innerHTML =
    '<div style="font-weight:600; margin-bottom:6px;">Legend</div>';
  ranges.forEach((r) => {
    const row = document.createElement("div");
    row.className = "legend-item";
    row.innerHTML = `<span class="swatch" style="background:${
      colorByRange[r]
    }"></span> ${rangeLabel(r)}`;
    legend.appendChild(row);
  });
}

function drawIsolines(isolineData, colorByRange) {
  // reorder the features by range to get the smallest one on top
  isolineData.features.sort((a, b) => b.properties.range - a.properties.range);

  // Colored fills + outlines
  const fills = L.geoJSON(isolineData, {
    pane: "isoline-fill",
    style: (feature) => {
      const r = feature.properties?.range;
      const col = colorByRange[r] || "#74c0fc";
      return {
        color: "#1e3a8a", // outline color
        weight: 1.5, // outline width
        opacity: 0.8, // outline opacity
        fillColor: col, // fill color by range
        fillOpacity: 0.35 // semi-transparent fill
      };
    },
    onEachFeature: (feature, layer) => {
      const r = feature.properties?.range;
      const label = r ? rangeLabel(r) : "Isoline";
      layer.bindPopup(`Reachable within ${label}`);
      // Optional hover highlight
      layer.on("mouseover", () =>
        layer.setStyle({ weight: 2.5, opacity: 1, fillOpacity: 0.45 })
      );
      layer.on("mouseout", () =>
        layer.setStyle({ weight: 1.5, opacity: 0.8, fillOpacity: 0.35 })
      );
    }
  }).addTo(map);
}