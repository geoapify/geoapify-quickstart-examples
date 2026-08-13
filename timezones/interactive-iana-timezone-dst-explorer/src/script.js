/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const apiKey = "5402608de7c44a2d95121c407ad2110b";
const timezonePackageUrl = "https://cdn.jsdelivr.net/npm/@geoapify/iana-timezone-metadata@1.0.0/dist/index.js";

const elements = {
  appError: document.getElementById("app-error"),
  databaseInfo: document.getElementById("database-info"),
  taskInputs: document.querySelectorAll('input[name="task"]'),
  taskPanels: document.querySelectorAll("[data-task-panel]"),
  coordinatesForm: document.getElementById("coordinates-form"),
  latitudeInput: document.getElementById("latitude-input"),
  longitudeInput: document.getElementById("longitude-input"),
  useLocationButton: document.getElementById("use-location-button"),
  coordinatesStatus: document.getElementById("coordinates-status"),
  coordinatesResult: document.getElementById("coordinates-result"),
  detailsForm: document.getElementById("details-form"),
  detailsTimezoneSelect: document.getElementById("details-timezone-select"),
  detailsInstantInput: document.getElementById("details-instant-input"),
  detailsNowButton: document.getElementById("details-now-button"),
  detailsResult: document.getElementById("details-result"),
  transitionsForm: document.getElementById("transitions-form"),
  transitionsTimezoneSelect: document.getElementById("transitions-timezone-select"),
  transitionsYearSelect: document.getElementById("transitions-year-select"),
  transitionsResult: document.getElementById("transitions-result"),
  countryForm: document.getElementById("country-form"),
  countrySelect: document.getElementById("country-select"),
  countryResult: document.getElementById("country-result"),
};

let timezoneMetadata;
let map;
let marker;
let popup;
let reverseGeocodeRequestId = 0;
let selectedTimezoneId = "UTC";

import(timezonePackageUrl).then(initializeApp, showInitializationError);

function initializeApp(packageExports) {
  timezoneMetadata = packageExports;
  selectedTimezoneId = getInitialTimezoneId();

  configureDatabaseInfo();
  populateTimezoneOptions();
  populateYearOptions();
  populateCountryOptions();
  configureInitialInputs();
  bindEvents();
  initializeMap();
  renderTimezoneDetails(
    elements.detailsResult,
    selectedTimezoneId,
    getSelectedInstant(elements.detailsInstantInput),
  );
}

function showInitializationError(error) {
  elements.appError.hidden = false;
  elements.appError.textContent = `Timezone data could not be loaded. ${getErrorMessage(error)}`;
  elements.databaseInfo.textContent = "Timezone data unavailable";
}

function configureDatabaseInfo() {
  const { tzdbVersion, referenceYear, transitionRange } = timezoneMetadata.databaseInfo;
  elements.databaseInfo.innerHTML = [
    `<strong>IANA tzdb ${escapeHtml(tzdbVersion)}</strong>`,
    `Reference year: ${referenceYear}`,
    `Transitions: ${formatDateOnly(transitionRange.from)}–${formatDateOnly(transitionRange.until, true)}`,
  ].join("<br>");
}

function populateTimezoneOptions() {
  const timezoneIds = timezoneMetadata.listTimezoneIds({ includeAliases: true });
  [elements.detailsTimezoneSelect, elements.transitionsTimezoneSelect].forEach((select) => {
    const fragment = document.createDocumentFragment();
    timezoneIds.forEach((id) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = id;
      fragment.append(option);
    });
    select.append(fragment);
  });
}

function populateYearOptions() {
  const { from, until } = timezoneMetadata.databaseInfo.transitionRange;
  const firstYear = new Date(from).getUTCFullYear();
  const lastYear = new Date(new Date(until).getTime() - 1).getUTCFullYear();
  const currentYear = new Date().getUTCFullYear();

  for (let year = firstYear; year <= lastYear; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    option.selected = year === Math.min(Math.max(currentYear, firstYear), lastYear);
    elements.transitionsYearSelect.append(option);
  }
}

function populateCountryOptions() {
  const countryCodes = new Set();
  timezoneMetadata.listTimezones().forEach((timezone) => {
    timezone.countryCodes.forEach((countryCode) => countryCodes.add(countryCode));
  });

  const displayNames = typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;
  const countries = [...countryCodes].map((code) => ({
    code,
    name: displayNames?.of(code) || code,
  })).sort((left, right) => left.name.localeCompare(right.name));

  countries.forEach(({ code, name }) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = `${name} (${code})`;
    elements.countrySelect.append(option);
  });

  const initialCountry = timezoneMetadata.getTimezone(selectedTimezoneId)?.countryCodes[0];
  elements.countrySelect.value = initialCountry || "US";
}

