/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// Structured address inputs removed for a simpler, places-focused demo

// Places input with built-in places list functionality
const placesInput = new autocomplete.GeocoderAutocomplete(
  document.getElementById("places"),
  yourAPIKey,
  {
    placeholder: "Search places or categories...",
    addCategorySearch: true,
    showPlacesList: true,
    enablePlacesLazyLoading: true,
    limit: 8,
    skipIcons: false
  }
);

const resultEl = document.getElementById("result");
const resultExtraEl = document.getElementById("result-extra");

placesInput.on("places", (places) => {
  console.log(`Found ${places.length} places`);
});

// Handle individual place selection from places list
placesInput.on("place_select", (place, index) => {
  showPlace(place);
  const exitCategory = document.getElementById("close-on-select")?.checked;
  if (exitCategory) {
    placesInput.clearCategory();
    const formatted =
      place?.properties?.formatted || place?.properties?.address_line1 || "";
    if (formatted) {
      placesInput.setValue(formatted);
    }
  }
});

// Handle regular select event for places (when selecting from dropdown)
placesInput.on("select", (place) => {
  if (place && place.properties) {
    showPlace(place);
  }
});

function showPlace(place) {
  if (!place || !place.properties) return;
  const p = place.properties;
  const formatted =
    p.formatted ||
    [p.address_line1, p.address_line2].filter(Boolean).join(", ");
  const coords =
    p.lat != null && p.lon != null
      ? `${p.lat.toFixed ? p.lat.toFixed(6) : p.lat}, ${
          p.lon.toFixed ? p.lon.toFixed(6) : p.lon
        }`
      : "—";
  const cats = p.categories
    ? Array.isArray(p.categories)
      ? p.categories.join(", ")
      : String(p.categories)
    : p.category || "";
  resultEl.innerHTML = `
          <strong>${place.properties.address_line1}</strong><br>
          ${place.properties.address_line2 || ""}<br>
          <span style="font-size:12px;color:#6b7a90;">Coords: ${coords}${
    cats ? ` • Categories: ${cats}` : ""
  }</span>
        `;
  resultExtraEl.textContent = p.website ? `Website: ${p.website}` : "";
}

// Handle category clearing for places
placesInput.on("clear", (context) => {
  if (context !== "category") {
    resultEl.innerHTML = "none";
    resultExtraEl.textContent = "";
  }
});

// Loading spinner functionality
function showSpinner(container) {
  let spinner = container.querySelector(".loading-spinner");
  if (!spinner) {
    spinner = document.createElement("div");
    spinner.className = "loading-spinner";
    container.appendChild(spinner);
  }
  spinner.style.display = "block";
}

function hideSpinner(container) {
  const spinner = container.querySelector(".loading-spinner");
  if (spinner) {
    spinner.style.display = "none";
  }
}

// Add spinner events to all autocomplete inputs
function addSpinnerEvents(autocompleteInput, containerClass) {
  const container = document.querySelector(containerClass);

  // Show spinner when request starts
  autocompleteInput.on("request_start", (query) => {
    console.log("Request started for:", query);
    showSpinner(container);
  });

  // Hide spinner when request ends (success or failure)
  autocompleteInput.on("request_end", (success, data, error) => {
    console.log(
      "Request ended:",
      success ? "Success" : "Failed",
      success ? data : error
    );
    hideSpinner(container);

    // Optional: Show error message for failed requests
    if (!success && error && !error.canceled) {
      console.warn("Geocoding request failed:", error);
    }
  });

  // Add places-specific loading events
  autocompleteInput.on("places_request_start", (category) => {
    console.log("Loading places for category:", category);
    showSpinner(container);
  });

  autocompleteInput.on("places_request_end", (success, data, error) => {
    console.log(
      "Places request ended:",
      success ? "Success" : "Failed",
      success ? data : error
    );
    hideSpinner(container);

    if (!success && error && !error.canceled) {
      console.warn("Geocoding request failed:", error);
    }
  });
}

// Apply spinner events to all autocomplete inputs including places
addSpinnerEvents(placesInput, ".geoapify-input-wrapper");

function setTheme(themeName) {
  const themeLink = document.getElementById("geocoder-theme");
  themeLink.href = `https://cdn.jsdelivr.net/npm/@geoapify/geocoder-autocomplete@3.0.1/styles/${themeName}.css`;

  // Update body class for additional styling if needed
  document.body.className = document.body.className.replace(/theme-\w+/g, "");
  document.body.classList.add(`theme-${themeName}`);

  // Store theme preference in localStorage
  localStorage.setItem("geocoder-theme", themeName);
}

// Load saved theme on page load
function loadSavedTheme() {
  const savedTheme = localStorage.getItem("geocoder-theme") || "minimal";
  document.getElementById("theme-selector").value = savedTheme;
  setTheme(savedTheme);
}

// Initialize theme when page loads
window.addEventListener("load", loadSavedTheme);

// Address verification and structured fields removed in this simplified demo