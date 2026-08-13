const timezonePackageUrl = "https://cdn.jsdelivr.net/npm/@geoapify/iana-timezone-metadata@1.0.0/dist/index.js";

const elements = {
  appError: document.getElementById("app-error"),
  databaseInfo: document.getElementById("database-info"),
  compareForm: document.getElementById("compare-form"),
  firstTimezoneSelect: document.getElementById("first-timezone-select"),
  secondTimezoneSelect: document.getElementById("second-timezone-select"),
  swapButton: document.getElementById("swap-button"),
  instantInput: document.getElementById("instant-input"),
  nowButton: document.getElementById("now-button"),
  comparisonResult: document.getElementById("comparison-result"),
};

let timezoneMetadata;

import(timezonePackageUrl).then(initializeApp, showInitializationError);

function initializeApp(packageExports) {
  timezoneMetadata = packageExports;
  populateTimezoneSelects();
  configureInstantInput();
  configureDatabaseInfo();
  bindEvents();
  renderComparison();
}

function showInitializationError(error) {
  elements.appError.hidden = false;
  elements.appError.textContent = `IANA timezone data could not be loaded. ${getErrorMessage(error)}`;
  elements.databaseInfo.textContent = "IANA timezone data unavailable";
}

function populateTimezoneSelects() {
  const timezoneIds = timezoneMetadata.listTimezoneIds({ includeAliases: true });
  [elements.firstTimezoneSelect, elements.secondTimezoneSelect].forEach((select) => {
    const fragment = document.createDocumentFragment();
    timezoneIds.forEach((timezoneId) => {
      const option = document.createElement("option");
      option.value = timezoneId;
      option.textContent = timezoneId;
      fragment.append(option);
    });
    select.append(fragment);
  });

  elements.firstTimezoneSelect.value = "America/New_York";
  elements.secondTimezoneSelect.value = "Europe/London";
}

function configureInstantInput() {
  const { from, until } = timezoneMetadata.databaseInfo.transitionRange;
  const instant = isSupportedInstant(new Date())
    ? new Date()
    : new Date(Date.UTC(timezoneMetadata.databaseInfo.referenceYear, 6, 1, 12));

  elements.instantInput.min = formatUtcInputValue(new Date(from));
  elements.instantInput.max = formatUtcInputValue(new Date(Date.parse(until) - 60000));
  elements.instantInput.value = formatUtcInputValue(instant);
}

function configureDatabaseInfo() {
  const { tzdbVersion, transitionRange } = timezoneMetadata.databaseInfo;
  elements.databaseInfo.innerHTML = [
    `<strong>IANA tzdb ${escapeHtml(tzdbVersion)}</strong>`,
    `Supported: ${formatDateOnly(transitionRange.from)}–${formatDateOnly(transitionRange.until, true)}`,
  ].join("<br>");
}

function bindEvents() {
  elements.compareForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderComparison();
  });
  elements.swapButton.addEventListener("click", swapTimezones);
  elements.nowButton.addEventListener("click", useCurrentInstant);
}

function swapTimezones() {
  const firstTimezoneId = elements.firstTimezoneSelect.value;
  elements.firstTimezoneSelect.value = elements.secondTimezoneSelect.value;
  elements.secondTimezoneSelect.value = firstTimezoneId;
  renderComparison();
}

function useCurrentInstant() {
  const now = new Date();
  if (isSupportedInstant(now)) {
    elements.instantInput.value = formatUtcInputValue(now);
    renderComparison();
  }
}

function renderComparison() {
  const instant = new Date(`${elements.instantInput.value}:00Z`);
  if (!isSupportedInstant(instant)) {
    elements.comparisonResult.innerHTML = '<p class="message error">Choose a date and time inside the supported transition range.</p>';
    return;
  }

  const first = getTimezoneResult(elements.firstTimezoneSelect.value, instant);
  const second = getTimezoneResult(elements.secondTimezoneSelect.value, instant);
  const differenceSeconds = second.state.offsetSeconds - first.state.offsetSeconds;

  elements.comparisonResult.innerHTML = `
    <section class="comparison-summary">
      <h2>Timezone comparison</h2>
      <p>${escapeHtml(formatDifference(first.canonicalId, second.canonicalId, differenceSeconds))} At ${escapeHtml(instant.toISOString())}.</p>
    </section>
    <div class="timezone-results">
      ${renderTimezoneCard(first, instant)}
      ${renderTimezoneCard(second, instant)}
    </div>
  `;
}

