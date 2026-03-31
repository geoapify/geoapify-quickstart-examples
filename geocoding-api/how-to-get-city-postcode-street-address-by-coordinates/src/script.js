/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const apiKey = "5402608de7c44a2d95121c407ad2110b";
const typeSelect = document.getElementById("type-select");
const apiUrlElement = document.getElementById("api-url");
const clickedLocationElement = document.getElementById("clicked-location");
const rawJsonElement = document.getElementById("raw-json");

let marker = null;
let initialPointMarker = null;
let popup = null;

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=${apiKey}`,
  center: [-73.985428, 40.748817],
  zoom: 14,
});

map.addControl(new maplibregl.NavigationControl(), "top-left");

map.on("click", async (event) => {
  const lngLat = event?.lngLat;

  if (
    !lngLat ||
    typeof lngLat.lat !== "number" ||
    typeof lngLat.lng !== "number"
  ) {
    return;
  }

  const selectedType = typeSelect.value;
  const clickedLon = lngLat.lng;
  const clickedLat = lngLat.lat;
  const normalizedLon = normalizeLongitude(clickedLon);
  const normalizedLat = clampLatitude(clickedLat);
  const requestUrl = buildReverseGeocodeUrl(
    normalizedLat,
    normalizedLon,
    selectedType,
  );

  apiUrlElement.textContent = requestUrl;
  clickedLocationElement.textContent =
    `lat: ${clickedLat.toFixed(6)}, lon: ${clickedLon.toFixed(6)}`;
  rawJsonElement.textContent = "Loading...";

  try {
    const data = await reverseGeocode(requestUrl);
    const result = data.results && data.results.length ? data.results[0] : null;
    rawJsonElement.textContent = JSON.stringify(data, null, 2);

    if (!result) {
      throw new Error("No reverse geocoding result found.");
    }

    const line1 =
      result.address_line1 || result.formatted || "Address not found";
    const line2 = result.address_line2 || "";

    const resultLon = typeof result.lon === "number" ? result.lon : clickedLon;
    const resultLat = typeof result.lat === "number" ? result.lat : clickedLat;
    const alignedResultLon = alignLongitudeToReference(resultLon, clickedLon);

    renderMarkerAndPopup(
      alignedResultLon,
      resultLat,
      clickedLon,
      clickedLat,
      line1,
      line2,
    );
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    rawJsonElement.textContent = JSON.stringify(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      null,
      2,
    );
  }
});

function buildReverseGeocodeUrl(lat, lon, selectedType) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: "json",
    apiKey,
  });

  if (selectedType && selectedType !== "address") {
    params.set("type", selectedType);
  }

  return `https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`;
}

async function reverseGeocode(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Request failed with status ${response.status}. ${errorBody}`);
  }

  return response.json();
}

function renderMarkerAndPopup(
  resultLon,
  resultLat,
  clickedLon,
  clickedLat,
  line1,
  line2,
) {
  if (!marker) {
    marker = new maplibregl.Marker({
      element: createGeoapifyMarkerElement(),
      anchor: "bottom",
      offset: [0, 4],
    })
      .setLngLat([resultLon, resultLat])
      .addTo(map);
  } else {
    marker.setLngLat([resultLon, resultLat]);
  }
  marker.getElement().style.zIndex = "3";

  if (!initialPointMarker) {
    initialPointMarker = new maplibregl.Marker({
      element: createInitialPointMarkerElement(),
      anchor: "center",
    })
      .setLngLat([clickedLon, clickedLat])
      .addTo(map);
  } else {
    initialPointMarker.setLngLat([clickedLon, clickedLat]);
  }
  initialPointMarker.getElement().style.zIndex = "1";

  if (popup) {
    popup.remove();
  }

  popup = new maplibregl.Popup({
    closeButton: false,
    offset: { bottom: [0, -50], left: [20, -25], right: [-20, -25] },
  })
    .setLngLat([resultLon, resultLat])
    .setHTML(
      `
      <div>
        <strong>${escapeHtml(line1)}</strong>
        <div>${escapeHtml(line2)}</div>
      </div>
    `,
    )
    .addTo(map);

  ensureReturnedPositionVisible(resultLon, resultLat, clickedLon, clickedLat);
}

function createGeoapifyMarkerElement() {
  const img = document.createElement("img");
  img.src = `https://api.geoapify.com/v2/icon/?type=material&color=%23ffffff&size=48&icon=carrot&iconType=awesome&contentSize=20&strokeColor=%23c57a05&shadowColor=%233d3125&contentColor=%23f1bb00&noWhiteCircle&scaleFactor=2&apiKey=${apiKey}`;
  img.alt = "Map marker";
  img.width = 34;
  img.height = 52;
  img.style.position = "relative";
  img.style.zIndex = "3";
  return img;
}

function createInitialPointMarkerElement() {
  const dot = document.createElement("div");
  dot.style.width = "10px";
  dot.style.height = "10px";
  dot.style.borderRadius = "50%";
  dot.style.background = "rgba(31, 111, 255, 0.2)";
  dot.style.border = "1px solid rgba(31, 111, 255, 0.5)";
  dot.style.pointerEvents = "none";
  dot.style.zIndex = "1";
  return dot;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeLongitude(lon) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function clampLatitude(lat) {
  return Math.max(-90, Math.min(90, lat));
}

function alignLongitudeToReference(lon, referenceLon) {
  let aligned = lon;

  while (aligned - referenceLon > 180) {
    aligned -= 360;
  }

  while (aligned - referenceLon < -180) {
    aligned += 360;
  }

  return aligned;
}

function ensureReturnedPositionVisible(
  resultLon,
  resultLat,
  clickedLon,
  clickedLat,
) {
  if (isPointVisibleOnMap(resultLon, resultLat, 60)) {
    return;
  }

  const padding = {
    top: 80,
    bottom: 80,
    left: 80,
    right: 80,
  };

  const bounds = new maplibregl.LngLatBounds();
  bounds.extend([resultLon, resultLat]);
  bounds.extend([clickedLon, clickedLat]);

  map.fitBounds(bounds, {
    padding,
    duration: 700,
    maxZoom: 16,
  });
}

function isPointVisibleOnMap(lon, lat, padding = 0) {
  const point = map.project([lon, lat]);
  const canvas = map.getCanvas();

  return (
    point.x >= padding &&
    point.y >= padding &&
    point.x <= canvas.clientWidth - padding &&
    point.y <= canvas.clientHeight - padding
  );
}
