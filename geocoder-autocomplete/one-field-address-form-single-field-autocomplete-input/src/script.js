/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// Initialize a single full-address autocomplete
const addressSearch = new autocomplete.GeocoderAutocomplete(
  document.getElementById("address-search"),
  yourAPIKey,
  {
    // default search mode returns addresses and places
    // keep UI simple for a one-field address search
    skipDetails: false,
    skipIcons: true,
    placeholder: " ",
    allowNonVerifiedStreet: true,
    allowNonVerifiedHouseNumber: true,
    skipSelectionOnArrowKey: true
  }
);

const streetEl = document.getElementById("street");
const houseEl = document.getElementById("housenumber");
const cityEl = document.getElementById("city");
const postEl = document.getElementById("postcode");
const countryEl = document.getElementById("country");
const message = document.getElementById("message");
const matchBadge = document.getElementById("match-badge");
const devPanel = document.getElementById("dev-panel");
const devInfoStatus = document.getElementById("dev-info-status");
const devInfoMeta = document.getElementById("dev-info-meta");
const devInfoCode = document.getElementById("dev-info-code");

function setTheme(themeName) {
  const themeLink = document.getElementById("geocoder-theme");
  themeLink.href = `https://cdn.jsdelivr.net/npm/@geoapify/geocoder-autocomplete@3.0.1/styles/${themeName}.css`;
  document.body.className = document.body.className.replace(/theme-\w+/g, "");
  document.body.classList.add(`theme-${themeName}`);
  localStorage.setItem("geocoder-theme", themeName);
}

function loadSavedTheme() {
  const savedTheme = localStorage.getItem("geocoder-theme") || "minimal";
  document.getElementById("theme-selector").value = savedTheme;
  setTheme(savedTheme);
}

window.addEventListener("load", loadSavedTheme);

// Autofill individual fields on selection
addressSearch.on("select", (res) => {
  if (!res || !res.properties) return;
  const p = res.properties;

  streetEl.value = p.street || "";
  houseEl.value = p.housenumber || "";
  cityEl.value = p.city || p.town || p.village || p.suburb || "";
  postEl.value = p.postcode || "";
  countryEl.value = p.country || "";

  // Highlight all editable fields and prompt review/confirm message
  [streetEl, houseEl, cityEl, postEl, countryEl].forEach((el) => {
    el.classList.remove("highlight-on-select");
    // force reflow to restart animation in case of repeated selections
    void el.offsetWidth;
    el.classList.add("highlight-on-select");
  });

  updateConfirmState();
});

// Manual entry link
document
  .getElementById("enter-manually-link")
  .addEventListener("click", (e) => {
    e.preventDefault();
    focusFirstMissing();
  });

