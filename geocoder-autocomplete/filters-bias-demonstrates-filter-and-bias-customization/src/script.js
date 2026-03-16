/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

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

// Initialize autocomplete
const ac = new autocomplete.GeocoderAutocomplete(
  document.getElementById("search"),
  yourAPIKey,
  {
    skipIcons: true,
    allowNonVerifiedStreet: true,
    allowNonVerifiedHouseNumber: true,
    placeholder: "Search address…"
  }
);

// Elements
const countryToggle = document.getElementById("country-toggle");
const countrySelect = document.getElementById("countries");
const biasToggle = document.getElementById("bias-toggle");
const biasPreset = document.getElementById("bias-preset");
let biasLat = 52.52;
let biasLon = 13.405;
const resultEl = document.getElementById("result");
const chipsEl = document.getElementById("status-chips");
const devPanel = document.getElementById("dev-panel");
const devMeta = document.getElementById("dev-meta");
const devJson = document.getElementById("dev-json");
const devList = document.getElementById("dev-suggestions");
let lastQuery = "";

// Improve preset option labels without changing existing markup
(function improvePresetLabels() {
  const sel = document.getElementById("bias-preset");
  if (!sel) return;
  // Format helpers
  const formatSigned = (lat, lon, digits = 4) =>
    `${Number(lat).toFixed(digits)}, ${Number(lon).toFixed(digits)}`;
  const formatHemisphere = (lat, lon, digits = 4) => {
    const ns = lat >= 0 ? "N" : "S";
    const ew = lon >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(digits)}° ${ns}, ${Math.abs(lon).toFixed(
      digits
    )}° ${ew}`;
  };
  for (const opt of Array.from(sel.options)) {
    if (!opt.value) continue; // skip placeholder
    const [latStr, lonStr] = opt.value.split(",");
    const lat = parseFloat(latStr),
      lon = parseFloat(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    // Extract name and country code from existing text like "Berlin, DE"
    const parts = (opt.textContent || "").split(",");
    const name = parts[0] ? parts[0].trim() : "";
    const cc = parts[1] ? parts[1].trim() : "";
    const pretty = `${name}${cc ? ", " + cc : ""} — ${formatHemisphere(
      lat,
      lon,
      4
    )}`;
    opt.textContent = pretty;
    const aria = `${name}, ${cc}. Latitude ${Math.abs(lat).toFixed(4)} ${
      lat >= 0 ? "north" : "south"
    }, longitude ${Math.abs(lon).toFixed(4)} ${lon >= 0 ? "east" : "west"}.`;
    opt.setAttribute("aria-label", aria);
    opt.title = `${name}${cc ? ", " + cc : ""} · ${formatSigned(lat, lon, 5)}`;
  }
})();

// Helpers
function getSelectedCountries() {
  return Array.from(countrySelect.selectedOptions).map((o) => o.value);
}

function applyCountryFilter() {
  ac.clearFilters();
  if (countryToggle.checked) {
    const codes = getSelectedCountries();
    if (codes.length) ac.addFilterByCountry(codes);
  }
  renderChips();
}

function applyBias() {
  ac.clearBias();
  if (
    biasToggle.checked &&
    Number.isFinite(biasLat) &&
    Number.isFinite(biasLon)
  ) {
    ac.addBiasByProximity({ lat: biasLat, lon: biasLon });
  }
  renderChips();
}

function renderChips() {
  const codes = countryToggle.checked ? getSelectedCountries() : [];
  const lat = biasLat;
  const lon = biasLon;
  const biasOn =
    biasToggle.checked && Number.isFinite(lat) && Number.isFinite(lon);
  chipsEl.innerHTML = "";
  if (codes.length) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `Filter: countrycode ${codes.join(",")}`;
    chipsEl.appendChild(chip);
  } else {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = "Filter: none";
    chipsEl.appendChild(chip);
  }
  if (biasOn) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = `Bias: proximity ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    chipsEl.appendChild(chip);
  } else {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = "Bias: none";
    chipsEl.appendChild(chip);
  }
}

// Wire controls
countryToggle.addEventListener("change", applyCountryFilter);
countrySelect.addEventListener("change", applyCountryFilter);
biasToggle.addEventListener("change", applyBias);
// no lat/lon inputs anymore
biasPreset.addEventListener("change", () => {
  const val = biasPreset.value;
  if (!val) return;
  const [latStr, lonStr] = val.split(",");
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    biasLat = lat;
    biasLon = lon;
    biasToggle.checked = true;
    applyBias();
  }
});

// Initial apply
applyCountryFilter();
renderChips();

// Selection display
ac.on("select", (res) => {
  if (!res || !res.properties) {
    resultEl.textContent = "No selection.";
    return;
  }
  const p = res.properties;
  resultEl.innerHTML = `<strong>Selected:</strong> ${
    p.formatted || ""
  }<br><strong>Coords:</strong> ${p.lat?.toFixed ? p.lat.toFixed(6) : p.lat}, ${
    p.lon?.toFixed ? p.lon.toFixed(6) : p.lon
  }`;
});

// Developer info: show request URL and suggestions
ac.on &&
  ac.on("request_start", (query) => {
    lastQuery = query || "";
  });
ac.on &&
  ac.on("request_end", (success, data, error) => {
    // Build a representative URL for the autocomplete call
    const codes = countryToggle.checked ? getSelectedCountries() : [];
    const lat = biasLat;
    const lon = biasLon;
    const biasOn =
      biasToggle.checked && Number.isFinite(lat) && Number.isFinite(lon);
    const params = new URLSearchParams();
    if (lastQuery) params.set("text", lastQuery);
    if (codes.length) params.set("filter", `countrycode:${codes.join(",")}`);
    if (biasOn) params.set("bias", `proximity:${lon},${lat}`);
    params.set("apiKey", yourAPIKey);
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`;
    const maskedUrl = url.replace(/(apiKey=)[^&]+/i, "$1YOUR_API_KEY");

    devPanel.hidden = false;
    if (!success && error && !error.canceled) {
      devMeta.innerHTML = `<strong>URL:</strong> ${maskedUrl} | <strong>Status:</strong> request failed`;
      devList.innerHTML = "";
      devJson.textContent = String(error);
      return;
    }
    const items = Array.isArray(data)
      ? data
      : data && data.features
      ? data.features
      : [];
    devMeta.innerHTML = `<strong>URL:</strong> ${maskedUrl} | <strong>Suggestions:</strong> ${items.length}`;
    // Top 5 suggestions as list
    devList.innerHTML = "";
    items.slice(0, 5).forEach((f) => {
      const li = document.createElement("li");
      const p = f.properties || {};
      li.textContent = `${p.formatted || ""} (${p.lat ?? "—"}, ${
        p.lon ?? "—"
      })`;
      devList.appendChild(li);
    });
    const snippet = JSON.stringify(
      items.slice(0, 5).map((f) => f.properties || {}),
      null,
      2
    );
    devJson.textContent =
      snippet.length > 8000 ? snippet.slice(0, 8000) + "\n…" : snippet;
  });