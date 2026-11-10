// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// This demo key can be blocked or restricted at any time.
const apiKey = "5402608de7c44a2d95121c407ad2110b";

// Default view when no location is detected: the whole world
const defaultView = {
  center: [0, 25],
  zoom: 1.3
};

// IP geolocation is approximate (usually city level), so the map shows an area, not a point.
// The circle size is illustrative only: the API doesn't return an accuracy radius.
const areaRadiusMeters = 15000;
const locationZoom = 10;

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
  center: defaultView.center,
  zoom: defaultView.zoom
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const ipForm = document.getElementById("ip-form");
const ipInput = document.getElementById("ip-input");
const locationCard = document.getElementById("location-card");

let activeRequestId = 0;

ipForm.addEventListener("submit", event => {
  event.preventDefault();
  locateByIp(ipInput.value.trim());
});

map.on("load", () => {
  map.addSource("approximate-area", {
    type: "geojson",
    data: emptyFeatureCollection()
  });

  map.addLayer({
    id: "approximate-area-fill",
    type: "fill",
    source: "approximate-area",
    paint: {
      "fill-color": "#2563eb",
      "fill-opacity": 0.18
    }
  });

  map.addLayer({
    id: "approximate-area-outline",
    type: "line",
    source: "approximate-area",
    paint: {
      "line-color": "#2563eb",
      "line-width": 2,
      "line-opacity": 0.7
    }
  });

  // An "ip" URL parameter (for example index.html?ip=129.6.15.28) looks up that IP address.
  // Without it, the API locates the IP address of whoever sends the request: the visitor.
  const ipFromUrl = new URLSearchParams(window.location.search).get("ip") || "";
  ipInput.value = ipFromUrl;
  locateByIp(ipFromUrl);
});

function locateByIp(ip) {
  const requestId = ++activeRequestId;
  const ipParam = ip ? `ip=${encodeURIComponent(ip)}&` : "";
  const ipInfoUrl = `https://api.geoapify.com/v1/ipinfo?${ipParam}apiKey=${apiKey}`;

  showStatus(ip ? `Locating ${ip}…` : "Detecting your location…");

  fetch(ipInfoUrl)
    .then(response => {
      if (requestId !== activeRequestId) {
        return;
      }

      if (response.status !== 200) {
        showFallback(`The request failed with status ${response.status}.`);
        return;
      }

      return response.json().then(ipInfo => {
        if (requestId !== activeRequestId) {
          return;
        }

        if (!ipInfo.location) {
          showFallback("The response has no location for this IP address.");
          return;
        }

        showLocation(ipInfo);
      });
    });
}

function showLocation(ipInfo) {
  const center = [ipInfo.location.longitude, ipInfo.location.latitude];

  map.getSource("approximate-area").setData(circlePolygon(center, areaRadiusMeters));
  map.flyTo({
    center,
    zoom: locationZoom,
    duration: 2000
  });

  locationCard.replaceChildren();

  const place = document.createElement("h2");
  place.className = "location-card__place";
  place.textContent = [ipInfo.city && ipInfo.city.name, ipInfo.state && ipInfo.state.name]
    .filter(Boolean)
    .join(", ") || "Unknown city";
  locationCard.appendChild(place);

  if (ipInfo.country) {
    const country = document.createElement("p");
    country.className = "location-card__country";
    country.textContent = [ipInfo.country.flag, ipInfo.country.name].filter(Boolean).join(" ");
    locationCard.appendChild(country);
  }

  const note = document.createElement("p");
  note.className = "location-card__note";
  note.textContent = "Approximate, city-level location from your IP address";
  locationCard.appendChild(note);

  if (ipInfo.ip) {
    const ipLine = document.createElement("p");
    ipLine.className = "location-card__ip";
    ipLine.textContent = `IP: ${ipInfo.ip}`;
    locationCard.appendChild(ipLine);
  }
}

function showFallback(message) {
  map.getSource("approximate-area").setData(emptyFeatureCollection());
  map.flyTo({
    center: defaultView.center,
    zoom: defaultView.zoom,
    duration: 1500
  });

  locationCard.replaceChildren();

  const title = document.createElement("h2");
  title.className = "location-card__place";
  title.textContent = "Couldn't detect a location";
  locationCard.appendChild(title);

  if (message) {
    const details = document.createElement("p");
    details.className = "location-card__note";
    details.textContent = message;
    locationCard.appendChild(details);
  }
}

function showStatus(text) {
  locationCard.replaceChildren();

  const status = document.createElement("p");
  status.className = "location-card__status";
  status.textContent = text;
  locationCard.appendChild(status);
}

// Builds a GeoJSON polygon that approximates a circle around [lon, lat]
function circlePolygon(center, radiusMeters, steps = 64) {
  const earthRadius = 6371008.8;
  const [lon, lat] = center;
  const latRad = lat * Math.PI / 180;
  const coordinates = [];

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dLat = (radiusMeters * Math.cos(angle)) / earthRadius;
    const dLon = (radiusMeters * Math.sin(angle)) / (earthRadius * Math.cos(latRad));

    coordinates.push([lon + dLon * 180 / Math.PI, lat + dLat * 180 / Math.PI]);
  }

  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [coordinates]
      }
    }]
  };
}

function emptyFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: []
  };
}
