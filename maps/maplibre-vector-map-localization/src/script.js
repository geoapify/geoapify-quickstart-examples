// Demo API key for quickstart only.
// Register for your own free API key at https://myprojects.geoapify.com/.
// This demo key can be blocked or restricted at any time.
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const config = {
  mapContainerId: "map",
  mapStyleSelectId: "mapStyleSelect",
  languageSelectId: "languageSelect",
  applyButtonId: "applySettingsButton",
  statusBoxId: "statusBox",
  initialCenter: [13.405, 52.52], // Berlin (lng, lat)
  initialZoom: 5
};

const mapStyles = [
  { value: "osm-bright-grey", label: "OSM Bright Grey" },
  { value: "osm-bright", label: "OSM Bright" },
  { value: "osm-bright-smooth", label: "OSM Bright Smooth" },
  { value: "osm-liberty", label: "OSM Liberty" },
  { value: "positron", label: "Positron" },
  { value: "klokantech-basic", label: "Klokantech Basic" },
  { value: "dark-matter-brown", label: "Dark Matter Brown" },
  { value: "dark-matter-dark-grey", label: "Dark Matter Dark Grey" },
  { value: "dark-matter-black", label: "Dark Matter Black" }
];

const languages = [
  { value: "default", label: "Default (using the default map style)" },
  { value: "bg", label: "Bulgarian (bg)" },
  { value: "hr", label: "Croatian (hr)" },
  { value: "cs", label: "Czech (cs)" },
  { value: "da", label: "Danish (da)" },
  { value: "nl", label: "Dutch (nl)" },
  { value: "en", label: "English (en)" },
  { value: "et", label: "Estonian (et)" },
  { value: "fi", label: "Finnish (fi)" },
  { value: "fr", label: "French (fr)" },
  { value: "de", label: "German (de)" },
  { value: "el", label: "Greek (el)" },
  { value: "hu", label: "Hungarian (hu)" },
  { value: "ga", label: "Irish (ga)" },
  { value: "it", label: "Italian (it)" },
  { value: "lv", label: "Latvian (lv)" },
  { value: "lt", label: "Lithuanian (lt)" },
  { value: "mt", label: "Maltese (mt)" },
  { value: "pl", label: "Polish (pl)" },
  { value: "pt", label: "Portuguese (pt)" },
  { value: "ro", label: "Romanian (ro)" },
  { value: "ru", label: "Russian (ru)" },
  { value: "sk", label: "Slovak (sk)" },
  { value: "sl", label: "Slovenian (sl)" },
  { value: "es", label: "Spanish (es)" },
  { value: "sv", label: "Swedish (sv)" },
  { value: "uk", label: "Ukrainian (uk)" }
];

let map;
let currentLanguage = "default";
let currentMapStyleId = "osm-bright-grey";
// Cache original layer text fields so "default" can fully restore map style behavior.
let originalTextFieldsByLayerId = new Map();

function getGeoapifyStyleUrl(styleId) {
  return `https://maps.geoapify.com/v1/styles/${styleId}/style.json?apiKey=${yourAPIKey}`;
}

function initMap() {
  map = new maplibregl.Map({
    container: config.mapContainerId,
    style: getGeoapifyStyleUrl(currentMapStyleId),
    center: config.initialCenter,
    zoom: config.initialZoom
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

  map.on("style.load", () => {
    cacheOriginalTextFields();
    applyMapLanguage(currentLanguage);
  });
}

function initLocalizationStarter() {
  const mapStyleSelect = document.getElementById(config.mapStyleSelectId);
  const languageSelect = document.getElementById(config.languageSelectId);
  const applyButton = document.getElementById(config.applyButtonId);

  fillStyleOptions(mapStyleSelect);
  fillLanguageOptions(languageSelect);

  mapStyleSelect.addEventListener("change", () => {
    onMapStyleChange(mapStyleSelect.value);
  });

  applyButton.addEventListener("click", () => {
    const selectedLanguage = languageSelect.value;
    onApplyLanguage(selectedLanguage);
  });
}

function fillStyleOptions(selectElement) {
  mapStyles.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    selectElement.appendChild(option);
  });

  selectElement.value = currentMapStyleId;
}

