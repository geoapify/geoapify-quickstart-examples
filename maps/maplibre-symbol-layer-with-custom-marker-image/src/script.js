// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// One marker style for all points. scaleFactor=2 returns a double-resolution PNG for sharp markers.
const SCALE_FACTOR = 2;
const markerParams = new URLSearchParams({
  type: "awesome",
  icon: "mug-hot",
  color: "#ff9999",
  contentColor: "#ffffff",
  noWhiteCircle: "true",
  size: "48",
  contentSize: "20",
  scaleFactor: String(SCALE_FACTOR),
  apiKey: yourAPIKey
});
const markerUrl = `https://api.geoapify.com/v2/icon?${markerParams.toString()}`;

// Vienna coffee houses as GeoJSON points.
const cafes = {
  type: "FeatureCollection",
  features: [
    { name: "Café Central", lat: 48.210879, lon: 16.365272 },
    { name: "Café Sacher", lat: 48.203876, lon: 16.369789 },
    { name: "Café Landtmann", lat: 48.211562, lon: 16.36145 },
    { name: "Café Hawelka", lat: 48.207956, lon: 16.369805 },
    { name: "Café Sperl", lat: 48.199838, lon: 16.36117 },
    { name: "Café Prückel", lat: 48.207608, lon: 16.380417 }
  ].map((cafe) => ({
    type: "Feature",
    properties: { name: cafe.name },
    geometry: { type: "Point", coordinates: [cafe.lon, cafe.lat] }
  }))
};

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
  center: [16.37, 48.206],
  zoom: 14,
  attributionControl: {
    customAttribution: 'Icons: <a href="https://fontawesome.com/license/free" target="_blank">Font Awesome Free</a> (CC BY 4.0)'
  }
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

map.fitBounds(
  cafes.features.reduce((bounds, feature) => bounds.extend(feature.geometry.coordinates), new maplibregl.LngLatBounds()),
  { padding: { top: 100, bottom: 60, left: 340, right: 80 }, animate: false }
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

map.on("load", async () => {
  const marker = await loadMarker(markerUrl);
  const image = await map.loadImage(marker.imageUrl);

  // pixelRatio must equal the scaleFactor in the marker URL,
  // so the image is drawn at its display size from the headers.
  map.addImage("cafe-marker", image.data, { pixelRatio: SCALE_FACTOR });

  map.addSource("cafes", { type: "geojson", data: cafes });

  map.addLayer({
    id: "cafes",
    type: "symbol",
    source: "cafes",
    layout: {
      "icon-image": "cafe-marker",
      // Put the image's top-left corner on the point,
      // then shift it so the pin tip (the anchor from the headers) lands there instead.
      "icon-anchor": "top-left",
      "icon-offset": [-marker.anchorX, -marker.anchorY],
      "icon-allow-overlap": true
    }
  });

  // Symbol layers have map events: click a marker to open a popup with its name.
  map.on("click", "cafes", (event) => {
    const feature = event.features[0];

    new maplibregl.Popup({ anchor: "bottom", offset: [marker.width / 2 - marker.anchorX, -marker.anchorY] })
      .setLngLat(feature.geometry.coordinates)
      .setText(feature.properties.name)
      .addTo(map);
  });

  map.on("mouseenter", "cafes", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "cafes", () => {
    map.getCanvas().style.cursor = "";
  });

  showLayout(marker);
});
