// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// Benefits: usage analytics, project-level limits, and reliable access for production use.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const map = L.map("my-map").setView([40.760189, -111.892655], 12);

const isRetina = L.Browser.retina;
const baseUrl = "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}.png?apiKey={apiKey}";
const retinaUrl = "https://maps.geoapify.com/v1/tile/osm-bright-grey/{z}/{x}/{y}@2x.png?apiKey={apiKey}";

L.tileLayer(isRetina ? retinaUrl : baseUrl, {
  attribution:
    'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | <a href="https://openmaptiles.org/" target="_blank">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a> contributors',
  apiKey: yourAPIKey,
  maxZoom: 20
}).addTo(map);

function priorityToColor(priority) {
  const value = Math.max(0, Math.min(1, priority));
  const stops = [
    { value: 0, color: { r: 39, g: 174, b: 96 } },
    { value: 0.33, color: { r: 242, g: 201, b: 76 } },
    { value: 0.66, color: { r: 242, g: 153, b: 74 } },
    { value: 1, color: { r: 235, g: 87, b: 87 } }
  ];

  const endIndex = stops.findIndex((stop) => value <= stop.value);
  const end = stops[endIndex];
  const start = stops[Math.max(0, endIndex - 1)];
  const ratio = (value - start.value) / (end.value - start.value || 1);
  const r = Math.round(start.color.r + (end.color.r - start.color.r) * ratio);
  const g = Math.round(start.color.g + (end.color.g - start.color.g) * ratio);
  const b = Math.round(start.color.b + (end.color.b - start.color.b) * ratio);

  return `#${[r, g, b].map((color) => color.toString(16).padStart(2, "0")).join("")}`;
}

function priorityToLabel(priority) {
  if (priority >= 0.85) {
    return "Critical";
  }

  if (priority >= 0.66) {
    return "High";
  }

  if (priority >= 0.33) {
    return "Medium";
  }

  return "Low";
}

function priorityToMarkerContent(priority) {
  return String(Math.round(priority * 100));
}

const locations = [
  {
    title: "Emergency response",
    priority: 1,
    description: "Immediate response required at the downtown transit center.",
    coordinates: [40.761935, -111.888201]
  },
  {
    title: "Medical support",
    priority: 0.96,
    description: "Medical support team requested near the convention district.",
    coordinates: [40.768443, -111.895013]
  },
  {
    title: "Road closure",
    priority: 0.88,
    description: "Main Street is blocked near the public library.",
    coordinates: [40.767576, -111.899466]
  },
  {
    title: "Signal failure",
    priority: 0.82,
    description: "Traffic signal timing is failing at a major intersection.",
    coordinates: [40.758121, -111.904513]
  },
  {
    title: "Power outage",
    priority: 0.76,
    description: "Traffic signals are offline near the central business district.",
    coordinates: [40.755394, -111.884318]
  },
  {
    title: "Water leak",
    priority: 0.71,
    description: "Utility crew needed for a reported leak near the courthouse.",
    coordinates: [40.764781, -111.879892]
  },
  {
    title: "Access blocked",
    priority: 0.67,
    description: "Service vehicle access is blocked by temporary construction.",
    coordinates: [40.747512, -111.902208]
  },
  {
    title: "Delivery delay",
    priority: 0.58,
    description: "Warehouse loading bay is operating with reduced capacity.",
    coordinates: [40.750779, -111.891047]
  },
  {
    title: "Equipment issue",
    priority: 0.53,
    description: "Field equipment requires replacement before the next shift.",
    coordinates: [40.756917, -111.870943]
  },
  {
    title: "Customer callback",
    priority: 0.49,
    description: "Customer requested a same-day callback from dispatch.",
    coordinates: [40.767942, -111.861851]
  },
  {
    title: "Crew dispatch",
    priority: 0.44,
    description: "Field crew requested for a scheduled maintenance task.",
    coordinates: [40.773845, -111.872504]
  },
  {
    title: "Route adjustment",
    priority: 0.39,
    description: "Driver route needs a minor adjustment due to congestion.",
    coordinates: [40.779026, -111.889102]
  },
  {
    title: "Pickup confirmation",
    priority: 0.34,
    description: "Confirm pickup window with the site coordinator.",
    coordinates: [40.739883, -111.889981]
  },
  {
    title: "Inspection point",
    priority: 0.28,
    description: "Routine equipment check scheduled for this afternoon.",
    coordinates: [40.759949, -111.872383]
  },
  {
    title: "Permit check",
    priority: 0.24,
    description: "Verify site permit details before work starts tomorrow.",
    coordinates: [40.752419, -111.916017]
  },
  {
    title: "Inventory count",
    priority: 0.19,
    description: "Count stored materials at the temporary staging area.",
    coordinates: [40.781924, -111.906431]
  },
  {
    title: "Supplies pickup",
    priority: 0.14,
    description: "Pickup point for non-urgent replacement parts.",
    coordinates: [40.744671, -111.879911]
  },
  {
    title: "Signage review",
    priority: 0.09,
    description: "Review temporary signage placement for next week's event.",
    coordinates: [40.769431, -111.925236]
  },
  {
    title: "Parking note",
    priority: 0.04,
    description: "Record parking availability near the service entrance.",
    coordinates: [40.735612, -111.905471]
  },
  {
    title: "Watch area",
    priority: 0,
    description: "No action needed yet; keep this location on the watch list.",
    coordinates: [40.770832, -111.912092]
  }
];