function confirmAddress() {
  const street = streetEl.value.trim();
  const house = houseEl.value.trim();
  const city = cityEl.value.trim();
  const postcode = postEl.value.trim();
  const country = countryEl.value.trim();

  message.textContent = "";

  const missing = [];
  if (!country) missing.push(countryEl);
  if (!city) missing.push(cityEl);
  if (!street) missing.push(streetEl);
  if (!house) missing.push(houseEl);
  if (!postcode) missing.push(postEl);

  if (missing.length) {
    // Soft validation: highlight the missing fields briefly
    missing.forEach((el) => el.classList.add("warning-input"));
    setTimeout(
      () => missing.forEach((el) => el.classList.remove("warning-input")),
      2500
    );
    message.textContent =
      "Please fill in the required fields and confirm again.";
    updateConfirmState();
    return;
  }

  // In a real app, you could now submit the form to your backend
  // This demo focuses on user verification and confirmation copy
  const formatted = `${street} ${house}, ${postcode} ${city}, ${country}`;
  message.textContent = `Address confirmed: ${formatted}`;

  // Show developer panel and perform a geocoding request with structured address
  devPanel.hidden = false;
  const params = new URLSearchParams({
    housenumber: house,
    street,
    postcode,
    city,
    country,
    apiKey: yourAPIKey
  });
  const url = `https://api.geoapify.com/v1/geocode/search?${params.toString()}`;
  const maskedUrl = url.replace(/(apiKey=)[^&]+/i, "$1YOUR_API_KEY");
  devInfoStatus.textContent = "Requesting Geoapify Geocoding API…";
  devInfoMeta.innerHTML = `<strong>URL:</strong> ${maskedUrl}`;
  devInfoCode.textContent = "";

  // WARNING: Geocoding results are for internal hints only. House numbers may be missing for new/non-mapped buildings.
  fetch(url)
    .then((r) => r.json())
    .then((data) => {
      const features = data && data.features ? data.features : [];
      if (!features.length) {
        devInfoStatus.textContent =
          "No matches returned for the structured address.";
        devInfoCode.textContent = JSON.stringify(data, null, 2);
        return;
      }
      const found = features[0];
      const p = found.properties || {};
      // Compute verification message similar to other demo
      let verification = "";
      const rank = p.rank || {};
      if (rank.confidence === 1) {
        verification = "Verified to building level.";
      } else if (rank.confidence > 0.5 && rank.confidence_street_level === 1) {
        verification = "Likely accurate; verified to street level.";
      } else if (rank.confidence_street_level === 1) {
        verification = "Verified to street level only.";
      } else {
        verification = "Partial verification only.";
      }

      devInfoStatus.innerHTML = [
        `<strong>Verification:</strong> ${verification}`,
        ` | <strong>Confidence:</strong> ${rank.confidence ?? "n/a"}`,
        ` | <strong>Street-level:</strong> ${
          rank.confidence_street_level ?? "n/a"
        }`
      ].join("");

      const label = (() => {
        if (rank.confidence === 1 && p.housenumber)
          return "Building-level match";
        if (rank.confidence_street_level === 1 || p.street)
          return "Street-level match";
        return "City-level match";
      })();

      devInfoMeta.innerHTML = [
        `<strong>URL:</strong> ${maskedUrl}`,
        `<br><strong>Top result:</strong> ${p.formatted || "—"}`,
        `<br><strong>Match badge:</strong> ${label}`,
        `<br><strong>Coords:</strong> ${
          found.geometry && found.geometry.coordinates
            ? found.geometry.coordinates.join(", ")
            : "—"
        }`
      ].join("");

      // Show trimmed properties for quick inspection
      const snippet = JSON.stringify(p, null, 2);
      devInfoCode.textContent =
        snippet.length > 5000 ? snippet.slice(0, 5000) + "\n…" : snippet;
    })
    .catch((err) => {
      devInfoStatus.textContent =
        "Request failed. You can proceed with manual confirmation.";
      devInfoMeta.innerHTML = `<strong>Error:</strong> ${String(err)}`;
    });
}

// Enable/disable confirm based on completeness
function updateConfirmState() {
  const requiredFilled = [countryEl, cityEl, streetEl, houseEl, postEl].every(
    (el) => el.value.trim().length > 0
  );
  const btn = document.getElementById("submit-btn");
  btn.disabled = !requiredFilled;
  btn.setAttribute("aria-disabled", String(!requiredFilled));
}

// Update button state as user types
[countryEl, cityEl, streetEl, houseEl, postEl].forEach((el) => {
  el.addEventListener("input", updateConfirmState);
});

// Focus first missing field and hint manual path
function focusFirstMissing() {
  const order = [streetEl, houseEl, postEl, cityEl, countryEl];
  const target = order.find((el) => !el.value.trim());
  (target || streetEl).focus();
}

// Compute guidance message based on match level
function computeGuidance(p) {
  const level = matchLevel(p);
  if (level === "building") {
    return "Review and confirm your address before continuing.";
  }
  if (level === "street") {
    return "Street-level match — please add house number and postcode, then review and confirm.";
  }
  if (level === "ambiguous") {
    return "Ambiguous match — please review all fields and correct if needed.";
  }
  // city-level or unknown
  return "City-level match — please specify street, house number and postcode, then review and confirm.";
}

// Determine match level using Geoapify properties
function matchLevel(p) {
  const rank = p.rank || {};
  const hasStreet = !!p.street;
  const hasHouse = !!p.housenumber;
  const conf =
    typeof rank.confidence === "number" ? rank.confidence : undefined;
  const streetLevel = rank.confidence_street_level === 1 || hasStreet;

  if (conf !== undefined && conf < 0.5) return "ambiguous";
  if (hasHouse && conf === 1) return "building";
  if (streetLevel) return "street";
  return "city";
}

function setMatchBadge(p) {
  const level = matchLevel(p);
  const labelMap = {
    building: "Building-level match",
    street: "Street-level match",
    city: "City-level match",
    ambiguous: "Ambiguous match"
  };
  matchBadge.className = "match-badge";
  matchBadge.hidden = false;
  matchBadge.textContent = labelMap[level] || "Match level";
  matchBadge.classList.add(
    level === "building"
      ? "is-building"
      : level === "street"
      ? "is-street"
      : level === "ambiguous"
      ? "is-ambiguous"
      : "is-city"
  );
}