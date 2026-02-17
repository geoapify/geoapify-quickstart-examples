// Static Map Route Preview Demo
// This demo shows how to render a route on a static map image

// API Key - Get your own at https://myprojects.geoapify.com
const apiKey = "e95f313d38334f9f955e65b71a289126";

// Waypoints: Munich to Berlin
const waypoints = "48.1351,11.5820|52.5200,13.4050";

// Routing API URL
const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=${apiKey}`;

// Static Maps API URL
const staticMapUrl = `https://maps.geoapify.com/v1/staticmap?apiKey=${apiKey}`;

// DOM elements
const generateBtn = document.getElementById("generate-btn");
const statusEl = document.getElementById("status");
const imageContainer = document.getElementById("image-container");
const requestDetails = document.getElementById("request-details");

// Generate route preview when button is clicked
generateBtn.addEventListener("click", generateRoutePreview);

async function generateRoutePreview() {
  generateBtn.disabled = true;
  statusEl.textContent = "Fetching route...";
  statusEl.className = "status loading";

  try {
    // Step 1: Fetch the route from Routing API
    const routeResponse = await fetch(routingUrl);
    if (!routeResponse.ok) {
      throw new Error(`Routing API error: ${routeResponse.status}`);
    }

    const routeData = await routeResponse.json();
    if (!routeData.features || routeData.features.length === 0) {
      throw new Error("No route found");
    }

    const route = routeData.features[0];
    statusEl.textContent = "Generating static map...";

    // Step 2: Generate static map with route
    await getMapPreview(route);

    statusEl.textContent = "Route preview generated!";
    statusEl.className = "status success";

  } catch (error) {
    console.error("Error:", error);
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.className = "status error";
  } finally {
    generateBtn.disabled = false;
  }
}

// Generate static map preview using POST request
function getMapPreview(geojson) {
  return new Promise((resolve, reject) => {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    // Style the route line
    geojson.properties.linecolor = "#6699ff";
    geojson.properties.linewidth = "5";

    // Build the request parameters
    const params = {
      style: "osm-bright",
      width: 800,
      height: 400,
      scaleFactor: 2,  // Higher resolution for retina displays
      geojson: geojson,
      markers: geojson.properties.waypoints.map((waypoint) => {
        return {
          lat: waypoint.location[1],
          lon: waypoint.location[0],
          color: "#ff0000",
          size: "medium",
          type: "awesome"
        };
      })
    };

    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify(params),
      redirect: "follow"
    };

    // Display the actual request that will be sent
    displayRequestDetails(params);

    // Fetch the static map image
    fetch(staticMapUrl, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Static Maps API error: ${response.status}`);
        }
        return response.blob();
      })
      .then((blob) => {
        // Convert blob to data URL for display
        const reader = new FileReader();
        reader.onload = function () {
          // Display route info
          const distance = (geojson.properties.distance / 1000).toFixed(1);
          const time = Math.round(geojson.properties.time / 60);

          imageContainer.innerHTML = `
            <div style="width: 100%;">
              <div class="route-info">
                <div class="route-info-item">
                  <div class="label">Distance</div>
                  <div class="value">${distance} km</div>
                </div>
                <div class="route-info-item">
                  <div class="label">Duration</div>
                  <div class="value">${time} min</div>
                </div>
                <div class="route-info-item">
                  <div class="label">Waypoints</div>
                  <div class="value">${geojson.properties.waypoints.length}</div>
                </div>
              </div>
              <img src="${this.result}" alt="Route Preview Map" />
            </div>
          `;
          resolve();
        };
        reader.onerror = function () {
          reject(new Error("Failed to read image data"));
        };
        reader.readAsDataURL(blob);
      })
      .catch((error) => {
        console.error("Static map error:", error);
        reject(error);
      });
  });
}

function displayRequestDetails(params) {
  // Clone the actual params to avoid modifying the original
  const requestBody = JSON.parse(JSON.stringify(params));
  
  // Truncate the coordinates array to show first 10 and last 1
  if (requestBody.geojson.geometry.coordinates && 
      requestBody.geojson.geometry.coordinates[0] && 
      requestBody.geojson.geometry.coordinates[0].length > 15) {
    
    const coords = requestBody.geojson.geometry.coordinates[0];
    const totalPoints = coords.length;
    const first10 = coords.slice(0, 10);
    const last1 = coords.slice(-1);
    
    requestBody.geojson.geometry.coordinates[0] = [
      ...first10,
      `... ${totalPoints - 11} more coordinate pairs ...`,
      ...last1
    ];
  }

  // Only show the request body (the important part)
  requestDetails.innerHTML = `<code>${JSON.stringify(requestBody, null, 2)}</code>`;
}

