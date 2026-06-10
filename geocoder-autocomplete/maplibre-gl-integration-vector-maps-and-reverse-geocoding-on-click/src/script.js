/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";
const markerShadowOffset = 5;

// Map style configurations for different themes
const mapStyles = {
  light: `https://maps.geoapify.com/v1/styles/osm-bright-grey/style.json?apiKey=${yourAPIKey}`,
  dark: `https://maps.geoapify.com/v1/styles/dark-matter-brown/style.json?apiKey=${yourAPIKey}`
};

// The MapLibre GL map object
const map = new maplibregl.Map({
  container: "map", // ID of the container element
  style: mapStyles.light, // Start with light theme
  center: [-77.02346458179596, 38.908838755401035], // Initial center [longitude, latitude]
  zoom: 12, // Initial zoom level
  maxZoom: 20 // Max zoom level
});

// Function to switch map theme
function switchMapTheme(themeName) {
  console.log("Switching map theme to:", themeName);

  // Determine if it's a dark theme
  const isDarkTheme = themeName.includes("dark");
  const newStyle = isDarkTheme ? mapStyles.dark : mapStyles.light;

  console.log("Using style:", isDarkTheme ? "dark" : "light");

  // Switch map style
  map.setStyle(newStyle);
}

// Re-add navigation control
map.addControl(new maplibregl.NavigationControl(), "bottom-right");

// check the available autocomplete options on the https://www.npmjs.com/package/@geoapify/geocoder-autocomplete
const autocompleteInput = new autocomplete.GeocoderAutocomplete(
  document.getElementById("autocomplete"),
  yourAPIKey,
  {
    /* Geocoder options */
  }
);

// Generate a marker icon with https://apidocs.geoapify.com/playground/icon
function createMarkerIcon() {
  const img = document.createElement("img");
  img.src = `https://api.geoapify.com/v2/icon/?type=awesome&color=%23ff5b5f&size=50&scaleFactor=2&apiKey=${yourAPIKey}`;
  img.style.width = "38px";
  img.style.height = "55px";
  return img;
}

let marker;

function updateSelection(location) {
  if (!location) {
    return;
  }

  if (marker) {
    marker.remove();
  }

  autocompleteInput.setValue(location.properties.formatted);
  marker = new maplibregl.Marker({
    element: createMarkerIcon(),
    anchor: "bottom",
    offset: [0, markerShadowOffset]
  })
    .setLngLat([location.properties.lon, location.properties.lat])
    .addTo(map);
}

autocompleteInput.on("select", (location) => {
  // Add marker with the selected location
  if (location) {
    updateSelection(location);
    map.jumpTo({
      center: [location.properties.lon, location.properties.lat],
      zoom: 14
    });
  }
});

// Add click event listener to the map
map.on("click", function (e) {
  const lat = e.lngLat.lat; // Get latitude from the click event
  const lon = e.lngLat.lng; // Get longitude from the click event

  // Call reverse geocoding for the clicked location
  getAddressByLatLon(lat, lon)
    .then((location) => {
      updateSelection(location);
    })
    .catch((error) => {
      console.error("Reverse geocoding failed:", error);
    });
});

function getAddressByLatLon(lat, lon) {
  return fetch(
    `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${yourAPIKey}`
  )
    .then((result) => {
      if (!result.ok) {
        throw new Error(`Reverse geocoding request failed with status ${result.status}`);
      }

      return result.json();
    })
    .then((result) => {
      if (result && result.features && result.features.length) {
        return result.features[0];
      }

      return null;
    });
}

// Wait for DOM to be ready, then override the setTheme function
document.addEventListener("DOMContentLoaded", function () {
  // Override the setTheme function to also switch map theme
  const originalSetTheme = window.setTheme;
  if (originalSetTheme) {
    window.setTheme = function (themeName) {
      console.log("Theme changed to:", themeName);
      // Call the original setTheme function
      originalSetTheme(themeName);

      // Switch map theme
      switchMapTheme(themeName);
    };
  }
});

function setTheme(themeName) {
  const themeLink = document.getElementById("geocoder-theme");
  themeLink.href = `https://cdn.jsdelivr.net/npm/@geoapify/geocoder-autocomplete@3.0.1/styles/${themeName}.css`;

  // Update body class for additional styling if needed
  document.body.className = document.body.className.replace(/theme-\w+/g, "");
  document.body.classList.add(`theme-${themeName}`);

  // Debug: log the current theme and body classes
  console.log("Theme changed to:", themeName);
  console.log("Body classes:", document.body.className);
  console.log("Theme class added:", `theme-${themeName}`);

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
