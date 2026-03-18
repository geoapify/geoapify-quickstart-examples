/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// Theme support
function setTheme(themeName) {
  const themeLink = document.getElementById("geocoder-theme");
  themeLink.href = `https://cdn.jsdelivr.net/npm/@geoapify/geocoder-autocomplete@3.0.1/styles/${themeName}.css`;
  document.body.className = document.body.className.replace(/theme-\w+/g, "");
  document.body.classList.add(`theme-${themeName}`);
  localStorage.setItem("geocoder-theme", themeName);
}
window.addEventListener("load", () => {
  const savedTheme = localStorage.getItem("geocoder-theme") || "minimal";
  document.getElementById("theme-selector").value = savedTheme;
  setTheme(savedTheme);
});

// Elements
const geoBtn = document.getElementById("geo-btn");
const confirmBtn = document.getElementById("confirm-btn");
const confirmMessage = document.getElementById("confirm-message");
const devIpEl = document.getElementById("dev-ip");
const devRev1GeoPanel = document.getElementById("dev-rev1-panel");
const devRev1GeoEl = document.getElementById("dev-rev1");
const devRev1GeoJsonEl = document.getElementById("dev-rev1-json");

const devRev2GeoPanel = document.getElementById("dev-rev2-panel");
const devRev2PinEl = document.getElementById("dev-rev2");
const devRev2PinJsonEl = document.getElementById("dev-rev2-json");
const devSummaryPanel = document.getElementById("dev-summary-panel");
const devSummaryEl = document.getElementById("dev-summary");
const devSummaryJsonEl = document.getElementById("dev-summary-json");

// search results
let ipGeolocation = null;
let geolocation = null;
let lastRevFromGeo = null;
let lastRevFromDrag = null;
let lastSearch = null;

let lastAddress = null;
let lastLocation = null;

const MAX_LOCATION_TO_ADDRESS_ERROR = 50; // 50 meters

// Map + marker
const map = L.map("map", { zoomControl: true }).setView([20, 0], 2);
const isRetina = L.Browser.retina;
const tileUrl = isRetina
  ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey=${yourAPIKey}`
  : `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${yourAPIKey}`;
L.tileLayer(tileUrl, {
  attribution:
    'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" rel="nofollow" target="_blank">© OpenStreetMap</a> contributors'
}).addTo(map);

const markerIcon = L.icon({
  iconUrl: `https://api.geoapify.com/v1/icon/?type=awesome&color=%232ea2ff&size=large&scaleFactor=2&apiKey=${yourAPIKey}`,
  iconSize: [38, 56],
  iconAnchor: [19, 51],
  popupAnchor: [0, -60]
});
let marker = null;

// Initialize autocomplete with optional bias later
const ac = new autocomplete.GeocoderAutocomplete(
  document.getElementById("autocomplete"),
  yourAPIKey,
  {
    skipIcons: true,
    allowNonVerifiedStreet: true,
    allowNonVerifiedHouseNumber: true
  }
);

// IP geolocation for bias and initial view
fetch(`https://api.geoapify.com/v1/ipinfo?apiKey=${yourAPIKey}`)
  .then((r) => r.json())
  .then((ip) => {
    const loc =
      ip.location && ip.location.latitude && ip.location.longitude
        ? { lat: ip.location.latitude, lon: ip.location.longitude }
        : null;
    const cc = ip.country && ip.country.iso_code ? ip.country.iso_code : null;
    if (loc) {
      map.setView([loc.lat, loc.lon], 12);
      // Bias autocomplete by proximity
      if (ac.addBiasByProximity) {
        ac.addBiasByProximity({ lat: loc.lat, lon: loc.lon });
      }
    }
    devIpEl.innerHTML = [
      cc ? `<strong>Country:</strong> ${cc}` : "",
      loc
        ? `<strong>Center:</strong> ${loc.lat.toFixed(5)}, ${loc.lon.toFixed(
            5
          )}`
        : ""
    ]
      .filter(Boolean)
      .join(" | ");

    ipGeolocation = ip;
  })
  .catch(() => {
    devIpEl.textContent = "IP geolocation unavailable.";
  });

// Handle selection
ac.on("select", (res) => {
  if (!res || !res.properties) return;
  const p = res.properties;
  lastSearch = p;
  lastAddress = p;
  lastLocation = {
    lat: p.lat,
    lon: p.lon
  };

  // Add/move marker
  const latlng = [p.lat, p.lon];
  if (!marker) {
    marker = L.marker(latlng, { icon: markerIcon, draggable: true }).addTo(map);
    marker.on("dragend", onMarkerDragEnd);
  } else {
    marker.setLatLng(latlng);
  }
  map.setView(latlng, Math.max(map.getZoom(), 16));
  updateConfirmState();
});

