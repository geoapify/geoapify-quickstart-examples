// 👉 Replace with your own API key. Sign up at https://www.geoapify.com/ to get one.
const yourAPIKey = "f82ea38cb77543d59c597faaa263e714";

const initialCenter = [13.405, 52.52]; // Berlin (lng, lat)
const initialZoom = 11;

// The MapLibre GL map object
const map = new maplibregl.Map({
  container: "map", // ID of the container element
  style: `https://maps.geoapify.com/v1/styles/osm-bright-grey/style.json?apiKey=${yourAPIKey}`,
  center: initialCenter,
  zoom: initialZoom
});

// Basic controls
map.addControl(
  new maplibregl.NavigationControl({ showCompass: true }),
  "top-right"
);
map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
map.addControl(
  new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: false,
    showAccuracyCircle: true
  }),
  "top-right"
);

// --- Floating info panel ---
const infoPanel = document.getElementById("info-panel");

// Update lat/lon and px on mouse move
map.on("mousemove", (e) => {
  const { lng, lat } = e.lngLat;
  const { x, y } = map.project(e.lngLat);

  infoPanel.innerHTML = `
    <div><strong>Lat:</strong> ${lat.toFixed(
      5
    )} <strong>Lon:</strong> ${lng.toFixed(5)}</div>
    <div><strong>X:</strong> ${Math.round(x)} <strong>Y:</strong> ${Math.round(
    y
  )}</div>
  `;
});