function fillLanguageOptions(selectElement) {
  languages.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    selectElement.appendChild(option);
  });

  selectElement.value = currentLanguage;
}

function onApplyLanguage(selectedLanguage) {
  currentLanguage = selectedLanguage;
  applyMapLanguage(currentLanguage);
}

function onMapStyleChange(selectedStyleId) {
  if (selectedStyleId === currentMapStyleId) {
    return;
  }

  currentMapStyleId = selectedStyleId;
  updateStatus(`Applying style: "${selectedStyleId}"...`);
  map.setStyle(getGeoapifyStyleUrl(currentMapStyleId));
}

function applyMapLanguage(languageCode) {
  const style = map.getStyle();
  if (!style || !style.layers) {
    updateStatus("Map style is not ready yet.");
    return;
  }

  let updatedLayersCount = 0;

  style.layers.forEach((layer) => {
    if (layer.type !== "symbol") {
      return;
    }

    const originalTextField = originalTextFieldsByLayerId.get(layer.id);
    if (originalTextField === undefined) {
      return;
    }

    // Default mode restores the exact original style field.
    // Otherwise, use localized name first and fallback to original style logic.
    const nextTextField = languageCode === "default"
      ? deepClone(originalTextField)
      : buildLocalizedTextFieldExpression(originalTextField, languageCode);

    const currentTextField = layer.layout && layer.layout["text-field"];
    if (deepEqual(currentTextField, nextTextField)) {
      return;
    }

    map.setLayoutProperty(layer.id, "text-field", nextTextField);
    updatedLayersCount += 1;
  });

  if (languageCode === "default") {
    updateStatus(`Applied language: "default". Restored ${updatedLayersCount} label layers.`);
    return;
  }

  updateStatus(`Applied language: "${languageCode}". Updated ${updatedLayersCount} label layers.`);
}

function cacheOriginalTextFields() {
  originalTextFieldsByLayerId = new Map();

  const style = map.getStyle();
  if (!style || !style.layers) {
    return;
  }

  style.layers.forEach((layer) => {
    if (layer.type !== "symbol") {
      return;
    }

    const textField = layer.layout && layer.layout["text-field"];
    if (textField === undefined) {
      return;
    }

    originalTextFieldsByLayerId.set(layer.id, deepClone(textField));
  });
}

function buildLocalizedTextFieldExpression(originalTextField, languageCode) {
  // Always try localized name first; if not available, evaluate original style text field.
  return [
    "coalesce",
    localizedNameExpression(languageCode),
    textFieldToExpression(originalTextField)
  ];
}

function textFieldToExpression(textField) {
  if (Array.isArray(textField)) {
    return deepClone(textField);
  }

  if (typeof textField === "string") {
    return tokenTemplateToExpression(textField);
  }

  return textField;
}

function tokenTemplateToExpression(template) {
  // Convert legacy token templates like "{name}\n{ref}" into expression form
  // so they can be used as fallback inside "coalesce".
  const parts = [];
  let cursor = 0;
  const tokenRegex = /\{([^}]+)\}/g;
  let match;

  while ((match = tokenRegex.exec(template)) !== null) {
    const staticText = template.slice(cursor, match.index);
    if (staticText) {
      parts.push(staticText);
    }

    const propertyName = match[1].trim();
    parts.push(["to-string", ["coalesce", ["get", propertyName], ""]]);

    cursor = match.index + match[0].length;
  }

  const tail = template.slice(cursor);
  if (tail) {
    parts.push(tail);
  }

  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  return ["concat", ...parts];
}

function localizedNameExpression(languageCode) {
  // Support both GeoJSON naming patterns used in tile sources.
  return [
    "coalesce",
    ["get", `name:${languageCode}`],
    ["get", `name_${languageCode}`],
    ["get", "name"],
    ["get", "name_int"]
  ];
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function updateStatus(message) {
  const statusBox = document.getElementById(config.statusBoxId);
  statusBox.textContent = message;
}

initMap();
initLocalizationStarter();
