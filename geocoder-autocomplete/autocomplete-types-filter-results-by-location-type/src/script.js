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

// Initialize
const ac = new autocomplete.GeocoderAutocomplete(
  document.getElementById("ac"),
  yourAPIKey,
  {
    skipIcons: false,
    placeholder: "Start typing…"
  }
);

// Elements
const typeSel = document.getElementById("type-select");
const langSel = document.getElementById("lang-select");
const infoCurrent = document.getElementById("info-current");
const infoSelected = document.getElementById("info-selected");
const infoJson = document.getElementById("info-json");
const countryFilterRow = document.getElementById("postcode-filter-row");
const countryFilter = document.getElementById("country-filter");

function updateCurrent() {
  const type = typeSel.value || "any";
  const lang = langSel.value || "en";
  infoCurrent.innerHTML = `<strong>Current:</strong> type=${type}, lang=${lang}`;
}

typeSel.addEventListener("change", () => {
  const val = typeSel.value;
  if (val) ac.setType && ac.setType(val);
  else ac.setType && ac.setType(null);
  // Toggle postcode country filter UI and apply filter when needed
  if (val === "postcode") {
    countryFilterRow.style.display = "";
  } else {
    countryFilterRow.style.display = "none";
  }
  applyCountryFilterIfNeeded();
  updateCurrent();
});
langSel.addEventListener("change", () => {
  const val = langSel.value;
  ac.setLang && ac.setLang(val);
  updateCurrent();
});

countryFilter.addEventListener("change", () => {
  applyCountryFilterIfNeeded();
});

function applyCountryFilterIfNeeded() {
  if (!ac || !ac.clearFilters) return;
  ac.clearFilters();
  if (typeSel.value === "postcode") {
    const code = countryFilter.value;
    if (code && ac.addFilterByCountry) {
      ac.addFilterByCountry([code]);
    }
  }
}

ac.on("select", (feature) => {
  const p = (feature && feature.properties) || {};
  const formatted = p.formatted || p.address_line1 || "";
  const parts = [];
  [
    "country",
    "state",
    "city",
    "postcode",
    "street",
    "housenumber",
    "name"
  ].forEach((k) => {
    if (p[k]) parts.push(`${k}=${p[k]}`);
  });
  infoSelected.innerHTML = `<strong>Selected:</strong> ${formatted || "—"}${
    parts.length ? " — " + parts.join(", ") : ""
  }`;
  const snippet = JSON.stringify(p, null, 2);
  infoJson.textContent =
    snippet.length > 4000 ? snippet.slice(0, 4000) + "\n…" : snippet;
});

// Initialize current panel
updateCurrent();
// Ensure filters are in a consistent state on load
applyCountryFilterIfNeeded();