function buildMarkerIconUrl(priority) {
  const params = new URLSearchParams({
    type: "awesome",
    color: priorityToColor(priority),
    size: "60",
    icon: "flag",
    content: priorityToMarkerContent(priority),
    contentSize: "18",
    contentColor: "#ffffff"
  });

  return `https://api.geoapify.com/v2/icon/?${params.toString()}&noWhiteCircle&scaleFactor=2&apiKey=${encodeURIComponent(yourAPIKey)}`;
}

function createPriorityIcon(priority) {
  return L.icon({
    iconUrl: buildMarkerIconUrl(priority),
    // Generated icon is 46x67px; the bottom 7px are shadow, so anchor at the marker tip above it.
    iconSize: [46, 67],
    iconAnchor: [23, 60],
    popupAnchor: [0, -60]
  });
}

function createPopupContent(location) {
  const priorityPercent = priorityToMarkerContent(location.priority);
  const priorityLabel = priorityToLabel(location.priority);

  return `
    <article class="popup-content">
      <h2>${location.title}</h2>
      <p><strong>${priorityPercent} - ${priorityLabel} priority</strong></p>
      <p>${location.description}</p>
    </article>
  `;
}

function renderPriorityList(locations, markers) {
  const list = document.getElementById("priority-list");

  locations.forEach((location, index) => {
    const priorityPercent = priorityToMarkerContent(location.priority);
    const priorityLabel = priorityToLabel(location.priority);
    const marker = markers[index];
    const item = document.createElement("li");
    item.className = "priority-item";
    item.innerHTML = `
      <img class="priority-marker" src="${buildMarkerIconUrl(location.priority)}" alt="${priorityPercent} priority marker">
      <span>
        <strong>${location.title}</strong>
        <span>${priorityPercent} - ${priorityLabel} priority</span>
      </span>
    `;

    item.addEventListener("mouseenter", () => {
      item.classList.add("is-active");
      marker.openPopup();
    });

    item.addEventListener("mouseleave", () => {
      item.classList.remove("is-active");
      marker.closePopup();
    });

    list.appendChild(item);
  });
}

const markerBounds = L.latLngBounds();
const markers = [];

locations.forEach((location) => {
  const marker = L.marker(location.coordinates, {
    icon: createPriorityIcon(location.priority),
    title: location.title
  })
    .bindPopup(createPopupContent(location))
    .addTo(map);

  markers.push(marker);
  markerBounds.extend(location.coordinates);
});

map.fitBounds(markerBounds, {
  padding: [48, 48],
  maxZoom: 14
});

renderPriorityList(locations, markers);
