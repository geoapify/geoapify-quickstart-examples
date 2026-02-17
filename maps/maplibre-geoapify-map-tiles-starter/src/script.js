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