function getTimezoneResult(requestedId, instant) {
  const canonicalId = timezoneMetadata.resolveTimezone(requestedId);
  return {
    requestedId,
    canonicalId,
    timezone: timezoneMetadata.getTimezone(canonicalId),
    state: timezoneMetadata.getTimezoneState(canonicalId, instant),
    nextTransition: timezoneMetadata.getNextTransition(canonicalId, instant),
  };
}

function renderTimezoneCard(result, instant) {
  const localDate = new Date(instant.getTime() + result.state.offsetSeconds * 1000);
  const aliasText = result.requestedId === result.canonicalId
    ? "Canonical IANA timezone"
    : `Alias ${escapeHtml(result.requestedId)} resolves to this timezone`;

  return `
    <article class="timezone-card">
      <h3>${escapeHtml(result.canonicalId)}</h3>
      <p class="timezone-subtitle">${aliasText}</p>
      <div class="local-time">
        <strong>${escapeHtml(formatLocalTime(localDate))}</strong>
        <span>${escapeHtml(formatLocalDate(localDate))}</span>
      </div>
      <dl class="result-items">
        <dt>UTC offset</dt><dd>${escapeHtml(result.state.utcOffset)}</dd>
        <dt>Abbreviation</dt><dd>${escapeHtml(result.state.abbreviation)}</dd>
        <dt>State</dt><dd>${escapeHtml(formatStateType(result.state.type))}</dd>
        <dt>Country codes</dt><dd>${escapeHtml(result.timezone.countryCodes.join(", ") || "None")}</dd>
      </dl>
      ${renderNextTransition(result.nextTransition)}
    </article>
  `;
}

function renderNextTransition(transition) {
  if (transition === null) {
    return `
      <section class="next-transition">
        <h4>Next transition</h4>
        <p>No later transition in the supported range.</p>
      </section>
    `;
  }

  return `
    <section class="next-transition">
      <h4>Next transition</h4>
      <dl class="result-items">
        <dt>UTC date and time</dt><dd>${escapeHtml(formatUtcTransition(transition.at))} UTC</dd>
        <dt>Offset change</dt><dd>${escapeHtml(transition.before.utcOffset)} → ${escapeHtml(transition.after.utcOffset)}</dd>
        <dt>Type</dt><dd>${escapeHtml(formatTransitionKind(transition.kind))}</dd>
      </dl>
    </section>
  `;
}

function formatDifference(firstId, secondId, differenceSeconds) {
  if (differenceSeconds === 0) {
    return `${firstId} and ${secondId} have the same UTC offset.`;
  }

  const relation = differenceSeconds > 0 ? "ahead of" : "behind";
  return `${secondId} is ${formatDuration(Math.abs(differenceSeconds))} ${relation} ${firstId}.`;
}

function formatDuration(totalSeconds) {
  const totalMinutes = totalSeconds / 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts = [];

  if (hours) {
    parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  }
  if (minutes) {
    parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  }
  return parts.join(" ");
}

function formatLocalTime(date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);
}

function formatLocalDate(date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
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

function formatStateType(type) {
  return {
    standard: "Standard time",
    daylightSaving: "Daylight saving time",
    other: "Other state",
  }[type] || type;
}

function formatTransitionKind(kind) {
  return kind.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}

function formatUtcInputValue(date) {
  return date.toISOString().slice(0, 16);
}

function isSupportedInstant(instant) {
  const { from, until } = timezoneMetadata.databaseInfo.transitionRange;
  const time = instant.getTime();
  return Number.isFinite(time) && time >= Date.parse(from) && time < Date.parse(until);
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
