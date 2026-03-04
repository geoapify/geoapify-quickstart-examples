// Demo key for preview purposes only; create your own Geoapify key at https://www.geoapify.com/ for production usage.
const GEOAPIFY_API_KEY = "5402608de7c44a2d95121c407ad2110b";

const initialCoordinates = {
  lat: 45.42165612209891,
  lon: -83.81514880328274
};

// Initialise the MapLibre instance with Geoapify tiles so we can drop markers and overlays.
const map = new maplibregl.Map({
  container: "my-map",
  style:
    "https://maps.geoapify.com/v1/styles/klokantech-basic/style.json?apiKey=" +
    GEOAPIFY_API_KEY,
  center: [initialCoordinates.lon, initialCoordinates.lat],
  zoom: 18,
  attributionControl: true
});

map.addControl(new maplibregl.NavigationControl(), "top-right");

const statusBanner = document.getElementById("status-banner");
const statusTitle = document.getElementById("status-title");
const statusMessage = document.getElementById("status-message");

// Track markers and rendered geometries so each click can add to the existing collection.
const markers = [];
const geometryFeatures = [];
const accentPalette = [
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899"
];

function getRandomAccentColor() {
  return accentPalette[Math.floor(Math.random() * accentPalette.length)];
}

function toggleStatus({ visible, title = "", message = "" }) {
  if (visible) {
    statusTitle.textContent = title;
    statusMessage.textContent = message;
    statusBanner.hidden = false;
  } else {
    statusTitle.textContent = "";
    statusMessage.textContent = "";
    statusBanner.hidden = true;
  }
}

// Build a Geoapify marker icon URL with the proper colour/icon pairing.
function buildIconUrl({ color, icon, iconType }) {
  const base = "https://api.geoapify.com/v2/icon/";
  const params = new URLSearchParams({
    type: "awesome",
    color,
    icon,
    iconType,
    shadow: "true",
    scaleFactor: "2",
    apiKey: GEOAPIFY_API_KEY
  });

  if (!icon) {
    params.delete("icon");
    params.delete("iconType");
  }

  return `${base}?${params.toString()}`;
}

// Wrap the Geoapify icon inside a div so MapLibre can mount it as a DOM marker.
function createMarkerElement(markerStyle) {
  const wrapper = document.createElement("div");
  wrapper.className = "map-marker";

  const icon = document.createElement("img");
  icon.alt = "Custom map marker";
  icon.src = buildIconUrl(markerStyle);
  wrapper.appendChild(icon);
  return wrapper;
}

// Geoapify sometimes returns centroid coordinates, otherwise fall back to geometry vertices.
function getFeatureCoordinates(feature) {
  if (feature?.properties?.lon && feature?.properties?.lat) {
    return [feature.properties.lon, feature.properties.lat];
  }

  const [firstRing] = feature?.geometry?.coordinates ?? [];
  const [lng, lat] = firstRing?.[0] ?? [];
  return [lng, lat];
}

function formatPhone(value) {
  return value ? `<a href="tel:${value}">${value}</a>` : "";
}

function formatEmail(value) {
  return value ? `<a href="mailto:${value}">${value}</a>` : "";
}

// Assemble popup HTML only with fields that exist on the place details response.
function createPopupContent(feature) {
  const props = feature.properties ?? {};
  const detailItems = [];

  if (props.categories?.length) {
    detailItems.push(`
            <dt>Category</dt>
            <dd>${props.categories.join(", ")}</dd>
        `);
  }

  if (props.opening_hours) {
    detailItems.push(`
            <dt>Opening hours</dt>
            <dd>${props.opening_hours}</dd>
        `);
  }

  const phoneMarkup = formatPhone(props.contact?.phone);
  if (phoneMarkup) {
    detailItems.push(`
            <dt>Contact phone</dt>
            <dd>${phoneMarkup}</dd>
        `);
  }

  const emailMarkup = formatEmail(props.contact?.email);
  if (emailMarkup) {
    detailItems.push(`
            <dt>Contact email</dt>
            <dd>${emailMarkup}</dd>
        `);
  }

  const detailsMarkup = detailItems.length
    ? `
          <dl>
            ${detailItems.join("")}
          </dl>
        `
    : "";

  const addressLine = props.address_line2 ?? props.formatted ?? "";
  const addressMarkup = addressLine ? `<p>${addressLine}</p>` : "";

  return `
        <article class="popup-content">
          <h2>${props.address_line1 ?? "Unknown place"}</h2>
          ${addressMarkup}
          ${detailsMarkup}
        </article>
      `;
}

