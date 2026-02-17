// Static Map Step Preview Demo
// This demo shows how to generate step-by-step preview images

// API Key
const apiKey = "e95f313d38334f9f955e65b71a289126";

// Waypoints: Munich to Berlin
const waypoints = "48.1351,11.5820|52.5200,13.4050";

// Routing API URL
const routingUrl = `https://api.geoapify.com/v1/routing?waypoints=${waypoints}&mode=drive&apiKey=${apiKey}`;

// DOM elements
const stepSelector = document.getElementById("step-selector");
const statusEl = document.getElementById("status");
const stepInfoEl = document.getElementById("step-info");
const imageContainer = document.getElementById("image-container");

let routeData = null;
let allSteps = [];

// Fetch the route on page load
window.addEventListener("load", fetchRoute);

async function fetchRoute() {
  statusEl.textContent = "Loading route...";
  statusEl.className = "status loading";

  try {
    const response = await fetch(routingUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      throw new Error("No route found");
    }

    routeData = data.features[0];
    
    // Collect all steps from all legs
    allSteps = [];
    routeData.properties.legs.forEach((leg, legIndex) => {
      if (leg.steps) {
        leg.steps.forEach((step, stepIndex) => {
          allSteps.push({
            leg: legIndex,
            step: stepIndex,
            data: step,
            instruction: step.instruction.text
          });
        });
      }
    });

    // Populate dropdown
    populateStepSelector();
    statusEl.textContent = `Route loaded with ${allSteps.length} steps`;
    statusEl.className = "status success";

  } catch (error) {
    console.error("Error:", error);
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.className = "status error";
  }
}

function populateStepSelector() {
  stepSelector.innerHTML = '<option value="">-- Select a step --</option>';
  
  allSteps.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${index + 1}. ${item.instruction}`;
    stepSelector.appendChild(option);
  });

  stepSelector.addEventListener("change", handleStepSelection);
}

function handleStepSelection(event) {
  const index = parseInt(event.target.value);
  if (isNaN(index)) {
    stepInfoEl.innerHTML = '';
    imageContainer.innerHTML = '<p class="placeholder">Select a step to see its preview</p>';
    return;
  }

  const selectedStep = allSteps[index];
  displayStepPreview(selectedStep, index);
}

function displayStepPreview(item, stepNumber) {
  const step = item.data;
  const legIndex = item.leg;

  // Get the turn coordinate
  const coordinates = routeData.geometry.coordinates[legIndex];
  const turnCoordinate = coordinates[step.from_index];
  
  // Check if it's a start or finish step
  const isStart = ["StartAt", "StartAtRight", "StartAtLeft"].includes(step.instruction.type);
  const isFinish = ["DestinationReached", "DestinationReachedRight", "DestinationReachedLeft"].includes(step.instruction.type);

  // Extract coordinate segments with direction arrow
  const past = getRelatedCoordinates(coordinates, step, 'past');
  const next = getRelatedCoordinates(coordinates, step, 'next');
  const maneuver = getRelatedCoordinates(coordinates, step, 'manoeuvre');
  const maneuverArrow = getRelatedCoordinates(coordinates, step, 'manoeuvre-arrow');

  // Build geometries array
  const geometries = [];
  
  if (!isStart) {
    geometries.push(`polyline:${past};linewidth:5;linecolor:${encodeURIComponent('#ad9aad')}`);
  }
  
  if (!isFinish) {
    geometries.push(`polyline:${next};linewidth:5;linecolor:${encodeURIComponent('#eb44ea')}`);
  }
  
  if (!isFinish) {
    geometries.push(`polyline:${maneuver};linewidth:7;linecolor:${encodeURIComponent('#333333')};lineopacity:1`);
    geometries.push(`polyline:${maneuver};linewidth:5;linecolor:${encodeURIComponent('#ffffff')};lineopacity:1`);
    geometries.push(`polygon:${maneuverArrow};linewidth:1;linecolor:${encodeURIComponent('#333333')};lineopacity:1;fillcolor:${encodeURIComponent('#ffffff')};fillopacity:1`);
  }

  // Calculate bearing (simplified)
  // Calculate bearing (add 180 to rotate map so we're looking forward)
  const bearing = calculateBearing(coordinates, step.from_index) + 180;

  // Build the image URL
  const markerCoordinates = `${turnCoordinate[0]},${turnCoordinate[1]}`;
  const icon = isFinish ? `&marker=lonlat:${markerCoordinates};type:material;color:%23539de4;icon:flag-checkered;icontype:awesome;whitecircle:no` : '';
  
  const imageUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=300&height=200&apiKey=${apiKey}&geometry=${geometries.join('|')}&center=lonlat:${markerCoordinates}&zoom=16&scaleFactor=2&bearing=${bearing}&pitch=45${icon}`;

  // Display step info
  const distance = step.distance >= 1000 
    ? `${(step.distance / 1000).toFixed(1)} km` 
    : `${Math.round(step.distance)} m`;
    
  stepInfoEl.innerHTML = `
    <div class="step-info-item">
      <div class="label">Step Number</div>
      <div class="value">${stepNumber + 1}</div>
    </div>
    <div class="step-info-item">
      <div class="label">Instruction</div>
      <div class="value">${step.instruction.text}</div>
    </div>
    <div class="step-info-item">
      <div class="label">Distance</div>
      <div class="value">${distance}</div>
    </div>
  `;

  // Display image with loading animation
  imageContainer.classList.add('loading');
  imageContainer.innerHTML = '';
  
  const img = new Image();
  img.onload = () => {
    imageContainer.classList.remove('loading');
    imageContainer.innerHTML = '';
    imageContainer.appendChild(img);
  };
  img.alt = `Step ${stepNumber + 1} preview`;
  img.src = imageUrl;
}

