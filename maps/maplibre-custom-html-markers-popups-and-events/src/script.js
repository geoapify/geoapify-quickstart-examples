// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const MARKER_ICON_API = "https://api.geoapify.com/v2/icon";

const places = [
  { title: "Zürich Airport", icon: "plane-departure", color: "#1e88e5", lat: 47.450893, lon: 8.561162 },
  { title: "Zürich Hauptbahnhof", icon: "train", color: "#e53935", lat: 47.378101, lon: 8.539364 },
  { title: "Uetliberg", icon: "mountain", color: "#2e7d32", lat: 47.349446, lon: 8.491965 }
];

// A Font Awesome pin with a white icon. scaleFactor=2 returns a double-resolution PNG for sharp markers.
function getMarkerIconUrl(place) {
  const params = new URLSearchParams({
    type: "awesome",
    icon: place.icon,
    color: place.color,
    contentColor: "#ffffff",
    noWhiteCircle: "true",
    size: "52",
    contentSize: "22",
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

const map = new maplibregl.Map({
  container: "my-map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright-grey/style.json?apiKey=${yourAPIKey}`,
  center: [8.55, 47.41],
  zoom: 11,
  attributionControl: {
    customAttribution: 'Icons: <a href="https://fontawesome.com/license/free" target="_blank">Font Awesome Free</a> (CC BY 4.0)'
  }
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

map.fitBounds(
  places.reduce((bounds, place) => bounds.extend([place.lon, place.lat]), new maplibregl.LngLatBounds()),
  { padding: { top: 140, bottom: 60, left: 340, right: 80 }, animate: false }
);

function showLayout(marker) {
  document.getElementById("status-box").innerHTML = `
    <strong>Marker layout from the response headers</strong><br>
    Icon-Width: ${marker.width}<br>
    Icon-Height: ${marker.height}<br>
    Icon-Anchor-X: ${marker.anchorX}<br>
    Icon-Anchor-Y: ${Math.round(marker.anchorY * 100) / 100}
  `;
}

function logEvent(text) {
  document.getElementById("event-log").textContent = text;
}

async function addMarker(place) {
  const marker = await loadMarker(getMarkerIconUrl(place));

  // The marker is a plain HTML element, so it can be styled with CSS and listen to any DOM event.
  const element = document.createElement("img");
  element.src = marker.imageUrl;
  element.alt = place.title;
  element.className = "place-marker";
  element.style.width = `${marker.width}px`;
  element.style.height = `${marker.height}px`;

  const popup = new maplibregl.Popup({
    // Always open above the pin, so the popup never covers the marker it belongs to.
    anchor: "bottom",
    // Relative to the location: move the popup up to the top of the pin.
    offset: [marker.width / 2 - marker.anchorX, -marker.anchorY],
    closeButton: false
  }).setText(place.title);

  const mapMarker = new maplibregl.Marker({
    element,
    // Put the image's top-left corner on the location,
    // then shift it so the pin tip (the anchor from the headers) lands there instead.
    anchor: "top-left",
    offset: [-marker.anchorX, -marker.anchorY]
  })
    .setLngLat([place.lon, place.lat])
    .addTo(map);

  // MapLibre markers have no mouse events of their own: listen on the element.
  let pinned = false;

  element.addEventListener("mouseenter", () => {
    if (!popup.isOpen()) {
      popup.setLngLat(mapMarker.getLngLat()).addTo(map);
    }
    logEvent(`mouseenter: ${place.title}`);
  });

  element.addEventListener("mouseleave", () => {
    if (!pinned) {
      popup.remove();
    }
    logEvent(`mouseleave: ${place.title}`);
  });

  element.addEventListener("click", (event) => {
    // Keep the click from reaching the map.
    event.stopPropagation();
    pinned = !pinned;
    popup.setHTML(pinned ? `<strong>${place.title}</strong><br>Pinned. Click again to unpin.` : place.title);
    if (!pinned) {
      popup.remove();
    }
    logEvent(`click: ${place.title} (${pinned ? "pinned" : "unpinned"})`);
  });

  return marker;
}

Promise.all(places.map(addMarker)).then((markers) => showLayout(markers[0]));
