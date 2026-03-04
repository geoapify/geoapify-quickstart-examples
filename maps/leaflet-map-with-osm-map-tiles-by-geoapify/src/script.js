// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// Initialize the map and set its view to Salt Lake City (lat/lon) with zoom level 12
const map = L.map("my-map").setView([40.760189, -111.892655], 12);


// Retina displays require different map tiles quality
var isRetina = L.Browser.retina;
var baseUrl = "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey={apiKey}";
var retinaUrl = "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}@2x.png?apiKey={apiKey}";

// Add Geoapify tile layer with Retina support

// ℹ️ Notes:
// 1. You can choose different map styles (e.g., osm-bright, osm-bright-grey, dark-matter, positron, etc.)
// Check available styles and previews here: https://apidocs.geoapify.com/docs/maps/map-tiles/
// 2. To change the style, replace "osm-bright-grey" in the baseUrl/retinaUrl with the desired style name.
// 3. Leaflet by default uses raster map tiles (ZXY) as the base layer (PNG or JPG images). 
// Vector maps require additional plugins (like maplibre-gl-leaflet).

L.tileLayer(
  isRetina ? retinaUrl : baseUrl,
  {
    attribution:
      'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors',
    maxZoom: 20,
    id: "osm-bright",
    apiKey: yourAPIKey
  }
).addTo(map);