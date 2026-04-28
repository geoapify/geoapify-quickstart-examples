/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */

const geocodingPlaygroundForm = document.getElementById("geocoding-playground-form");
const addressModeInputs = document.querySelectorAll("input[name='addressMode']");
const modeDependentRows = document.querySelectorAll("[data-address-mode]");

const textInput = document.getElementById("text-input");
const textOptionsDatalist = document.getElementById("text-options");
const textClearButton = document.getElementById("text-clear-button");
const filterClearButton = document.getElementById("filter-clear-button");
const biasClearButton = document.getElementById("bias-clear-button");
const housenumberInput = document.getElementById("housenumber-input");
const streetInput = document.getElementById("street-input");
const postcodeInput = document.getElementById("postcode-input");
const cityInput = document.getElementById("city-input");
const countryInput = document.getElementById("country-input");
const filterCountrycodeSelect = document.getElementById("filter-countrycode-select");
const biasCountrycodeSelect = document.getElementById("bias-countrycode-select");
const requestUrlOutput = document.getElementById("request-url-output");
const sendRequestButton = document.getElementById("send-request-button");
const responsePreviewBlock = document.getElementById("response-preview-block");
const responseOutput = document.getElementById("response-output");

const GEOCODING_SEARCH_URL = "https://api.geoapify.com/v1/geocode/search";
const API_KEY_PREVIEW = "YOUR_API_KEY";
const API_KEY_EXECUTION = "5402608de7c44a2d95121c407ad2110b";
const COUNTRY_CODES = [
  "us",
  "ca",
  "mx",
  "gb",
  "de",
  "fr",
  "es",
  "it",
  "pl",
  "nl",
  "se",
  "no",
  "fi",
  "ua",
  "tr",
  "il",
  "ae",
  "in",
  "jp",
  "kr",
  "au",
  "nz",
  "br",
  "ar",
  "za",
];

const structuredAddressByText = {
  "21265 Biscayne Boulevard, Aventura, FL 33180, United States of America": {
    housenumber: "21265",
    street: "Biscayne Boulevard",
    postcode: "33180",
    city: "Aventura",
    country: "United States of America",
  },
  "54 Rue Du Moutier, 93300 Aubervilliers, France": {
    housenumber: "54",
    street: "Rue Du Moutier",
    postcode: "93300",
    city: "Aubervilliers",
    country: "France",
  },
  "Via Giuseppe Gioannetti, 9, 40127 Bologna BO, Italy": {
    housenumber: "9",
    street: "Via Giuseppe Gioannetti",
    postcode: "40127",
    city: "Bologna",
    country: "Italy",
  },
  "Wielandstraße 32, 60318 Frankfurt, Germany": {
    housenumber: "32",
    street: "Wielandstraße",
    postcode: "60318",
    city: "Frankfurt",
    country: "Germany",
  },
  "30 Bagot Street, Birmingham, B4 7AH, United Kingdom": {
    housenumber: "30",
    street: "Bagot Street",
    postcode: "B4 7AH",
    city: "Birmingham",
    country: "United Kingdom",
  },
};

let addressMode = getSelectedAddressMode();
populateTextAddressOptions(textOptionsDatalist, Object.keys(structuredAddressByText));
populateCountryCodeSelect(filterCountrycodeSelect, COUNTRY_CODES);
populateCountryCodeSelect(biasCountrycodeSelect, COUNTRY_CODES);
textInput.value = "";
filterCountrycodeSelect.selectedIndex = -1;
biasCountrycodeSelect.selectedIndex = -1;

let text = textInput.value.trim();
let housenumber = housenumberInput.value.trim();
let street = streetInput.value.trim();
let postcode = postcodeInput.value.trim();
let city = cityInput.value.trim();
let country = countryInput.value.trim();
let filterCountryCode = filterCountrycodeSelect.value;
let biasCountryCode = biasCountrycodeSelect.value;
let lastExecutedRequestUrl = "";

textInput.addEventListener("input", () => {
  text = textInput.value.trim();
  fillStructuredAddressFromSelectedText(text);
  syncTextClearButtonVisibility();
  updateRequestUrlPreview();
});

