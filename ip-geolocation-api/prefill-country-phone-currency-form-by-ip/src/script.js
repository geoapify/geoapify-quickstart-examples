/* Demo API key for quickstart only.
   Register for your own free API key at https://myprojects.geoapify.com/.
   Benefits: usage analytics, project-level limits, and reliable access for production use.
   This demo key can be blocked or restricted at any time. */
const yourAPIKey = "5402608de7c44a2d95121c407ad2110b";

// ISO 3166-1 alpha-2 country codes for the Country select
const countryCodes = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS " +
  "BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ " +
  "FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT " +
  "JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP " +
  "MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE " +
  "RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV " +
  "TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW").split(" ");

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });

const countrySelect = document.getElementById("country");
const phonePrefixInput = document.getElementById("phone-prefix");
const currencySelect = document.getElementById("currency");
const prefillNote = document.getElementById("prefill-note");
const result = document.getElementById("result");
const ipInput = document.getElementById("ip-input");

// Turns "US" into the 🇺🇸 flag emoji (two regional indicator symbols)
function flagEmoji(isoCode) {
  return String.fromCodePoint(...[...isoCode].map((letter) => 0x1f1a5 + letter.charCodeAt(0)));
}

function addCountryOption(isoCode, name) {
  const option = document.createElement("option");
  option.value = isoCode;
  option.textContent = `${flagEmoji(isoCode)} ${name}`;
  countrySelect.appendChild(option);
}

function addCurrencyOption(code) {
  const option = document.createElement("option");
  option.value = code;
  option.textContent = `${code} – ${currencyNames.of(code)}`;
  currencySelect.appendChild(option);
}

function hasOption(select, value) {
  return [...select.options].some((option) => option.value === value);
}

// Fill both selects once: countries by name, currencies the browser knows
countryCodes
  .map((code) => ({ code, name: regionNames.of(code) }))
  .sort((a, b) => a.name.localeCompare(b.name))
  .forEach((country) => addCountryOption(country.code, country.name));

Intl.supportedValuesOf("currency").forEach(addCurrencyOption);

function clearPrefill(message) {
  countrySelect.value = "";
  phonePrefixInput.value = "";
  currencySelect.value = "";
  prefillNote.textContent = message;
  prefillNote.classList.add("is-error");
}

function applyPrefill(data) {
  const country = data.country;
  prefillNote.classList.remove("is-error");

  // Country: the select value is the two-letter ISO code
  if (country.iso_code) {
    if (!hasOption(countrySelect, country.iso_code)) {
      addCountryOption(country.iso_code, country.name || country.iso_code);
    }
    countrySelect.value = country.iso_code;
  }

  // Phone: the API returns the calling code without "+"
  phonePrefixInput.value = country.phone_code ? `+${country.phone_code}` : "";

  // Currency: can be one code ("EUR") or several, separated by commas
  const currencies = (country.currency || "").split(",").map((code) => code.trim()).filter(Boolean);
  currencies.forEach((code) => {
    if (!hasOption(currencySelect, code)) addCurrencyOption(code);
  });
  currencySelect.value = currencies.length ? currencies[0] : "";

  prefillNote.textContent = "Pre-filled from your approximate location. You can change it.";
}

function lookUpIp(ip) {
  const params = new URLSearchParams({ apiKey: yourAPIKey });
  if (ip) params.set("ip", ip); // without "ip", the API uses the IP of whoever sends the request

  prefillNote.classList.remove("is-error");
  prefillNote.textContent = "Detecting your approximate location…";

  fetch(`https://api.geoapify.com/v1/ipinfo?${params}`)
    .then((response) => response.json().then((data) => ({ ok: response.ok, status: response.status, data })))
    .then(({ ok, status, data }) => {
      if (!ok) {
        clearPrefill(`Couldn't detect a location (HTTP ${status}). Please check the IP address or fill in the fields.`);
        return;
      }
      if (!data.country) {
        clearPrefill("No country found for this IP address. Please fill in the fields.");
        return;
      }
      applyPrefill(data);
    });
}

// "Try another IP" sends the entered address as ?ip=
document.getElementById("ip-form").addEventListener("submit", (event) => {
  event.preventDefault();
  lookUpIp(ipInput.value.trim());
});

// The form isn't sent anywhere: the button only shows the chosen values
document.getElementById("checkout-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const countryOption = countrySelect.selectedOptions[0];
  const phone = `${phonePrefixInput.value} ${document.getElementById("phone").value}`.trim();
  const rows = [
    ["Name", document.getElementById("full-name").value || "—"],
    ["Country", countrySelect.value ? countryOption.textContent : "—"],
    ["Phone", phone || "—"],
    ["Currency", currencySelect.value || "—"]
  ];
  result.innerHTML = "<strong>You chose:</strong>";
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.textContent = `${label}: ${value}`;
    result.appendChild(row);
  });
  result.hidden = false;
});

// Start: use ?ip= from the page URL, or the visitor's own IP
const ipFromUrl = new URLSearchParams(window.location.search).get("ip") || "";
ipInput.value = ipFromUrl;
lookUpIp(ipFromUrl);
