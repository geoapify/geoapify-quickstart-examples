// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const MARKER_ICON_API = "https://api.geoapify.com/v2/icon";

const places = [
  {
    title: "Tierpark Hellabrunn",
    description: "Munich Zoo, on the bank of the Isar.",
    icon: "paw",
    color: "#3e9cfe",
    lat: 48.096281,
    lon: 11.554197
  },
  {
    title: "Marienplatz",
    description: "The central square of Munich's old town.",
    icon: "landmark",
    color: "#d81b60",
    lat: 48.136955,
    lon: 11.576033
  },
  {
    title: "Chinesischer Turm",
    description: "Pagoda and beer garden in the Englischer Garten.",
    icon: "tree",
    color: "#2e7d32",
    lat: 48.152551,
    lon: 11.593442
  }
];

// A Font Awesome pin with a white icon. scaleFactor=2 returns a double-resolution PNG for sharp markers.
function getMarkerIconUrl(place) {
  const params = new URLSearchParams({
    type: "awesome",
    icon: place.icon,
    color: place.color,
    contentColor: "#ffffff",
    noWhiteCircle: "true",
    size: "60",
    contentSize: "26",
    scaleFactor: "2",
    apiKey: yourAPIKey
  });

  return `${MARKER_ICON_API}?${params.toString()}`;
}

// Requests the marker image once and reads its display size and anchor (CSS pixels)
// from the Icon-* response headers. The image is reused through a local blob URL.
async function loadMarker(url) {
  const response = await fetch(url);
  const header = (name) => Number(response.headers.get(name));

  return {
    width: header("Icon-Width"),
    height: header("Icon-Height"),
    anchorX: header("Icon-Anchor-X"),
    anchorY: header("Icon-Anchor-Y"),
    imageUrl: URL.createObjectURL(await response.blob())
  };
}

const map = L.map("my-map", { zoomControl: false });
L.control.zoom({ position: "topright" }).addTo(map);

const isRetina = L.Browser.retina;
const baseUrl = "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey={apiKey}";
const retinaUrl = "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}@2x.png?apiKey={apiKey}";

L.tileLayer(isRetina ? retinaUrl : baseUrl, {
  attribution:
    'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors | Icons: <a href="https://fontawesome.com/license/free" target="_blank">Font Awesome Free</a> (CC BY 4.0)',
  apiKey: yourAPIKey,
  maxZoom: 20
}).addTo(map);

map.fitBounds(L.latLngBounds(places.map((place) => [place.lat, place.lon])), {
  paddingTopLeft: [340, 80],
  paddingBottomRight: [60, 40]
});

function showLayout(marker) {
  document.getElementById("status-box").innerHTML = `
    <strong>Marker layout from the response headers</strong><br>
    Icon-Width: ${marker.width}<br>
    Icon-Height: ${marker.height}<br>
    Icon-Anchor-X: ${marker.anchorX}<br>
    Icon-Anchor-Y: ${Math.round(marker.anchorY * 100) / 100}
  `;
}

async function addMarker(place) {
  const marker = await loadMarker(getMarkerIconUrl(place));

  const icon = L.icon({
    iconUrl: marker.imageUrl,
    // Display the double-resolution PNG at its CSS size from the headers.
    iconSize: [marker.width, marker.height],
    // Leaflet places this pixel of the image on the location: the tip of the pin, above the shadow.
    iconAnchor: [marker.anchorX, marker.anchorY],
    // Relative to iconAnchor: open the popup just above the top of the pin.
    popupAnchor: [marker.width / 2 - marker.anchorX, -marker.anchorY]
  });

  // A popup can hold any HTML.
  const popup = L.popup().setContent(`<strong>${place.title}</strong><br>${place.description}`);

  L.marker([place.lat, place.lon], { icon, title: place.title })
    .bindPopup(popup)
    .addTo(map);

  return marker;
}

Promise.all(places.map(addMarker)).then((markers) => showLayout(markers[0]));
