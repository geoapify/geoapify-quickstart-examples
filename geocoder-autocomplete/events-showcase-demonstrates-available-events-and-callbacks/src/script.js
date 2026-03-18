/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

function setTheme(themeName) {
  const themeLink = document.getElementById("geocoder-theme");
  themeLink.href = `https://cdn.jsdelivr.net/npm/@geoapify/geocoder-autocomplete@3.0.1/styles/${themeName}.css`;
  document.body.className = document.body.className.replace(/theme-\w+/g, "");
  document.body.classList.add(`theme-${themeName}`);
  localStorage.setItem("geocoder-theme", themeName);
}
window.addEventListener("load", () => {
  const savedTheme = localStorage.getItem("geocoder-theme") || "minimal";
  document.getElementById("theme-selector").value = savedTheme;
  setTheme(savedTheme);
});

// Initialize component (factory)
let ac;
function initAutocomplete(options) {
  const el = document.getElementById("ac");
  el.innerHTML = "";
  ac = new autocomplete.GeocoderAutocomplete(el, yourAPIKey, {
    skipIcons: false,
    placeholder: "Type to search addresses or categories…",
    showPlacesList: true,
    enablePlacesLazyLoading: true,
    limit: 8,
    hidePlacesListAfterSelect: true,
    ...options
  });
}
// Default options
initAutocomplete({ addCategorySearch: true, debounceDelay: 250 });

// Event list
const EVENTS = [
  { key: "select", label: "select" },
  { key: "suggestions", label: "suggestions" },
  { key: "input", label: "input" },
  { key: "close", label: "close" },
  { key: "open", label: "open" },
  { key: "request_start", label: "request_start" },
  { key: "request_end", label: "request_end" },
  { key: "places", label: "places" },
  { key: "places_request_start", label: "places_request_start" },
  { key: "places_request_end", label: "places_request_end" },
  { key: "place_details_request_start", label: "place_details_request_start" },
  { key: "place_details_request_end", label: "place_details_request_end" },
  { key: "place_select", label: "place_select" },
  { key: "clear", label: "clear" }
];

// Render checkboxes
const grid = document.getElementById("event-grid");
EVENTS.forEach((e) => {
  const id = `evt-${e.key}`;
  const wrap = document.createElement("label");
  wrap.style.display = "flex";
  wrap.style.gap = "8px";
  wrap.style.alignItems = "center";
  wrap.innerHTML = `<input type="checkbox" id="${id}" checked> <span>${e.label}</span>`;
  grid.appendChild(wrap);
});