filterCountrycodeSelect.addEventListener("change", () => {
  filterCountryCode = filterCountrycodeSelect.value;
  syncFilterClearButtonVisibility();
  updateRequestUrlPreview();
});

biasCountrycodeSelect.addEventListener("change", () => {
  biasCountryCode = biasCountrycodeSelect.value;
  syncBiasClearButtonVisibility();
  updateRequestUrlPreview();
});

textClearButton.addEventListener("click", () => {
  clearSelectedTextAddress();
});

filterClearButton.addEventListener("click", () => {
  clearFilterCountryCode();
});

biasClearButton.addEventListener("click", () => {
  clearBiasCountryCode();
});

sendRequestButton.addEventListener("click", async () => {
  await sendGeocodingRequest();
});

for (const input of addressModeInputs) {
  input.addEventListener("change", () => {
    addressMode = getSelectedAddressMode();
    applyAddressMode(addressMode);
    updateRequestUrlPreview();
  });
}

for (const input of [
  housenumberInput,
  streetInput,
  postcodeInput,
  cityInput,
  countryInput,
]) {
  input.addEventListener("input", () => {
    updateRequestUrlPreview();
  });
}

applyAddressMode(addressMode);
syncTextClearButtonVisibility();
syncFilterClearButtonVisibility();
syncBiasClearButtonVisibility();
hideResponcePreview();
updateRequestUrlPreview();

function applyAddressMode(mode) {
  for (const row of modeDependentRows) {
    const rowMode = row.getAttribute("data-address-mode");
    const isActive = rowMode === mode;
    row.hidden = !isActive;

    const controls = row.querySelectorAll("input, select, textarea");
    for (const control of controls) {
      control.disabled = !isActive;
    }
  }
}

function getSelectedAddressMode() {
  const selectedInput = document.querySelector("input[name='addressMode']:checked");
  return selectedInput ? selectedInput.value : "unstructured";
}

function fillStructuredAddressFromSelectedText(selectedText) {
  if (!selectedText) {
    setStructuredAddressValues({
      housenumber: "",
      street: "",
      postcode: "",
      city: "",
      country: "",
    });
    return;
  }

  const structuredAddress = structuredAddressByText[selectedText];

  if (!structuredAddress) {
    return;
  }

  setStructuredAddressValues(structuredAddress);
}

function setStructuredAddressValues(values) {
  housenumberInput.value = values.housenumber;
  streetInput.value = values.street;
  postcodeInput.value = values.postcode;
  cityInput.value = values.city;
  countryInput.value = values.country;

  housenumber = housenumberInput.value.trim();
  street = streetInput.value.trim();
  postcode = postcodeInput.value.trim();
  city = cityInput.value.trim();
  country = countryInput.value.trim();
  updateRequestUrlPreview();
}

function clearSelectedTextAddress() {
  textInput.value = "";
  text = "";
  fillStructuredAddressFromSelectedText(text);
  syncTextClearButtonVisibility();
  updateRequestUrlPreview();
}

function syncTextClearButtonVisibility() {
  textClearButton.hidden = !textInput.value.trim();
}

function clearFilterCountryCode() {
  filterCountrycodeSelect.selectedIndex = -1;
  filterCountryCode = "";
  syncFilterClearButtonVisibility();
  updateRequestUrlPreview();
}

function clearBiasCountryCode() {
  biasCountrycodeSelect.selectedIndex = -1;
  biasCountryCode = "";
  syncBiasClearButtonVisibility();
  updateRequestUrlPreview();
}

function syncFilterClearButtonVisibility() {
  filterClearButton.hidden =
    filterCountrycodeSelect.selectedIndex === -1 || !filterCountrycodeSelect.value;
}

function syncBiasClearButtonVisibility() {
  biasClearButton.hidden =
    biasCountrycodeSelect.selectedIndex === -1 || !biasCountrycodeSelect.value;
}

