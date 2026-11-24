/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

const cityInput = document.getElementById("city");
const stateInput = document.getElementById("state");
const statusText = document.getElementById("status");

// ZIP field: the Autocomplete API searches postcodes only, in the US only
const zipField = new autocomplete.GeocoderAutocomplete(
  document.getElementById("zip-field"),
  yourAPIKey,
  {
    type: "postcode",
    filter: { countrycode: ["us"] },
    limit: 5,
    placeholder: "e.g. 02134",
    skipIcons: true,
    // Arrow keys only highlight a suggestion; Enter or a click selects it.
    // (By default each arrow key selects, and our select handler moves the cursor to Street.)
    skipSelectionOnArrowKey: true
  }
);

// Suggestion text: "02134 · Boston, MA" instead of the full formatted address
zipField.setPostprocessHook((feature) => {
  const p = feature.properties;
  const place = p.city || p.county || "";
  return `${p.postcode} · ${place}, ${p.state_code}`;
});

// Start with the ZIP code: put the cursor in the ZIP field
document.querySelector("#zip-field input").focus();

zipField.on("select", (feature) => {
  if (!feature) return; // the field was cleared: keep city and state

  const p = feature.properties;

  // Keep only the ZIP code in the ZIP field
  zipField.setValue(p.postcode);

  cityInput.value = p.city || "";
  stateInput.value = p.state_code || "";

  if (p.city) {
    statusText.textContent = `Filled from ZIP ${p.postcode}: ${p.city}, ${p.state_code}.`;
    document.getElementById("street").focus();
  } else {
    // Some ZIP codes come back without a city: let the user type it
    statusText.textContent = `ZIP ${p.postcode} is in ${p.state}. Please type your city.`;
    cityInput.focus();
  }
});

// "Check the address": geocode the whole address and show the confidence
const streetInput = document.getElementById("street");
const checkButton = document.getElementById("check-button");
const checkResult = document.getElementById("check-result");

// Each app picks its own threshold; 0.8 is a reasonable starting point
const GOOD_CONFIDENCE = 0.8;

document.getElementById("shipping-form").addEventListener("submit", (event) => {
  event.preventDefault();
  checkAddress();
});

function checkAddress() {
  const zip = zipField.getValue().trim();
  const street = streetInput.value.trim();
  const city = cityInput.value.trim();
  const state = stateInput.value.trim();

  if (!zip || !street) {
    showResult("review", "Type your ZIP code and street first.");
    return;
  }

  const params = new URLSearchParams({
    text: `${street}, ${city}, ${state} ${zip}`,
    filter: "countrycode:us",
    limit: 1,
    format: "json",
    apiKey: yourAPIKey
  });

  checkButton.disabled = true;
  showResult("checking", "Checking the address…");

  fetch(`https://api.geoapify.com/v1/geocode/search?${params}`)
    .then((response) => response.json())
    .then((data) => {
      checkButton.disabled = false;
      const found = data.results && data.results[0];

      if (!found) {
        showResult("review", "No match found. Check the address; you can still use it as typed.");
        return;
      }

      const rank = found.rank;

      // Confidence says how well the result matches what was sent.
      // result_type says what was found: a house ("building" or "amenity"),
      // or only a street or a postcode when the house number is missing.
      const foundHouse = ["building", "amenity"].includes(found.result_type);
      const status = rank.confidence >= GOOD_CONFIDENCE && foundHouse ? "good" : "review";

      let title = status === "good" ? "Looks good" : "Needs review";
      if (!foundHouse) {
        title = `Needs review: found a ${found.result_type}, not a house`;
      }

      showResult(status, `
        <strong>${title}</strong>
        <div>Found: ${found.formatted}</div>
        <table>
          <tr><td>Address confidence</td><td>${formatConfidence(rank.confidence)}</td></tr>
          <tr><td>Street</td><td>${formatConfidence(rank.confidence_street_level)}</td></tr>
          <tr><td>City</td><td>${formatConfidence(rank.confidence_city_level)}</td></tr>
        </table>
        <div class="kept">Your address is kept as you typed it.</div>
      `);
    });
}

function formatConfidence(value) {
  return typeof value === "number" ? value.toFixed(2) : "—";
}

function showResult(status, html) {
  checkResult.hidden = false;
  checkResult.className = `check-result ${status}`;
  checkResult.innerHTML = html;
}
