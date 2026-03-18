// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// 1) Define map center and base layer
const center = ol.proj.fromLonLat([-0.09, 51.505]); // Lon, Lat

// Detect Retina / HiDPI display
const isRetina = window.devicePixelRatio > 1;
const retinaSuffix = isRetina ? "@2x" : "";

const map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}${retinaSuffix}.png?apiKey=${yourAPIKey}`,
        tilePixelRatio: isRetina ? 2 : 1,
        attributions:
          'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors'
      })
    })
  ],
  view: new ol.View({
    center,
    zoom: 13
  })
});

// 2) Add scale line
const scaleLine = new ol.control.ScaleLine({
  units: "imperial",
  bar: true,
  steps: 4,
  text: true,
  minWidth: 100
});
map.addControl(scaleLine);

// 3) Marker element
const markerEl = document.createElement("div");

const marker = new ol.Overlay({
  position: center,
  element: markerEl,
  positioning: "center-center",
  className: "marker"
});
map.addOverlay(marker);

// 4) Popup element
const popupEl = document.createElement("div");
popupEl.textContent = "Hello, OpenLayers!";

const popup = new ol.Overlay({
  position: center,
  element: popupEl,
  positioning: "bottom-center",
  offset: [0, -15],
  className: "marker-popup"
});
map.addOverlay(popup);

// 5) Show coordinates on click
const coordsEl = document.getElementById("coords");
map.on("click", (evt) => {
  const [lon, lat] = ol.proj.toLonLat(evt.coordinate);
  coordsEl.textContent = `Lon: ${lon.toFixed(5)}, Lat: ${lat.toFixed(5)}`;
  marker.setPosition(evt.coordinate);
  popupEl.textContent = `You clicked at ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  popup.setPosition(evt.coordinate);
});