// Extract coordinates for different route segments
function getRelatedCoordinates(coordinatesArray, step, direction) {
  const currentIndex = step.from_index;
  const numberOfPoints = 20; // Number of points to include in each direction
  let coords;

  if (direction === 'past') {
    // Get coordinates before the turn (gray line)
    coords = getCoordinateSlice(coordinatesArray, currentIndex - numberOfPoints, currentIndex + 1);
    
  } else if (direction === 'next') {
    // Get coordinates after the turn (pink line)
    coords = getCoordinateSlice(coordinatesArray, currentIndex, currentIndex + numberOfPoints + 1);
    
  } else if (direction === 'manoeuvre') {
    // Get the maneuver segment (white line showing the turn)
    coords = getManeuverSegment(coordinatesArray, currentIndex, numberOfPoints);
    
  } else if (direction === 'manoeuvre-arrow') {
    // Create arrow polygon to show direction
    coords = createDirectionArrow(coordinatesArray, currentIndex, numberOfPoints);
  }

  // Convert coordinates to comma-separated string for API
  return coords ? coords.map(c => `${c[0]},${c[1]}`).join(",") : "";
}

// Helper: Get a slice of coordinates with bounds checking
function getCoordinateSlice(coords, start, end) {
  const safeStart = Math.max(0, start);
  const safeEnd = Math.min(coords.length, end);
  return coords.slice(safeStart, safeEnd);
}