// Decide icon + colour by matching the place categories to a small icon catalogue.
function resolveMarkerStyle(feature) {
  const props = feature.properties ?? {};
  const categories = (props.categories ?? []).map((value) =>
    value.toLowerCase()
  );
  const primaryCategory = categories.find(Boolean) ?? "";

  const iconCatalog = [
    {
      icon: "local_florist",
      color: "#ec4899",
      iconType: "material",
      matches: () =>
        props.commercial?.type === "florist" ||
        categories.includes("commercial.florist")
    },
    {
      icon: "restaurant",
      color: "#f97316",
      iconType: "material",
      matches: () =>
        categories.some(
          (value) => value.includes("restaurant") || value.includes("cafe")
        )
    },
    {
      icon: "local_mall",
      color: "#6366f1",
      iconType: "material",
      matches: () => categories.some((value) => value.includes("shopping"))
    },
    {
      icon: "museum",
      color: "#0ea5e9",
      iconType: "material",
      matches: () =>
        categories.some(
          (value) => value.includes("museum") || value.includes("art")
        )
    },
    {
      icon: "park",
      color: "#22c55e",
      iconType: "material",
      matches: () =>
        categories.some(
          (value) => value.includes("park") || value.includes("garden")
        )
    },
    {
      icon: "hotel",
      color: "#8b5cf6",
      iconType: "material",
      matches: () =>
        categories.some(
          (value) => value.includes("hotel") || value.includes("lodging")
        )
    },
    {
      icon: "local_pharmacy",
      color: "#ef4444",
      iconType: "material",
      matches: () =>
        categories.some(
          (value) => value.includes("pharmacy") || value.includes("clinic")
        )
    }
  ];

  const accentColor = getRandomAccentColor();
  const matchedIcon = iconCatalog.find((entry) => entry.matches());

  if (matchedIcon) {
    return {
      accentColor: matchedIcon.color,
      color: matchedIcon.color,
      icon: matchedIcon.icon,
      iconType: matchedIcon.iconType,
      category: primaryCategory
    };
  }

  return {
    accentColor,
    color: accentColor,
    icon: primaryCategory.includes("building") ? "corporate_fare" : undefined,
    iconType: "material",
    category: primaryCategory
  };
}

// Drop a marker, wire up its popup, and persist any geometry overlays.
function renderMarker(feature) {
  const markerStyle = resolveMarkerStyle(feature);
  const [lng, lat] = getFeatureCoordinates(feature);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    console.warn("Skipping marker: invalid coordinates", feature);
    return;
  }

  const markerElement = createMarkerElement(markerStyle);

  const popup = new maplibregl.Popup({
    offset: {
      top: [0, 0],
      bottom: [0, -45],
      left: [15, 0],
      right: [-15, 0],
      "top-left": [0, 0],
      "top-right": [0, 0],
      "bottom-left": [0, -45],
      "bottom-right": [0, -45]
    },
    focusAfterOpen: false
  }).setHTML(createPopupContent(feature));

  const marker = new maplibregl.Marker({
    element: markerElement,
    anchor: "bottom",
    offset: [0, 5]
  })
    .setLngLat([lng, lat])
    .setPopup(popup)
    .addTo(map);

  markers.push(marker);
  
  marker.togglePopup();
  appendGeometryFeature(feature, markerStyle.accentColor);
}

// Clone the feature so we can feed a combined GeoJSON source for fills/lines.
function appendGeometryFeature(feature, accentColor) {
  const geometryType = feature?.geometry?.type;
  if (!geometryType) {
    return;
  }

  const supportedTypes = [
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon"
  ];
  if (!supportedTypes.includes(geometryType)) {
    return;
  }

  const serialized = JSON.parse(JSON.stringify(feature));
  serialized.properties = {
    ...(serialized.properties ?? {}),
    styleColor: accentColor
  };

  geometryFeatures.push(serialized);
  updateGeometrySource();
}

// Refresh the shared GeoJSON source so the layers draw newly added geometries.
function updateGeometrySource() {
  const source = map.getSource("place-geometries");
  if (!source) {
    return;
  }

  source.setData({
    type: "FeatureCollection",
    features: geometryFeatures
  });
}

async function fetchPlaceDetails({ lon, lat }) {
  const params = new URLSearchParams({
    lon: lon.toString(),
    lat: lat.toString(),
    apiKey: GEOAPIFY_API_KEY
  });

  const url = `https://api.geoapify.com/v2/place-details?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Geoapify request failed with ${response.status}`);
  }

  const data = await response.json();
  const [feature] = data.features ?? [];

  if (!feature) {
    throw new Error("No place details available for this location.");
  }

  return feature;
}

async function addMarkerForCoordinates(lon, lat, label = "") {
  try {
    const baseMessage = `Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
    toggleStatus({
      visible: true,
      title: "Fetching place details…",
      message: baseMessage
    });

    const feature = await fetchPlaceDetails({ lon, lat });

    renderMarker(feature);

    toggleStatus({
      visible: true,
      title: label || "Last location",
      message: baseMessage
    });
  } catch (error) {
    console.error(error);
    toggleStatus({
      visible: true,
      title: "Could not load details",
      message: error.message ?? "Unknown error occurred."
    });
    return;
  }
}

map.on("load", () => {
  map.addSource("place-geometries", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: []
    }
  });

  map.addLayer({
    id: "place-geometries-fill",
    type: "fill",
    source: "place-geometries",
    filter: [
      "match",
      ["geometry-type"],
      ["Polygon", "MultiPolygon"],
      true,
      false
    ],
    paint: {
      "fill-color": ["get", "styleColor"],
      "fill-opacity": 0.25
    }
  });

  map.addLayer({
    id: "place-geometries-line",
    type: "line",
    source: "place-geometries",
    filter: [
      "match",
      ["geometry-type"],
      ["LineString", "MultiLineString", "Polygon", "MultiPolygon"],
      true,
      false
    ],
    paint: {
      "line-color": ["get", "styleColor"],
      "line-width": 3
    }
  });

  addMarkerForCoordinates(
    initialCoordinates.lon,
    initialCoordinates.lat,
    "Place details"
  );
});

map.on("click", (event) => {
  if (event.originalEvent?.target.closest(".map-marker")) {
    return; // ignore clicks coming from existing markers
  }

  const { lng, lat } = event.lngLat.wrap();
  addMarkerForCoordinates(lng, lat, "Place details");
});