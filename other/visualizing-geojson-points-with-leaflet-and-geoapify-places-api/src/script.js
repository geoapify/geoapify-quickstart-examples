// 👉 Replace with your own API key. Sign up at https://www.geoapify.com/ to get one.
const yourAPIKey = "f82ea38cb77543d59c597faaa263e714";

// Initialize the map and set its view to Jacksonville, US(lat/lon) with zoom level 12
const map = L.map("my-map").setView([30.332039, -81.601305], 12);

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

// Prepare a custom marker icon from Geoapify Marker Icon API, Icon size: 36 x 53px, shadow adds: 5px
const schoolIcon = L.icon({
  iconUrl: `https://api.geoapify.com/v2/icon/?type=awesome&color=%23e2b928&size=48&icon=school&iconType=lucide&contentSize=20&noWhiteCircle&scaleFactor=2&apiKey=${yourAPIKey}`,
  iconSize: [36, 53], // width, height in pixels
  iconAnchor: [18, 48], // point of the icon which corresponds to marker’s location, 5px is for shadow
  popupAnchor: [0, -55] // where popups open relative to the iconAnchor
});

// Fetch GeoJSON Points from Geoapify Places API, Schools in Jacksonville
const placesUrl =
  `https://api.geoapify.com/v2/places?categories=education.school&filter=place:51bea59c2ff66954c059d1425dff09553e40f00101f901e0d0010000000000c00208&limit=500&apiKey=${yourAPIKey}`;

fetch(placesUrl)
  .then((response) => response.json())
  .then((data) => {
    console.log("Places data:", data);

    // 5) Add GeoJSON layer with custom icons and popups
    L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        return L.marker(latlng, { icon: schoolIcon });
      },
      onEachFeature: function (feature, layer) {
        const name = feature.properties.address_line1 || "";
        const address = feature.properties.address_line2 || "";
        layer.bindPopup(`<strong>${name}</strong><br>${address}`);
      }
    }).addTo(map);
  })
  .catch((err) => console.error("Failed to load GeoJSON:", err));