// Helper: Get maneuver segment around the turn point
function getManeuverSegment(coords, turnIndex, range) {
  // Get a section of route around the turn
  const segment = getCoordinateSlice(coords, turnIndex - range, turnIndex + range + 1);
  
  // Clip to a 20-meter circle around the turn point
  const turnPoint = coords[turnIndex];
  const circle = turf.circle(turnPoint, 0.02); // 20 meters
  const bbox = turf.bbox(circle);
  
  let clipped = turf.bboxClip(turf.lineString(segment), bbox);
  
  // Handle MultiLineString result
  if (clipped.geometry.type === 'MultiLineString') {
    const centerPoint = turf.point(turnPoint);
    clipped = turf.lineString(
      clipped.geometry.coordinates.find(line => 
        turf.booleanContains(turf.lineString(line), centerPoint)
      )
    );
  }
  
  // Get segment up to 10 meters from the end for arrow placement
  const endPoint = clipped.geometry.coordinates[clipped.geometry.coordinates.length - 1];
  const smallCircle = turf.circle(endPoint, 0.01); // 10 meters
  const smallBbox = turf.bbox(smallCircle);
  
  let arrowSegment = turf.bboxClip(clipped, smallBbox);
  if (arrowSegment.geometry.type === 'MultiLineString') {
    arrowSegment = turf.lineString(arrowSegment.geometry.coordinates[arrowSegment.geometry.coordinates.length - 1]);
  }
  
  // Return the segment from start to arrow position
  if (clipped.geometry.coordinates.length && arrowSegment.geometry.coordinates.length) {
    const segment = turf.lineSlice(
      clipped.geometry.coordinates[0],
      arrowSegment.geometry.coordinates[0],
      clipped
    );
    return segment.geometry.coordinates;
  }
  
  return clipped.geometry.coordinates;
}

// Helper: Create an arrow polygon pointing in the direction of travel
function createDirectionArrow(coords, turnIndex, range) {
  // Get maneuver segment first
  const segment = getCoordinateSlice(coords, turnIndex - range, turnIndex + range + 1);
  const turnPoint = coords[turnIndex];
  
  // Clip to viewing area
  const circle = turf.circle(turnPoint, 0.02);
  const bbox = turf.bbox(circle);
  let clipped = turf.bboxClip(turf.lineString(segment), bbox);
  
  if (clipped.geometry.type === 'MultiLineString') {
    clipped = turf.lineString(
      clipped.geometry.coordinates.find(line =>
        turf.booleanContains(turf.lineString(line), turf.point(turnPoint))
      )
    );
  }
  
  // Get the end section for arrow
  const endPoint = clipped.geometry.coordinates[clipped.geometry.coordinates.length - 1];
  const smallCircle = turf.circle(endPoint, 0.01);
  const smallBbox = turf.bbox(smallCircle);
  
  let arrowBase = turf.bboxClip(clipped, smallBbox);
  if (arrowBase.geometry.type === 'MultiLineString') {
    arrowBase = turf.lineString(arrowBase.geometry.coordinates[arrowBase.geometry.coordinates.length - 1]);
  }
  
  // Calculate direction of arrow
  const startPoint = arrowBase.geometry.coordinates[0];
  const bearing = turf.bearing(startPoint, endPoint);
  
  // Create arrow triangle pointing forward
  // Arrow consists of: tip point, left wing, right wing, back to tip
  return [
    endPoint, // Arrow tip
    turf.destination(startPoint, 0.005, bearing + 90).geometry.coordinates, // Left wing
    turf.destination(startPoint, 0.005, bearing - 90).geometry.coordinates, // Right wing
    endPoint  // Close the polygon
  ];
}

function calculateBearing(coordinatesArray, currentIndex) {
  let currentCoordinate = coordinatesArray[currentIndex];
  let bearingCoordinateIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex + 1;
  let bearingCoordinate = coordinatesArray[bearingCoordinateIndex];

  while (true) {
    if (turf.length(turf.lineString([bearingCoordinate, currentCoordinate])) >= 0.005 /* 5 meters */) {
      break;
    }

    if (bearingCoordinateIndex === 0 || bearingCoordinateIndex === coordinatesArray.length - 1) {
      break;
    }

    bearingCoordinateIndex = currentIndex > 0 ? bearingCoordinateIndex - 1 : bearingCoordinateIndex + 1;
    bearingCoordinate = coordinatesArray[bearingCoordinateIndex];
  }
  
  return currentIndex > 0 
    ? turf.bearing(turf.point(currentCoordinate), turf.point(bearingCoordinate)) 
    : turf.bearing(turf.point(bearingCoordinate), turf.point(currentCoordinate));
}

