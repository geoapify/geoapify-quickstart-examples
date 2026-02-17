// Route Elevation Profile Demo

// API Key
const apiKey = "e95f313d38334f9f955e65b71a289126";

// Waypoints: Munich to Berlin (long route to show elevation changes)
const waypoints = "48.1351,11.5820|52.5200,13.4050";

// Routing API URL - note: elevation=true is required for elevation data
const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&details=elevation&apiKey=${apiKey}`;

// DOM elements
const generateBtn = document.getElementById("generate-btn");
const statusEl = document.getElementById("status");
const chartContainer = document.getElementById("chart-container");
const dataStructureEl = document.getElementById("data-structure");

let chartInstance = null;

// Generate profile when button is clicked
generateBtn.addEventListener("click", generateElevationProfile);

async function generateElevationProfile() {
  generateBtn.disabled = true;
  statusEl.textContent = "Fetching route with elevation...";
  statusEl.className = "status loading";

  try {
    // Step 1: Fetch the route with elevation data
    const response = await fetch(routingUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      throw new Error("No route found");
    }

    const route = data.features[0];
    
    // Check if elevation data is available
    if (!route.properties.legs[0].elevation_range) {
      throw new Error("No elevation data available for this route");
    }

    statusEl.textContent = "Processing elevation data...";

    // Step 2: Extract and process elevation data
    const elevationData = calculateElevationProfileData(route);

    // Step 3: Draw the chart
    drawElevationProfile(route, elevationData);

    // Step 4: Display the raw data structure
    displayDataStructure(route, elevationData);

    statusEl.textContent = "Elevation profile generated!";
    statusEl.className = "status success";

  } catch (error) {
    console.error("Error:", error);
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.className = "status error";
  } finally {
    generateBtn.disabled = false;
  }
}

// Calculate elevation profile data
function calculateElevationProfileData(routeData) {
  const legElevations = [];

  // elevation_range contains pairs [distance, elevation] for every leg geometry point
  routeData.properties.legs.forEach(leg => {
    if (leg.elevation_range) {
      legElevations.push(leg.elevation_range);
    } else {
      legElevations.push([]);
    }
  });

  let labels = [];
  let data = [];

  // Combine elevation data from all legs
  legElevations.forEach((legElevation, index) => {
    let previousLegsDistance = 0;
    for (let i = 0; i <= index - 1; i++) {
      previousLegsDistance += legElevations[i][legElevations[i].length - 1][0];
    }

    labels.push(...legElevation.map(elevationData => elevationData[0] + previousLegsDistance));
    data.push(...legElevation.map(elevationData => elevationData[1]));
  });

  // Optimize array size to avoid performance problems
  const labelsOptimized = [];
  const dataOptimized = [];
  const minDist = 5; // 5m
  const minHeight = 10; // ~10m

  labels.forEach((dist, index) => {
    if (index === 0 || index === labels.length - 1 ||
        (dist - labelsOptimized[labelsOptimized.length - 1]) > minDist ||
        Math.abs(data[index] - dataOptimized[dataOptimized.length - 1]) > minHeight) {
      labelsOptimized.push(dist);
      dataOptimized.push(data[index]);
    }
  });

  return {
    data: dataOptimized,
    labels: labelsOptimized,
    originalDataPoints: labels.length,
    optimizedDataPoints: labelsOptimized.length
  };
}

// Draw elevation profile using Chart.js
function drawElevationProfile(routeData, elevationData) {
  // Destroy existing chart if any
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Clear placeholder
  chartContainer.innerHTML = '<canvas id="elevation-chart"></canvas>';
  
  const ctx = document.getElementById("elevation-chart").getContext("2d");
  
  const chartData = {
    labels: elevationData.labels,
    datasets: [{
      data: elevationData.data,
      fill: true,
      borderColor: '#66ccff',
      backgroundColor: '#66ccff66',
      tension: 0.1,
      pointRadius: 0,
      spanGaps: true
    }]
  };

  const config = {
    type: 'line',
    data: chartData,
    plugins: [{
      beforeInit: (chart) => {
        const maxHeight = Math.max(...chart.data.datasets[0].data);
        chart.options.scales.x.min = Math.min(...chart.data.labels);
        chart.options.scales.x.max = Math.max(...chart.data.labels);
        chart.options.scales.y.max = maxHeight + Math.round(maxHeight * 0.2);
      }
    }],
    options: {
      animation: false,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Distance (m)'
          }
        },
        y: {
          type: 'linear',
          beginAtZero: true,
          title: {
            display: true,
            text: 'Elevation (m)'
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Distance, m / Elevation, m',
          align: 'end'
        },
        legend: {
          display: false
        },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: (tooltipItems) => {
              return `Distance: ${tooltipItems[0].label}m`;
            },
            label: (tooltipItem) => {
              return `Elevation: ${tooltipItem.raw}m`;
            },
          }
        }
      }
    }
  };

  chartInstance = new Chart(ctx, config);
}

function displayDataStructure(route, elevationData) {
  // Show the actual API response structure with elevation data
  const leg = route.properties.legs[0];
  
  const elevationSample = {
    features: [{
      properties: {
        distance: route.properties.distance,
        time: route.properties.time,
        legs: [{
          elevation_range: [
            ...leg.elevation_range.slice(0, 5),
            `... ${leg.elevation_range.length - 10} more points ...`,
            ...leg.elevation_range.slice(-5)
          ]
        }]
      }
    }]
  };

  dataStructureEl.innerHTML = `<code>${JSON.stringify(elevationSample, null, 2)}</code>`;
}