function updateRequestUrlPreview() {
  const requestUrl = buildGeocodingRequestUrl(API_KEY_PREVIEW);
  requestUrlOutput.textContent = requestUrl;

  if (lastExecutedRequestUrl && requestUrl !== lastExecutedRequestUrl) {
    hideResponcePreview();
  }
}

async function sendGeocodingRequest() {
  const previewRequestUrl = buildGeocodingRequestUrl(API_KEY_PREVIEW);
  const executionRequestUrl = buildGeocodingRequestUrl(API_KEY_EXECUTION);
  requestUrlOutput.textContent = previewRequestUrl;
  showResponseBlock();
  responseOutput.textContent = "Loading...";
  sendRequestButton.disabled = true;

  try {
    const response = await fetch(executionRequestUrl);
    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}. ${responseText}`);
    }

    if (buildGeocodingRequestUrl(API_KEY_PREVIEW) !== previewRequestUrl) {
      hideResponcePreview();
      return;
    }

    const data = parseJsonSafely(responseText);
    responseOutput.textContent = JSON.stringify(data, null, 2);
    lastExecutedRequestUrl = previewRequestUrl;
  } catch (error) {
    if (buildGeocodingRequestUrl(API_KEY_PREVIEW) !== previewRequestUrl) {
      hideResponcePreview();
      return;
    }

    responseOutput.textContent = JSON.stringify(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      null,
      2,
    );
    lastExecutedRequestUrl = previewRequestUrl;
  } finally {
    sendRequestButton.disabled = false;
  }
}

function buildGeocodingRequestUrl(apiKeyValue) {
  const queryParts = [];
  const selectedAddressMode = getSelectedAddressMode();

  if (selectedAddressMode === "unstructured") {
    const textValue = textInput.value.trim();
    if (textValue) {
      pushEncodedParam(queryParts, "text", textValue);
    }
  } else {
    pushEncodedParamIfValue(queryParts, "housenumber", housenumberInput.value);
    pushEncodedParamIfValue(queryParts, "street", streetInput.value);
    pushEncodedParamIfValue(queryParts, "postcode", postcodeInput.value);
    pushEncodedParamIfValue(queryParts, "city", cityInput.value);
    pushEncodedParamIfValue(queryParts, "country", countryInput.value);
  }

  if (filterCountrycodeSelect.selectedIndex !== -1 && filterCountrycodeSelect.value) {
    pushEncodedParam(queryParts, "filter", `countrycode:${filterCountrycodeSelect.value}`);
  }

  if (biasCountrycodeSelect.selectedIndex !== -1 && biasCountrycodeSelect.value) {
    pushEncodedParam(queryParts, "bias", `countrycode:${biasCountrycodeSelect.value}`);
  }

  pushEncodedParam(queryParts, "format", "json");
  pushEncodedParam(queryParts, "apiKey", apiKeyValue);

  return `${GEOCODING_SEARCH_URL}?${queryParts.join("&")}`;
}

function pushEncodedParamIfValue(queryParts, key, value) {
  const normalizedValue = String(value).trim();
  if (normalizedValue) {
    pushEncodedParam(queryParts, key, normalizedValue);
  }
}

function pushEncodedParam(queryParts, key, value) {
  const encodedKey = encodeURIComponent(String(key));
  const encodedValue = encodeURIComponent(String(value));
  queryParts.push(`${encodedKey}=${encodedValue}`);
}

function parseJsonSafely(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function showResponseBlock() {
  responsePreviewBlock.hidden = false;
}

function hideResponcePreview() {
  responsePreviewBlock.hidden = true;
}

function populateCountryCodeSelect(selectElement, countryCodes) {
  const options = countryCodes.map((countryCode) => {
    const option = document.createElement("option");
    option.value = countryCode;
    option.textContent = countryCode;
    return option;
  });

  selectElement.append(...options);
}

function populateTextAddressOptions(datalistElement, addresses) {
  populateDatalistOptions(datalistElement, addresses);
}

function populateDatalistOptions(datalistElement, values) {
  const options = values.map((value) => {
    const option = document.createElement("option");
    option.value = value;
    return option;
  });

  datalistElement.append(...options);
}