function configureInitialInputs() {
  const initialInstant = getInitialInstant();
  elements.detailsTimezoneSelect.value = selectedTimezoneId;
  elements.transitionsTimezoneSelect.value = selectedTimezoneId;
  elements.detailsInstantInput.value = formatUtcInputValue(initialInstant);

  const { from, until } = timezoneMetadata.databaseInfo.transitionRange;
  elements.detailsInstantInput.min = formatUtcInputValue(new Date(from));
  elements.detailsInstantInput.max = formatUtcInputValue(new Date(new Date(until).getTime() - 60000));
}

function bindEvents() {
  elements.taskInputs.forEach((input) => input.addEventListener("change", switchTask));
  elements.coordinatesForm.addEventListener("submit", handleCoordinatesSubmit);
  elements.useLocationButton.addEventListener("click", useBrowserLocation);
  elements.detailsForm.addEventListener("submit", handleDetailsSubmit);
  elements.detailsNowButton.addEventListener("click", useCurrentInstant);
  elements.transitionsForm.addEventListener("submit", handleTransitionsSubmit);
  elements.countryForm.addEventListener("submit", handleCountrySubmit);
  elements.coordinatesResult.addEventListener("click", handleOpenDetailsClick);
  elements.countryResult.addEventListener("click", handleOpenDetailsClick);
}

function switchTask(event) {
  const selectedTask = event.target.value;
  elements.taskPanels.forEach((panel) => {
    panel.hidden = panel.dataset.taskPanel !== selectedTask;
  });

  if (selectedTask === "coordinates" && map) {
    window.setTimeout(() => map.resize(), 0);
  }
}

