/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${yourAPIKey}`,
  center: [-122.3321, 47.6062], // downtown Seattle
  zoom: 13
});
map.addControl(new maplibregl.NavigationControl(), "bottom-right");

const areaOnlySwitch = document.getElementById("area-only");
const modeHint = document.getElementById("mode-hint");

const addressField = new autocomplete.GeocoderAutocomplete(
  document.getElementById("autocomplete"),
  yourAPIKey,
  {
    placeholder: "Search an address, e.g. 500 Pike St",
    limit: 5,
    skipIcons: true,
    skipSelectionOnArrowKey: true
  }
);

// Bias: suggestions near the map center come first, others can still appear.
// Filter: only suggestions inside the visible map area.
function updateSearchArea() {
  const center = map.getCenter();
  addressField.clearBias();
  addressField.addBiasByProximity({ lon: center.lng, lat: center.lat });

  addressField.clearFilters();
  if (areaOnlySwitch.checked) {
    const bounds = map.getBounds();
    addressField.addFilterByRect({
      lon1: bounds.getWest(),
      lat1: bounds.getSouth(),
      lon2: bounds.getEast(),
      lat2: bounds.getNorth()
    });
    modeHint.textContent = "Only addresses inside the visible map. Pan or zoom to search elsewhere.";
  } else {
    modeHint.textContent = "Addresses near the map center come first. Others can still appear.";
  }
}

map.on("load", updateSearchArea);
map.on("moveend", updateSearchArea);
areaOnlySwitch.addEventListener("change", updateSearchArea);

// Show the selected address on the map
let marker;

addressField.on("select", (place) => {
  if (marker) marker.remove();
  if (!place) return; // the field was cleared

  const [lon, lat] = place.geometry.coordinates;
  marker = new maplibregl.Marker({ color: "#2563eb" }).setLngLat([lon, lat]).addTo(map);
  map.flyTo({ center: [lon, lat], zoom: Math.max(map.getZoom(), 16) });
});