// Logging
const consoleEl = document.getElementById("console");
function nowTs() {
  const d = new Date();
  const pad = (n, s = 2) => String(n).padStart(s, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds()
  )}.${pad(d.getMilliseconds(), 3)}`;
}
function showLine(name, payload) {
  const line = document.createElement("div");
  line.className = "line";
  const ts = document.createElement("span");
  ts.className = "ts";
  ts.textContent = nowTs();
  const evt = document.createElement("span");
  evt.className = "evt";
  evt.textContent = name;
  const pl = document.createElement("span");
  pl.className = "payload";
  pl.textContent = payload;
  line.appendChild(ts);
  line.appendChild(evt);
  line.appendChild(pl);
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}
function fmt(obj) {
  try {
    const text = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
    return text.length > 800 ? text.slice(0, 800) + "…" : text;
  } catch (_) {
    return String(obj);
  }
}

// Handlers
const handlers = {
  input: (text) => showLine("input", fmt({ text })),
  request_start: (q) => showLine("request_start", fmt({ query: q })),
  request_end: (success, data, error) => {
    const cnt = Array.isArray(data)
      ? data.length
      : data && data.features
      ? data.features.length
      : 0;
    showLine(
      "request_end",
      fmt({
        success,
        suggestions: cnt,
        error: error && !error.canceled ? String(error) : undefined
      })
    );
  },
  suggestions: (items) =>
    showLine(
      "suggestions",
      fmt({ count: Array.isArray(items) ? items.length : 0 })
    ),
  select: (feature) => {
    const p = (feature && feature.properties) || {};
    showLine("select", fmt({ formatted: p.formatted, lat: p.lat, lon: p.lon }));
  },
  open: () => showLine("open", ""),
  close: () => showLine("close", ""),
  clear: (context) => showLine("clear", fmt({ context })),
  place_details_request_start: (feature) => {
    const p = (feature && feature.properties) || {};
    showLine(
      "place_details_request_start",
      fmt({ name: p.name || p.formatted })
    );
  },
  place_details_request_end: (success, feature, error) => {
    const p = (feature && feature.properties) || {};
    showLine(
      "place_details_request_end",
      fmt({
        success,
        name: p.name || p.formatted,
        error: error && !error.canceled ? String(error) : undefined
      })
    );
  },
  places_request_start: (categoryKeys) =>
    showLine("places_request_start", fmt({ categories: categoryKeys })),
  places_request_end: (success, data, error) => {
    const cnt = Array.isArray(data)
      ? data.length
      : data && data.features
      ? data.features.length
      : 0;
    showLine(
      "places_request_end",
      fmt({
        success,
        places: cnt,
        error: error && !error.canceled ? String(error) : undefined
      })
    );
  },
  places: (places) =>
    showLine(
      "places",
      fmt({ count: Array.isArray(places) ? places.length : 0 })
    ),
  place_select: (place, index) => {
    const p = (place && place.properties) || {};
    showLine(
      "place_select",
      fmt({ index, name: p.name || p.formatted, lat: p.lat, lon: p.lon })
    );
  }
};

// Subscribe / unsubscribe
function subscribe(evt) {
  if (!handlers[evt]) return;
  ac.on(evt, handlers[evt]);
}
function unsubscribe(evt) {
  if (!handlers[evt]) return;
  try {
    ac.off(evt, handlers[evt]);
  } catch (_) {}
}

// Wire checkboxes
EVENTS.forEach((e) => {
  const cb = document.getElementById(`evt-${e.key}`);
  if (!cb) return;
  // default subscribe
  subscribe(e.key);
  cb.addEventListener("change", () => {
    if (cb.checked) subscribe(e.key);
    else unsubscribe(e.key);
  });
});

function reapplySubscriptions() {
  EVENTS.forEach((e) => {
    const cb = document.getElementById(`evt-${e.key}`);
    if (!cb) return;
    if (cb.checked) subscribe(e.key);
  });
}

// Bulk actions
document.getElementById("select-all").addEventListener("click", () => {
  EVENTS.forEach((e) => {
    const cb = document.getElementById(`evt-${e.key}`);
    if (!cb) return;
    if (!cb.checked) {
      cb.checked = true;
      subscribe(e.key);
    }
  });
});
document.getElementById("deselect-all").addEventListener("click", () => {
  EVENTS.forEach((e) => {
    const cb = document.getElementById(`evt-${e.key}`);
    if (!cb) return;
    if (cb.checked) {
      cb.checked = false;
      unsubscribe(e.key);
    }
  });
});
document.getElementById("clear-log").addEventListener("click", () => {
  consoleEl.innerHTML = "";
});

// Options handling
document.getElementById("apply-options").addEventListener("click", () => {
  const debounce = parseInt(document.getElementById("opt-debounce").value, 10);
  const addDetails = document.getElementById("opt-details").checked;
  const addCategorySearch = document.getElementById("opt-categories").checked;
  initAutocomplete({
    debounceDelay: Number.isFinite(debounce) ? debounce : undefined,
    addDetails,
    addCategorySearch
  });
  reapplySubscriptions();
  showLine(
    "options_applied",
    JSON.stringify({ debounceDelay: debounce, addDetails, addCategorySearch })
  );
});