/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// The Leaflet map Object
const map = L.map("map", { zoomControl: false }).setView(
  [38.908838755401035, -77.02346458179596],
  12
);

// Retina displays require different mat tiles quality
const isRetina = L.Browser.retina;

// Map tile configurations for different themes
const mapTiles = {
  light: {
    baseUrl:
      "https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey={apiKey}",
    retinaUrl:
      "https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}@2x.png?apiKey={apiKey}",
    attribution:
      'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" rel="nofollow" target="_blank">© OpenStreetMap</a> contributors'
  },
  dark: {
    baseUrl:
      "https://maps.geoapify.com/v1/tile/dark-matter-brown/{z}/{x}/{y}.png?apiKey={apiKey}",
    retinaUrl:
      "https://maps.geoapify.com/v1/tile/dark-matter-brown/{z}/{x}/{y}@2x.png?apiKey={apiKey}",
    attribution:
      'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" rel="nofollow" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" rel="nofollow" target="_blank">© OpenStreetMap</a> contributors'
  }
};

let currentTileLayer;

// Function to switch map theme
function switchMapTheme(themeName) {
  console.log("Switching map theme to:", themeName);

  // Remove current tile layer
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer);
  }

  // Determine if it's a dark theme
  const isDarkTheme = themeName.includes("dark");
  const tileConfig = isDarkTheme ? mapTiles.dark : mapTiles.light;

  console.log("Using tiles:", isDarkTheme ? "dark" : "light");

  // Add new tile layer
  currentTileLayer = L.tileLayer(
    isRetina ? tileConfig.retinaUrl : tileConfig.baseUrl,
    {
      attribution: tileConfig.attribution,
      apiKey: yourAPIKey,
      maxZoom: 20,
      id: isDarkTheme ? "dark-matter-brown" : "osm-bright"
    }
  ).addTo(map);
}

// Initialize with light theme
switchMapTheme("minimal");

// add a zoom control to bottom-right corner
L.control
  .zoom({
    position: "bottomright"
  })
  .addTo(map);

// check the available autocomplete options on the https://www.npmjs.com/package/@geoapify/geocoder-autocomplete
const autocompleteInput = new autocomplete.GeocoderAutocomplete(
  document.getElementById("autocomplete"),
  yourAPIKey,
  {
    /* Geocoder options */
  }
);

// generate an marker icon with https://apidocs.geoapify.com/playground/icon
const markerIcon = L.icon({
  iconUrl: `https://api.geoapify.com/v1/icon/?type=awesome&color=%232ea2ff&size=large&scaleFactor=2&apiKey=${yourAPIKey}`,
  iconSize: [38, 56], // size of the icon
  iconAnchor: [19, 51], // point of the icon which will correspond to marker's location
  popupAnchor: [0, -60] // point from which the popup should open relative to the iconAnchor
});

let marker;

autocompleteInput.on("select", (location) => {
  // Add marker with the selected location
  if (marker) {
    marker.remove();
  }

  if (location) {
    marker = L.marker([location.properties.lat, location.properties.lon], {
      icon: markerIcon
    }).addTo(map);

    map.panTo([location.properties.lat, location.properties.lon]);
  }
});

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

  // Wait for CSS to load, then apply styles
  themeLink.onload = function () {
    if (themeName === "round-borders-dark") {
      setTimeout(applyRoundDarkStyles, 100); // Small delay to ensure CSS is applied
    }
  };

  // Store theme preference in localStorage
  localStorage.setItem("geocoder-theme", themeName);
}

function applyRoundDarkStyles() {
  // Find all autocomplete inputs and apply styles directly
  const inputs = document.querySelectorAll(".geoapify-autocomplete-input");
  inputs.forEach((input) => {
    input.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    input.style.borderColor = "rgba(255, 255, 255, 0.4)";
    console.log("Applied styles to input:", input);
  });

  console.log("Applied round-dark styles to", inputs.length, "inputs");
}

// Load saved theme on page load
function loadSavedTheme() {
  const savedTheme = localStorage.getItem("geocoder-theme") || "minimal";
  document.getElementById("theme-selector").value = savedTheme;
  setTheme(savedTheme);
}

// Initialize theme when page loads
window.addEventListener("load", loadSavedTheme);