function selectTask(task) {
  const input = document.querySelector(`input[name="task"][value="${task}"]`);
  input.checked = true;
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function initializeMap() {
  if (typeof maplibregl === "undefined") {
    elements.coordinatesStatus.textContent = "The map library could not be loaded.";
    return;
  }

  const initialCoordinates = [
    Number(elements.longitudeInput.value),
    Number(elements.latitudeInput.value),
  ];

  map = new maplibregl.Map({
    container: "map",
    style: `https://maps.geoapify.com/v1/styles/osm-bright-smooth/style.json?apiKey=${apiKey}`,
    center: initialCoordinates,
    zoom: 9,
  });
  map.addControl(new maplibregl.NavigationControl(), "top-left");

  marker = new maplibregl.Marker({
    element: createGeoapifyMarkerElement(),
    anchor: "bottom",
    offset: [0, 4],
    draggable: true,
  })
    .setLngLat(initialCoordinates)
    .addTo(map);

  map.on("click", (event) => {
    lookupCoordinates(event.lngLat.lat, event.lngLat.lng, true);
  });

  marker.on("dragend", () => {
    const coordinates = marker.getLngLat();
    lookupCoordinates(coordinates.lat, coordinates.lng, false);
  });

  map.on("load", () => {
    lookupCoordinates(initialCoordinates[1], initialCoordinates[0], false);
  });
}

function createGeoapifyMarkerElement() {
  const image = document.createElement("img");
  image.src = `https://api.geoapify.com/v2/icon/?type=material&color=%230063ff&size=42&noWhiteCircle&scaleFactor=2&apiKey=${apiKey}`;
  image.alt = "Selected timezone location";
  image.className = "timezone-map-marker";
  image.width = 30;
  image.height = 46;
  image.draggable = false;
  return image;
}

function handleCoordinatesSubmit(event) {
  event.preventDefault();
  const latitude = Number(elements.latitudeInput.value);
  const longitude = Number(elements.longitudeInput.value);

  if (!isValidCoordinate(latitude, longitude)) {
    elements.coordinatesStatus.textContent = "Enter latitude from -90 to 90 and longitude from -180 to 180.";
    elements.coordinatesResult.innerHTML = "";
    return;
  }

  lookupCoordinates(latitude, longitude, true);
}

function useBrowserLocation() {
  if (!navigator.geolocation) {
    elements.coordinatesStatus.textContent = "Browser geolocation is not available.";
    return;
  }

  elements.coordinatesStatus.textContent = "Getting your location…";
  navigator.geolocation.getCurrentPosition(
    (position) => lookupCoordinates(position.coords.latitude, position.coords.longitude, true),
    (error) => {
      elements.coordinatesStatus.textContent = `Location could not be retrieved. ${error.message}`;
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

function lookupCoordinates(latitude, longitude, moveMap) {
  const normalizedLongitude = normalizeLongitude(longitude);
  const requestId = reverseGeocodeRequestId + 1;
  reverseGeocodeRequestId = requestId;

  elements.latitudeInput.value = latitude.toFixed(6);
  elements.longitudeInput.value = normalizedLongitude.toFixed(6);
  elements.coordinatesStatus.textContent = "Looking up timezone…";
  elements.coordinatesResult.innerHTML = "";

  if (marker) {
    marker.setLngLat([normalizedLongitude, latitude]);
  }
  if (moveMap && map) {
    map.easeTo({ center: [normalizedLongitude, latitude], zoom: Math.max(map.getZoom(), 7) });
  }

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(normalizedLongitude),
    format: "json",
    apiKey,
  });

  fetch(`https://api.geoapify.com/v1/geocode/reverse?${params}`)
    .then(readJsonResponse)
    .then((data) => renderCoordinateLookup(data, latitude, normalizedLongitude, requestId))
    .catch((error) => showCoordinateLookupError(error, requestId));
}

function readJsonResponse(response) {
  if (!response.ok) {
    return response.text().then((body) => {
      throw new Error(`Request failed with status ${response.status}. ${body}`);
    });
  }
  return response.json();
}

function renderCoordinateLookup(data, latitude, longitude, requestId) {
  if (requestId !== reverseGeocodeRequestId) {
    return;
  }

  const result = data.results?.[0];
  const returnedTimezoneId = result?.timezone?.name;
  const canonicalTimezoneId = returnedTimezoneId
    ? timezoneMetadata.resolveTimezone(returnedTimezoneId)
    : undefined;

  if (!result || !returnedTimezoneId) {
    elements.coordinatesStatus.textContent = "No timezone was returned for this location.";
    return;
  }

  elements.coordinatesStatus.textContent = "Timezone found.";
  const timezoneId = canonicalTimezoneId || returnedTimezoneId;
  const state = canonicalTimezoneId ? getStateAtSupportedNow(canonicalTimezoneId) : null;
  const timezone = canonicalTimezoneId ? timezoneMetadata.getTimezone(canonicalTimezoneId) : null;
  const nextTransition = canonicalTimezoneId
    ? timezoneMetadata.getNextTransition(canonicalTimezoneId, getSupportedNow())
    : null;
  const aliasRow = canonicalTimezoneId && returnedTimezoneId !== canonicalTimezoneId
    ? `<dt>Returned timezone</dt><dd>${escapeHtml(returnedTimezoneId)} → ${escapeHtml(canonicalTimezoneId)}</dd>`
    : `<dt>Timezone</dt><dd>${escapeHtml(timezoneId)}</dd>`;

  elements.coordinatesResult.innerHTML = `
    <article class="result-card">
      <h3>${escapeHtml(result.formatted || timezoneId)}</h3>
      <p class="result-subtitle">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
      <dl class="result-grid">
        ${aliasRow}
        <dt>Associated countries</dt><dd>${timezone ? escapeHtml(timezone.countryCodes.join(", ") || "—") : "—"}</dd>
      </dl>
      ${renderStateSection(state)}
      ${renderNextTransitionSection(nextTransition)}
      ${canonicalTimezoneId ? `<button type="button" class="result-action" data-open-timezone="${escapeHtml(canonicalTimezoneId)}">Open full timezone details</button>` : ""}
    </article>
  `;

  if (map) {
    if (popup) {
      popup.remove();
    }
    popup = new maplibregl.Popup({ closeButton: false, offset: 42 })
      .setLngLat([longitude, latitude])
      .setText(`${result.formatted || timezoneId}: ${timezoneId}`)
      .addTo(map);
  }
}

function showCoordinateLookupError(error, requestId) {
  if (requestId !== reverseGeocodeRequestId) {
    return;
  }
  elements.coordinatesStatus.textContent = `Timezone lookup failed. ${getErrorMessage(error)}`;
}

function handleDetailsSubmit(event) {
  event.preventDefault();
  const instant = getSelectedInstant(elements.detailsInstantInput);
  renderTimezoneDetails(elements.detailsResult, elements.detailsTimezoneSelect.value, instant);
}

function useCurrentInstant() {
  elements.detailsInstantInput.value = formatUtcInputValue(getSupportedNow());
}

function renderTimezoneDetails(target, requestedId, instant) {
  const canonicalId = timezoneMetadata.resolveTimezone(requestedId);

  if (!canonicalId) {
    target.innerHTML = `<p class="empty-state">“${escapeHtml(requestedId)}” is not a known timezone or alias.</p>`;
    return;
  }
  if (!isSupportedInstant(instant)) {
    target.innerHTML = `<p class="empty-state">Choose an instant inside the package's supported transition range.</p>`;
    return;
  }

  const timezone = timezoneMetadata.getTimezone(canonicalId);
  const state = timezoneMetadata.getTimezoneState(canonicalId, instant);
  const nextTransition = timezoneMetadata.getNextTransition(canonicalId, instant);
  selectedTimezoneId = canonicalId;

  target.innerHTML = `
    <article class="result-card">
      <h3>${escapeHtml(canonicalId)}</h3>
      <p class="result-subtitle">${requestedId !== canonicalId ? `Alias ${escapeHtml(requestedId)} resolves to this canonical timezone` : "Canonical IANA timezone"}</p>
      <dl class="result-grid">
        <dt>UTC instant</dt><dd>${escapeHtml(instant.toISOString())}</dd>
        <dt>Local date and time</dt><dd>${escapeHtml(formatLocalInstant(instant, state.offsetSeconds))}</dd>
        <dt>Aliases</dt><dd>${escapeHtml(timezone.aliases.join(", ") || "None")}</dd>
        <dt>Country codes</dt><dd>${escapeHtml(timezone.countryCodes.join(", ") || "None")}</dd>
        <dt>Representative location</dt><dd>${escapeHtml(formatLocation(timezone.location))}</dd>
        <dt>Reference year</dt><dd>${timezone.referenceYear}</dd>
      </dl>
      ${renderStateSection(state)}
      ${renderNextTransitionSection(nextTransition)}
    </article>
  `;
}

function handleTransitionsSubmit(event) {
  event.preventDefault();
  renderTransitions(elements.transitionsTimezoneSelect.value, Number(elements.transitionsYearSelect.value));
}

function renderTransitions(requestedId, year) {
  const canonicalId = timezoneMetadata.resolveTimezone(requestedId);
  if (!canonicalId) {
    elements.transitionsResult.innerHTML = `<p class="empty-state">“${escapeHtml(requestedId)}” is not a known timezone or alias.</p>`;
    return;
  }

  const transitions = timezoneMetadata.getTransitions(canonicalId, {
    from: Date.UTC(year, 0, 1),
    to: Date.UTC(year + 1, 0, 1),
  });
  selectedTimezoneId = canonicalId;

  if (!transitions.length) {
    elements.transitionsResult.innerHTML = `<p class="empty-state"><strong>${escapeHtml(canonicalId)}</strong> has no state transitions in ${year}.</p>`;
    return;
  }

  const rows = transitions.map((transition) => `
    <tr>
      <td>${escapeHtml(formatUtcTransition(transition.at))}</td>
      <td>${escapeHtml(formatTransitionKind(transition.kind))}</td>
      <td>${escapeHtml(transition.before.utcOffset)} ${escapeHtml(transition.before.abbreviation)}</td>
      <td>${escapeHtml(transition.after.utcOffset)} ${escapeHtml(transition.after.abbreviation)}</td>
      <td>${escapeHtml(formatClockChange(transition))}</td>
    </tr>
  `).join("");

  elements.transitionsResult.innerHTML = `
    <article class="result-card">
      <h3>${escapeHtml(canonicalId)} transitions in ${year}</h3>
      <p class="result-subtitle">${transitions.length} state change${transitions.length === 1 ? "" : "s"}</p>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>UTC instant</th><th>Change</th><th>Before</th><th>After</th><th>Local clock</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>
  `;
}

function handleCountrySubmit(event) {
  event.preventDefault();
  renderCountryTimezones(elements.countrySelect.value);
}

function renderCountryTimezones(countryCode) {
  const timezones = timezoneMetadata.getTimezonesForCountry(countryCode);
  const instant = getSupportedNow();

  if (!timezones.length) {
    elements.countryResult.innerHTML = `<p class="empty-state">No timezone associations were found for ${escapeHtml(countryCode)}.</p>`;
    return;
  }

  const sortedTimezones = timezones.map((timezone) => ({
    timezone,
    state: timezoneMetadata.getTimezoneState(timezone.id, instant),
  })).sort((left, right) => {
    const offsetDifference = left.state.offsetSeconds - right.state.offsetSeconds;
    return offsetDifference || left.timezone.id.localeCompare(right.timezone.id);
  });

  const rows = sortedTimezones.map(({ timezone, state }) => {
    return `
      <tr>
        <td><strong>${escapeHtml(timezone.id)}</strong></td>
        <td>${escapeHtml(state.utcOffset)}</td>
        <td>${escapeHtml(state.abbreviation)}</td>
        <td>${escapeHtml(formatStateType(state.type))}</td>
        <td><button type="button" data-open-timezone="${escapeHtml(timezone.id)}">Details</button></td>
      </tr>
    `;
  }).join("");

  elements.countryResult.innerHTML = `
    <article class="result-card">
      <h3>${timezones.length} timezone${timezones.length === 1 ? "" : "s"} for ${escapeHtml(countryCode)}</h3>
      <p class="result-subtitle">Current states at ${escapeHtml(instant.toISOString())}</p>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Timezone</th><th>Offset</th><th>Abbreviation</th><th>State</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>
  `;
}

function handleOpenDetailsClick(event) {
  const button = event.target.closest("[data-open-timezone]");
  if (!button) {
    return;
  }

  const timezoneId = button.dataset.openTimezone;
  elements.detailsTimezoneSelect.value = timezoneId;
  renderTimezoneDetails(
    elements.detailsResult,
    timezoneId,
    getSelectedInstant(elements.detailsInstantInput),
  );
  selectTask("details");
}

function getInitialTimezoneId() {
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezoneMetadata.resolveTimezone(browserTimezone) || "UTC";
}

function getInitialInstant() {
  return isSupportedInstant(new Date())
    ? new Date()
    : new Date(Date.UTC(timezoneMetadata.databaseInfo.referenceYear, 6, 1, 12));
}

function getSupportedNow() {
  return isSupportedInstant(new Date()) ? new Date() : getInitialInstant();
}

function getStateAtSupportedNow(timezoneId) {
  return timezoneMetadata.getTimezoneState(timezoneId, getSupportedNow());
}

function getSelectedInstant(input) {
  return new Date(`${input.value}:00Z`);
}

function isSupportedInstant(instant) {
  const { from, until } = timezoneMetadata.databaseInfo.transitionRange;
  const time = instant.getTime();
  return Number.isFinite(time) && time >= Date.parse(from) && time < Date.parse(until);
}

function isValidCoordinate(latitude, longitude) {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

function normalizeLongitude(longitude) {
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function formatUtcInputValue(date) {
  return date.toISOString().slice(0, 16);
}

function renderStateSection(state) {
  if (!state) {
    return `
      <section class="result-section">
        <h4>Current state</h4>
        <p>Not available in the package.</p>
      </section>
    `;
  }

  return `
    <section class="result-section">
      <h4>Current state</h4>
      <dl class="result-items">
        <dt>Offset</dt><dd>${escapeHtml(state.utcOffset)}</dd>
        <dt>Abbreviation</dt><dd>${escapeHtml(state.abbreviation)}</dd>
        <dt>Type</dt><dd>${escapeHtml(formatStateType(state.type))}</dd>
      </dl>
    </section>
  `;
}

function renderNextTransitionSection(transition) {
  let content;

  if (transition === undefined) {
    content = "<p>Unknown timezone.</p>";
  } else if (transition === null) {
    content = "<p>No later transition in the supported range.</p>";
  } else {
    content = `
      <dl class="result-items">
        <dt>UTC date and time</dt><dd>${escapeHtml(formatUtcTransition(transition.at))} UTC</dd>
        <dt>Offset change</dt><dd>${escapeHtml(transition.before.utcOffset)} → ${escapeHtml(transition.after.utcOffset)}</dd>
        <dt>Type</dt><dd>${escapeHtml(formatTransitionKind(transition.kind))}</dd>
      </dl>
    `;
  }

  return `
    <section class="result-section">
      <h4>Next transition</h4>
      ${content}
    </section>
  `;
}

function formatStateType(type) {
  return {
    standard: "Standard time",
    daylightSaving: "Daylight saving time",
    other: "Other state",
  }[type] || type;
}

function formatClockChange(transition) {
  const instant = new Date(transition.at);
  const before = formatLocalInstant(instant, transition.before.offsetSeconds, false);
  const after = formatLocalInstant(instant, transition.after.offsetSeconds, false);
  return `${before} → ${after}`;
}

function formatLocalInstant(instant, offsetSeconds, includeYear = true) {
  const localDate = new Date(instant.getTime() + offsetSeconds * 1000);
  const options = {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  };
  if (includeYear) {
    options.year = "numeric";
  }
  return new Intl.DateTimeFormat("en", options).format(localDate);
}

function formatUtcTransition(isoInstant) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(new Date(isoInstant));
}

function formatTransitionKind(kind) {
  return kind.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function formatLocation(location) {
  if (!location) {
    return "Not provided";
  }
  const coordinates = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  return location.comments ? `${coordinates} · ${location.comments}` : coordinates;
}

function formatDateOnly(isoInstant, exclusive = false) {
  const date = new Date(isoInstant);
  if (exclusive) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unknown error";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
