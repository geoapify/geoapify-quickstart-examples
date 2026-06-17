// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// This demo key can be blocked or restricted at any time.
const apiKey = "5402608de7c44a2d95121c407ad2110b";
const initialMapCenter = [-80.60447455917023, 28.07327131169214];
const restaurantIconCategories = {
  "burger": [
    "catering.restaurant.american",
    "catering.restaurant.burger"
  ],
  "pizza-slice": [
    "catering.restaurant.italian",
    "catering.restaurant.pizza"
  ],
  "sandwich": [
    "catering.restaurant.sandwich"
  ],
  "fish": [
    "catering.restaurant.fish",
    "catering.restaurant.fish_and_chips",
    "catering.restaurant.japanese",
    "catering.restaurant.sushi"
  ],
  "shrimp": [
    "catering.restaurant.seafood",
    "catering.restaurant.friture",
    "catering.restaurant.spanish",
    "catering.restaurant.tapas"
  ],
  "drumstick-bite": [
    "catering.restaurant.chicken",
    "catering.restaurant.kebab",
    "catering.restaurant.wings"
  ],
  "pepper-hot": [
    "catering.restaurant.chili",
    "catering.restaurant.mexican",
    "catering.restaurant.tacos",
    "catering.restaurant.tex-mex"
  ],
  "bread-slice": [
    "catering.restaurant.french",
    "catering.restaurant.pita"
  ],
  "bowl-rice": [
    "catering.restaurant.asian",
    "catering.restaurant.chinese",
    "catering.restaurant.korean",
    "catering.restaurant.oriental",
    "catering.restaurant.taiwanese",
    "catering.restaurant.thai",
    "catering.restaurant.vietnamese"
  ],
  "fire": [
    "catering.restaurant.barbecue"
  ],
  "globe": [
    "catering.restaurant.international"
  ]
};

const map = new maplibregl.Map({
  container: "map",
  style: `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`,
  center: initialMapCenter,
  zoom: 13
});

let searchCenter = initialMapCenter;
let activeRestaurantsRequestId = 0;
const restaurantMarkers = [];

map.addControl(new maplibregl.NavigationControl(), "top-right");

const centerMarker = document.createElement("div");
centerMarker.className = "center-marker";

const centerLocationMarker = new maplibregl.Marker({
  element: centerMarker,
  anchor: "center"
})
  .setLngLat(searchCenter)
  .addTo(map);

loadNearbyRestaurants();

map.on("click", event => {
  if (isMarkerOrPopupClick(event.originalEvent.target)) {
    return;
  }

  searchCenter = [event.lngLat.lng, event.lngLat.lat];
  centerLocationMarker.setLngLat(searchCenter);
  loadNearbyRestaurants();
});

function isMarkerOrPopupClick(target) {
  return target.closest(".maplibregl-marker, .maplibregl-popup");
}

function loadNearbyRestaurants() {
  const requestCenter = [...searchCenter];
  const requestId = ++activeRestaurantsRequestId;
  const nearbyRestaurantsUrl = `https://api.geoapify.com/v2/places?categories=catering.restaurant&filter=circle:${requestCenter[0]},${requestCenter[1]},10000&bias=proximity:${requestCenter[0]},${requestCenter[1]}&limit=20&apiKey=${apiKey}`;

  clearRestaurantMarkers();

  fetch(nearbyRestaurantsUrl)
    .then(response => response.json())
    .then(restaurantsData => {
      if (requestId === activeRestaurantsRequestId) {
        showRestaurants(restaurantsData.features || [], requestCenter);
      }
    });
}

function clearRestaurantMarkers() {
  restaurantMarkers.forEach(marker => marker.remove());
  restaurantMarkers.length = 0;
}

