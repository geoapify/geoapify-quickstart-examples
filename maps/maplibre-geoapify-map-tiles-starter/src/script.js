// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

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