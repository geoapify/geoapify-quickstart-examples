// Geoapify Routing API Demo
// This demo shows how to fetch a route with turn-by-turn directions

// API Key - Get your own at https://myprojects.geoapify.com
const apiKey = "e95f313d38334f9f955e65b71a289126";

// Waypoints: Munich to Berlin
// Format: lat,lon|lat,lon|...
const waypoints = "48.1351,11.5820|52.5200,13.4050";

// Build the Routing API URL
// Documentation: https://apidocs.geoapify.com/docs/routing/
const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&details=instruction_details&apiKey=${apiKey}`;

// DOM elements
const fetchBtn = document.getElementById("fetch-route-btn");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("route-summary");
const directionsEl = document.getElementById("directions-list");
const rawResponseEl = document.getElementById("raw-response");

// Fetch the route when button is clicked
fetchBtn.addEventListener("click", fetchRoute);

async function fetchRoute() {
  // Update UI state
  fetchBtn.disabled = true;
  statusEl.textContent = "Fetching route...";
  statusEl.className = "status loading";

  try {
    // Make the API request
    const response = await fetch(routingUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Check if we got a valid route
    if (!data.features || data.features.length === 0) {
      throw new Error("No route found");
    }

    // The route is the first feature in the GeoJSON response
    const route = data.features[0];

    // Display the results
    displaySummary(route);
    displayDirections(route);
    displayRawResponse(data);

    statusEl.textContent = "Route fetched successfully!";
    statusEl.className = "status success";
  } catch (error) {
    console.error("Error fetching route:", error);
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.className = "status error";
  } finally {
    fetchBtn.disabled = false;
  }
}

function displaySummary(route) {
  const props = route.properties;

  // Extract key information from the route
  const distance = props.distance; // in meters
  const time = props.time; // in seconds
  const legs = props.legs ? props.legs.length : 0;

  // Format distance
  const distanceKm = (distance / 1000).toFixed(1);
  const distanceMiles = (distance / 1609.34).toFixed(1);

  // Format time
  const hours = Math.floor(time / 3600);
  const minutes = Math.floor((time % 3600) / 60);
  const timeFormatted = hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  summaryEl.innerHTML = `
    <div class="summary-item">
      <div class="label">Total Distance</div>
      <div class="value">${distanceKm} km</div>
      <div class="label">(${distanceMiles} miles)</div>
    </div>
    <div class="summary-item">
      <div class="label">Estimated Time</div>
      <div class="value">${timeFormatted}</div>
    </div>
    <div class="summary-item">
      <div class="label">Route Legs</div>
      <div class="value">${legs}</div>
    </div>
    <div class="summary-item">
      <div class="label">Travel Mode</div>
      <div class="value">Drive</div>
    </div>
  `;
}

function displayDirections(route) {
  const props = route.properties;

  if (!props.legs || props.legs.length === 0) {
    directionsEl.innerHTML = '<p class="placeholder">No directions available</p>';
    return;
  }

  let html = "";
  let stepNumber = 1;

  // Loop through each leg (segment between waypoints)
  props.legs.forEach((leg, legIndex) => {
    if (!leg.steps) return;

    // Loop through each step in the leg
    leg.steps.forEach((step) => {
      const instruction = step.instruction;
      const distance = step.distance;
      const time = step.time;

      // Format step distance
      let distanceText = "";
      if (distance >= 1000) {
        distanceText = `${(distance / 1000).toFixed(1)} km`;
      } else {
        distanceText = `${Math.round(distance)} m`;
      }

      // Format step time
      let timeText = "";
      if (time >= 60) {
        timeText = `${Math.round(time / 60)} min`;
      } else {
        timeText = `${Math.round(time)} sec`;
      }

      html += `
        <div class="direction-step">
          <div class="step-number">${stepNumber}</div>
          <div class="step-content">
            <div class="step-instruction">${instruction.text}</div>
            <div class="step-meta">${distanceText} - ${timeText}</div>
          </div>
        </div>
      `;

      stepNumber++;
    });
  });

  directionsEl.innerHTML = html;
}

function displayRawResponse(data) {
  // Clone the actual response to avoid modifying the original
  const actualResponse = JSON.parse(JSON.stringify(data));
  
  // Truncate long arrays for readability
  actualResponse.features.forEach((feature) => {
    // Truncate geometry coordinates: show first 10 and last 1
    if (feature.geometry.coordinates && feature.geometry.coordinates[0]) {
      const coords = feature.geometry.coordinates[0];
      if (coords.length > 15) {
        const totalPoints = coords.length;
        const first10 = coords.slice(0, 10);
        const last1 = coords.slice(-1);
        
        feature.geometry.coordinates[0] = [
          ...first10,
          `... ${totalPoints - 11} more coordinate pairs ...`,
          ...last1
        ];
      }
    }
    
    // Truncate steps array: show first 10 and last 1
    if (feature.properties.legs) {
      feature.properties.legs.forEach((leg) => {
        if (leg.steps && leg.steps.length > 15) {
          const totalSteps = leg.steps.length;
          const first10 = leg.steps.slice(0, 10);
          const last1 = leg.steps.slice(-1);
          
          leg.steps = [
            ...first10,
            `... ${totalSteps - 11} more steps ...`,
            ...last1
          ];
        }
      });
    }
  });

  rawResponseEl.innerHTML = `<code>${JSON.stringify(actualResponse, null, 2)}</code>`;
}