// Browser geolocation + reverse geocoding
geoBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }
  geoBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      geolocation = pos;

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const latlng = [lat, lon];
      if (!marker) {
        marker = L.marker(latlng, { icon: markerIcon, draggable: true }).addTo(
          map
        );
        marker.on("dragend", onMarkerDragEnd);
      } else {
        marker.setLatLng(latlng);
      }
      map.setView(latlng, Math.max(map.getZoom(), 16));

      lastLocation = {
        lat: lat,
        lon: lon
      };

      reverseGeocode(
        lat,
        lon,
        (rev) => {
          const pr = rev.properties || {};
          if (pr.formatted && ac) {
            ac.setValue(pr.formatted);
          }
          lastAddress = pr;
          devRev1GeoPanel.hidden = false;
          const urlMasked = `https://api.geoapify.com/v1/geocode/reverse?lat=${encodeURIComponent(
            lat
          )}&lon=${encodeURIComponent(lon)}&apiKey=YOUR_API_KEY`;
          devRev1GeoEl.innerHTML = `<strong>URL:</strong> ${urlMasked} | <strong>Formatted:</strong> ${
            pr.formatted || "—"
          }`;
          const propsSnippet = JSON.stringify(pr, null, 2);
          devRev1GeoJsonEl.textContent =
            propsSnippet.length > 4000
              ? propsSnippet.slice(0, 4000) + "\n…"
              : propsSnippet;
          lastRevFromGeo = pr;
          updateConfirmState();
        },
        "geo"
      );
      geoBtn.disabled = false;
    },
    (err) => {
      alert("Unable to retrieve your location.");
      geoBtn.disabled = false;
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
});

function onMarkerDragEnd() {
  if (!marker) return;
  const { lat, lng } = marker.getLatLng();
  confirmMessage.textContent = "Pin updated. Please confirm the location.";

  lastLocation = {
    lat: lat,
    lon: lng
  };

  reverseGeocode(
    lat,
    lng,
    (rev) => {
      const pr = rev.properties || {};
      devRev2GeoPanel.hidden = false;

      const urlMasked = `https://api.geoapify.com/v1/geocode/reverse?lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&apiKey=YOUR_API_KEY`;
      devRev2PinEl.innerHTML = `<strong>URL:</strong> ${urlMasked} | <strong>Formatted:</strong> ${
        pr.formatted || "—"
      }`;
      const propsSnippet = JSON.stringify(pr, null, 2);
      devRev2PinJsonEl.textContent =
        propsSnippet.length > 4000
          ? propsSnippet.slice(0, 4000) + "\n…"
          : propsSnippet;
      lastRevFromDrag = pr;

      // update last address if last address too far away
      if (pr.distance <= MAX_LOCATION_TO_ADDRESS_ERROR) {
        lastAddress = pr;
        ac.setValue(pr.formatted);
      }

      updateConfirmState();
    },
    "pin"
  );
}

function updateConfirmState() {
  const hasPin = !!marker;
  confirmBtn.disabled = !hasPin;
}

confirmBtn.addEventListener("click", () => {
  if (!lastLocation || !lastAddress) return;

  const lat = lastLocation.lat;
  const lng = lastLocation.lon;

  const addr = lastAddress.formatted;
  confirmMessage.textContent = addr
    ? `Saved with pin: ${lat.toFixed(6)}, ${lng.toFixed(6)} — Address: ${addr}`
    : `Saved with pin: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  // Developer summary of calls and state
  const summary = [];
  summary.push(`<strong>Address:</strong> ${addr}`);
  summary.push(
    `<strong>Location:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}`
  );
  const dist = haversineMeters(lastAddress.lat, lastAddress.lon, lat, lng);
  summary.push(
    `<strong>Distance address↔location:</strong> ${Math.round(dist)} m`
  );

  devSummaryPanel.hidden = false;
  devSummaryEl.innerHTML = summary.join(" | ");
  const json = {
    ipGeolocation: ipGeolocation,
    browserGeolocation: geolocation || null,
    autocompleteSearch: lastSearch || null,
    reverseFromGeolocation: lastRevFromGeo || null,
    reverseFromPin: lastRevFromDrag || null,
    final: { lat, lon: lng, addressText: addr }
  };
  const jsonText = JSON.stringify(json, null, 2);
  devSummaryJsonEl.textContent =
    jsonText.length > 8000 ? jsonText.slice(0, 8000) + "\n…" : jsonText;
});

// Utils
function reverseGeocode(lat, lon, cb, target = "pin") {
  const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&apiKey=${yourAPIKey}`;
  const masked = url.replace(/(apiKey=)[^&]+/i, "$1YOUR_API_KEY");

  if (target === "pin") {
    devRev2PinEl.innerHTML = `<strong>URL:</strong> ${masked}`;
  } else if (target === "geo") {
    devRev1GeoEl.innerHTML = `<strong>URL:</strong> ${masked}`;
  }
  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      const f =
        data && data.features && data.features[0] ? data.features[0] : null;
      if (!f) {
        if (target === "pin") devRev2PinEl.innerHTML += " | No reverse result";
        else devRev1GeoEl.innerHTML += " | No reverse result";
        cb({ properties: {} });
        return;
      }

      cb(f);
    })
    .catch((err) => {
      if (target === "pin")
        devRev2PinEl.innerHTML += ` | Error: ${String(err)}`;
      else devRev1GeoEl.innerHTML += ` | Error: ${String(err)}`;
      cb({ properties: {} });
    });
}

// Haversine distance in meters
function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Developer info visibility toggle (non-intrusive; does not change existing logic)
(function () {
  const key = "demo:showDevPanels";
  const cb = document.getElementById("dev-toggle");
  function apply(val) {
    if (val) document.body.classList.remove("hide-dev");
    else document.body.classList.add("hide-dev");
  }
  if (cb) {
    const saved = localStorage.getItem(key);
    const show = saved === null ? true : saved === "true";
    cb.checked = show;
    apply(show);
    cb.addEventListener("change", () => {
      const v = cb.checked;
      localStorage.setItem(key, String(v));
      apply(v);
    });
  }
})();