function showRestaurants(restaurants, requestCenter) {
  // Render north-to-south so lower markers visually stack above markers behind them.
  const sortedRestaurants = [...restaurants].sort((firstRestaurant, secondRestaurant) => {
    return secondRestaurant.geometry.coordinates[1] - firstRestaurant.geometry.coordinates[1];
  });

  sortedRestaurants.forEach((restaurant, index) => {
    const coordinates = restaurant.geometry.coordinates;
    const properties = restaurant.properties || {};
    const markerElement = createRestaurantMarker(properties.categories);
    markerElement.style.zIndex = index + 1;

    const restaurantMarker = new maplibregl.Marker({
      element: markerElement,
      anchor: "bottom",
      offset: [0, 5]
    })
      .setLngLat(coordinates)
      .setPopup(
        new maplibregl.Popup({
          offset: 58,
          focusAfterOpen: false
        })
          .setDOMContent(createRestaurantPopup(properties, coordinates, requestCenter))
      )
      .addTo(map);

    restaurantMarkers.push(restaurantMarker);
  });

  fitMapToPlacesIfNeeded(sortedRestaurants, requestCenter);
}

function fitMapToPlacesIfNeeded(restaurants, requestCenter) {
  const coordinates = [
    requestCenter,
    ...restaurants.map(restaurant => restaurant.geometry.coordinates)
  ];

  if (coordinates.length < 2 || coordinates.every(coordinate => map.getBounds().contains(coordinate))) {
    return;
  }

  const bounds = coordinates.reduce((mapBounds, coordinate) => {
    return mapBounds.extend(coordinate);
  }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

  map.fitBounds(bounds, {
    padding: 64,
    maxZoom: 14,
    duration: 500
  });
}

function createRestaurantPopup(properties, coordinates, requestCenter) {
  const popupContent = document.createElement("article");
  popupContent.className = "restaurant-popup";

  const title = document.createElement("h2");
  title.textContent = properties.name || "Restaurant";
  popupContent.appendChild(title);

  const address = document.createElement("a");
  address.className = "restaurant-popup__address";
  address.href = googleMapsDirectionsUrl(coordinates, requestCenter);
  address.target = "_blank";
  address.rel = "noopener";
  address.textContent = getRestaurantAddress(properties);
  popupContent.appendChild(address);

  const categories = getRestaurantCategories(properties.categories);

  if (categories.length > 0) {
    const categoryList = document.createElement("div");
    categoryList.className = "restaurant-popup__categories";

    categories.forEach(category => {
      const categoryTag = document.createElement("span");
      categoryTag.textContent = category;
      categoryList.appendChild(categoryTag);
    });

    popupContent.appendChild(categoryList);
  }

  return popupContent;
}

function getRestaurantAddress(properties) {
  if (properties.address_line1 && properties.address_line2) {
    return `${properties.address_line1}, ${properties.address_line2}`;
  }

  return properties.address_line1 || properties.address_line2 || properties.formatted || "Address unavailable";
}

function googleMapsDirectionsUrl(coordinates, requestCenter) {
  const destination = `${coordinates[1]},${coordinates[0]}`;
  const origin = `${requestCenter[1]},${requestCenter[0]}`;

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
}

function getRestaurantCategories(categories) {
  if (!Array.isArray(categories)) {
    return [];
  }

  return categories
    .filter(category => category.startsWith("catering.restaurant"))
    .map(category => category === "catering.restaurant" ? "restaurant" : category.replace("catering.restaurant.", ""))
    .map(category => category.replaceAll("_", " "))
    .slice(0, 4);
}

function createRestaurantMarker(categories) {
  const markerElement = document.createElement("div");
  markerElement.className = "restaurant-marker";

  const markerIcon = document.createElement("img");
  markerIcon.src = restaurantMarkerIconUrl(getRestaurantIconName(categories));
  markerIcon.alt = "Restaurant";

  markerElement.appendChild(markerIcon);

  return markerElement;
}

function getRestaurantIconName(categories) {
  if (!Array.isArray(categories)) {
    return "utensils";
  }

  const categorySet = new Set(categories);
  const iconNames = Object.keys(restaurantIconCategories);

  for (const iconName of iconNames) {
    const iconCategories = restaurantIconCategories[iconName];

    if (iconCategories.some(category => categorySet.has(category))) {
      return iconName;
    }
  }

  return "utensils";
}

function restaurantMarkerIconUrl(iconName) {
  return `https://api.geoapify.com/v2/icon/?type=material&color=%23E35D5B&size=50&iconType=awesome&icon=${iconName}&contentSize=20&scaleFactor=2&noWhiteCircle&apiKey=${apiKey}`;
}
