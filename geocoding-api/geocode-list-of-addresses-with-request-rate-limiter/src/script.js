// 100 well-known museum addresses worldwide.
const MUSEUM_ADDRESSES = [
  "Louvre Museum, Rue de Rivoli, 75001 Paris, France",
  "Musee d'Orsay, 1 Rue de la Legion d'Honneur, 75007 Paris, France",
  "Centre Pompidou, Place Georges-Pompidou, 75004 Paris, France",
  "British Museum, Great Russell St, London WC1B 3DG, United Kingdom",
  "National Gallery, Trafalgar Square, London WC2N 5DN, United Kingdom",
  "Tate Modern, Bankside, London SE1 9TG, United Kingdom",
  "Victoria and Albert Museum, Cromwell Rd, London SW7 2RL, United Kingdom",
  "Rijksmuseum, Museumstraat 1, 1071 XX Amsterdam, Netherlands",
  "Van Gogh Museum, Museumplein 6, 1071 DJ Amsterdam, Netherlands",
  "Anne Frank House, Westermarkt 20, 1016 GV Amsterdam, Netherlands",
  "Prado Museum, Calle de Ruiz de Alarcon 23, 28014 Madrid, Spain",
  "Museo Reina Sofia, Calle de Santa Isabel 52, 28012 Madrid, Spain",
  "Guggenheim Museum Bilbao, Abandoibarra Etorbidea 2, 48009 Bilbao, Spain",
  "Uffizi Galleries, Piazzale degli Uffizi 6, 50122 Florence, Italy",
  "Vatican Museums, Viale Vaticano, 00165 Rome, Italy",
  "Galleria Borghese, Piazzale Scipione Borghese 5, 00197 Rome, Italy",
  "Egyptian Museum, Via Accademia delle Scienze 6, 10123 Turin, Italy",
  "Acropolis Museum, Dionysiou Areopagitou 15, 11742 Athens, Greece",
  "Benaki Museum, Koumpari 1, 10674 Athens, Greece",
  "Pergamon Museum, Bodestrasse 1-3, 10178 Berlin, Germany",
  "Neues Museum, Bodestrasse 1-3, 10178 Berlin, Germany",
  "Deutsches Museum, Museumsinsel 1, 80538 Munich, Germany",
  "Kunsthistorisches Museum, Maria-Theresien-Platz, 1010 Vienna, Austria",
  "Belvedere Museum, Prinz Eugen-Strasse 27, 1030 Vienna, Austria",
  "Albertina Museum, Albertinaplatz 1, 1010 Vienna, Austria",
  "National Museum Prague, Vaclavske namesti 68, 11000 Prague, Czechia",
  "POLIN Museum of the History of Polish Jews, Anielewicza 6, 00-157 Warsaw, Poland",
  "National Museum in Warsaw, Aleje Jerozolimskie 3, 00-495 Warsaw, Poland",
  "Hermitage Museum, Palace Square 2, St Petersburg, Russia",
  "Tretyakov Gallery, Lavrushinsky Lane 10, Moscow, Russia",
  "National Museum of Anthropology, Av. Paseo de la Reforma and Calzada Gandhi, Mexico City, Mexico",
  "Frida Kahlo Museum, Londres 247, Coyoacan, Mexico City, Mexico",
  "Museo Soumaya, Blvd. Miguel de Cervantes Saavedra 303, Mexico City, Mexico",
  "The Metropolitan Museum of Art, 1000 5th Ave, New York, NY 10028, USA",
  "Museum of Modern Art (MoMA), 11 W 53rd St, New York, NY 10019, USA",
  "Solomon R. Guggenheim Museum, 1071 5th Ave, New York, NY 10128, USA",
  "American Museum of Natural History, 200 Central Park West, New York, NY 10024, USA",
  "Whitney Museum of American Art, 99 Gansevoort St, New York, NY 10014, USA",
  "Brooklyn Museum, 200 Eastern Pkwy, Brooklyn, NY 11238, USA",
  "Smithsonian National Museum of Natural History, 10th St and Constitution Ave NW, Washington, DC 20560, USA",
  "National Gallery of Art, Constitution Ave NW, Washington, DC 20565, USA",
  "Smithsonian National Air and Space Museum, 600 Independence Ave SW, Washington, DC 20560, USA",
  "Art Institute of Chicago, 111 S Michigan Ave, Chicago, IL 60603, USA",
  "Museum of Contemporary Art Chicago, 220 E Chicago Ave, Chicago, IL 60611, USA",
  "Field Museum, 1400 S DuSable Lake Shore Dr, Chicago, IL 60605, USA",
  "Getty Center, 1200 Getty Center Dr, Los Angeles, CA 90049, USA",
  "Los Angeles County Museum of Art, 5905 Wilshire Blvd, Los Angeles, CA 90036, USA",
  "The Broad, 221 S Grand Ave, Los Angeles, CA 90012, USA",
  "San Francisco Museum of Modern Art, 151 3rd St, San Francisco, CA 94103, USA",
  "de Young Museum, 50 Hagiwara Tea Garden Dr, San Francisco, CA 94118, USA",
  "Legion of Honor Museum, 100 34th Ave, San Francisco, CA 94121, USA",
  "Royal Ontario Museum, 100 Queens Park, Toronto, ON M5S 2C6, Canada",
  "Art Gallery of Ontario, 317 Dundas St W, Toronto, ON M5T 1G4, Canada",
  "Montreal Museum of Fine Arts, 1380 Sherbrooke St W, Montreal, QC H3G 1J5, Canada",
  "National Gallery of Canada, 380 Sussex Dr, Ottawa, ON K1N 9N4, Canada",
  "Inhotim Museum, Brumadinho, Minas Gerais, Brazil",
  "Sao Paulo Museum of Art, Av. Paulista 1578, Sao Paulo, Brazil",
  "Museu do Amanha, Praca Maua 1, Rio de Janeiro, Brazil",
  "National Museum of Fine Arts, Av. Rio Branco 199, Rio de Janeiro, Brazil",
  "Museo Nacional de Bellas Artes, Av. del Libertador 1473, Buenos Aires, Argentina",
  "MALBA, Av. Pres. Figueroa Alcorta 3415, Buenos Aires, Argentina",
  "Museo de Arte de Lima, Paseo Colon 125, Lima, Peru",
  "Museo Chileno de Arte Precolombino, Bandera 361, Santiago, Chile",
  "Gold Museum, Cra. 6 #15-88, Bogota, Colombia",
  "National Museum of Colombia, Cra. 7 #28-66, Bogota, Colombia",
  "National Museum of China, 16 E Chang'an Ave, Dongcheng, Beijing, China",
  "Palace Museum (Forbidden City), 4 Jingshan Front St, Dongcheng, Beijing, China",
  "Shanghai Museum, 201 Renmin Ave, Huangpu, Shanghai, China",
  "Power Station of Art, 200 Huayuangang Rd, Shanghai, China",
  "Hong Kong Museum of Art, 10 Salisbury Rd, Tsim Sha Tsui, Hong Kong",
  "M+ Museum, 38 Museum Dr, West Kowloon, Hong Kong",
  "National Palace Museum, No. 221, Sec 2, Zhishan Rd, Shilin, Taipei, Taiwan",
  "Tokyo National Museum, 13-9 Uenokoen, Taito City, Tokyo, Japan",
  "National Museum of Western Art, 7-7 Uenokoen, Taito City, Tokyo, Japan",
  "Mori Art Museum, 6-10-1 Roppongi, Minato City, Tokyo, Japan",
  "Kyoto National Museum, 527 Chayacho, Higashiyama Ward, Kyoto, Japan",
  "National Museum of Korea, 137 Seobinggo-ro, Yongsan-gu, Seoul, South Korea",
  "Leeum Museum of Art, 60-16 Itaewon-ro 55-gil, Yongsan-gu, Seoul, South Korea",
  "National Palace Museum of Korea, 12 Hyoja-ro, Jongno-gu, Seoul, South Korea",
  "National Gallery Singapore, 1 St Andrew's Rd, Singapore 178957",
  "ArtScience Museum, 6 Bayfront Ave, Singapore 018974",
  "Indian Museum, 27 Jawaharlal Nehru Rd, Kolkata 700016, India",
  "National Museum, Janpath Rd, New Delhi 110011, India",
  "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya, 159-161 Mahatma Gandhi Rd, Mumbai 400023, India",
  "Salar Jung Museum, Salar Jung Rd, Hyderabad 500002, India",
  "National Museum Bangkok, Na Phra That Rd, Bangkok 10200, Thailand",
  "Bangkok Art and Culture Centre, 939 Rama I Rd, Bangkok 10330, Thailand",
  "Vietnam Museum of Ethnology, Nguyen Van Huyen Rd, Hanoi, Vietnam",
  "War Remnants Museum, 28 Vo Van Tan, District 3, Ho Chi Minh City, Vietnam",
  "National Museum of Cambodia, Preah Ang Eng St, Phnom Penh, Cambodia",
  "National Museum of Indonesia, Jl. Medan Merdeka Barat No.12, Jakarta, Indonesia",
  "Museum MACAN, AKR Tower Level M, Jl. Panjang No.5, Jakarta, Indonesia",
  "Australian Museum, 1 William St, Sydney NSW 2010, Australia",
  "Art Gallery of New South Wales, Art Gallery Rd, Sydney NSW 2000, Australia",
  "National Gallery of Victoria, 180 St Kilda Rd, Melbourne VIC 3006, Australia",
  "Museum of New Zealand Te Papa Tongarewa, 55 Cable St, Wellington 6011, New Zealand",
  "Auckland War Memorial Museum, Parnell, Auckland 1010, New Zealand",
  "Iziko South African Museum, 25 Queen Victoria St, Cape Town 8001, South Africa",
  "Musee de l'Orangerie, Jardin des Tuileries, 75001 Paris, France",
  "Egyptian Museum, Tahrir Square, Cairo, Egypt",
];

const addressesTextarea = document.getElementById("addresses-textarea");
const geocodingProgressElement = document.getElementById("geocoding-progress");
const geocodeButton = document.getElementById("geocode-button");
const geocodeButtonSpinner = document.getElementById("geocode-button-spinner");
const geocodeButtonLabel = document.getElementById("geocode-button-label");
const downloadJsonButton = document.getElementById("download-json-button");
const downloadCsvButton = document.getElementById("download-csv-button");

const GEOCODING_SEARCH_URL = "https://api.geoapify.com/v1/geocode/search";
const API_KEY_EXECUTION = "5402608de7c44a2d95121c407ad2110b";
const MAX_REQUESTS_PER_INTERVAL = 5;
const RATE_LIMIT_INTERVAL_MS = 1000;
const DEFAULT_ADDRESSES_TEXT = MUSEUM_ADDRESSES.join("\n");
let geocodingResults = null;

addressesTextarea.addEventListener("input", onAddressesInput);
geocodeButton.addEventListener("click", geocodeWithRateLimits);
downloadJsonButton.addEventListener("click", downloadGeocodingResultsAsJson);
downloadCsvButton.addEventListener("click", downloadGeocodingResultsAsCsv);

addressesTextarea.value = DEFAULT_ADDRESSES_TEXT;
updateGeocodingProgress();
setGeocodeButtonLoading(false);
setDownloadButtonsReady(false);

function onAddressesInput() {
  updateGeocodingProgress();
  geocodingResults = null;
  setDownloadButtonsReady(false);
}

async function geocodeWithRateLimits() {
  const addresses = getAddressesToGeocode();
  const totalAddresses = addresses.length;

  geocodingResults = null;
  setGeocodeButtonLoading(true);
  setDownloadButtonsReady(false);
  setGeocodingControlsDisabled(true);
  setGeocodingProgress(0, totalAddresses);

  if (totalAddresses === 0) {
    setGeocodeButtonLoading(false);
    setGeocodingControlsDisabled(false);
    return;
  }

  try {
    const requestRateLimiter = getRequestRateLimiter();
    const requests = addresses.map((address) => createGeocodingRequest(address));

    const rateLimitedResults = await requestRateLimiter.rateLimitedRequests(
      requests,
      MAX_REQUESTS_PER_INTERVAL,
      RATE_LIMIT_INTERVAL_MS,
      {
        onProgress: ({ completedRequests, totalRequests }) => {
          setGeocodingProgress(completedRequests, totalRequests);
        },
      }
    );

    if (!Array.isArray(rateLimitedResults)) {
      throw new Error("Unexpected rate-limiter result format.");
    }

    geocodingResults = rateLimitedResults;
    setDownloadButtonsReady(true);
  } catch (error) {
    console.error("Geocoding failed:", error);
  } finally {
    setGeocodeButtonLoading(false);
    setGeocodingControlsDisabled(false);
  }
}

function updateGeocodingProgress() {
  geocodingProgressElement.textContent = `${getAddressesToGeocode().length} addresses`;
}

function setGeocodingProgress(completedAddresses, totalAddresses) {
  geocodingProgressElement.textContent = `${completedAddresses} / ${totalAddresses} addresses geocoded`;
}

function getAddressesToGeocode() {
  return String(addressesTextarea.value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function getRequestRateLimiter() {
  const requestRateLimiter = window.RequestRateLimiter;
  if (!requestRateLimiter || typeof requestRateLimiter.rateLimitedRequests !== "function") {
    throw new Error("RequestRateLimiter library is unavailable.");
  }

  return requestRateLimiter;
}

function createGeocodingRequest(address) {
  return async () => {
    try {
      const response = await fetch(buildGeocodingRequestUrl(address));

      if (!response.ok) {
        return {
          address,
          error: `Request failed with status ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        address,
        result: data.results && data.results.length ? data.results[0] : null,
      };
    } catch (error) {
      return {
        address,
        error: String(error),
      };
    }
  };
}

function buildGeocodingRequestUrl(address) {
  const params = new URLSearchParams();
  params.set("text", address);
  params.set("limit", "1");
  params.set("format", "json");
  params.set("apiKey", API_KEY_EXECUTION);
  return `${GEOCODING_SEARCH_URL}?${params.toString()}`;
}

function setGeocodingControlsDisabled(isDisabled) {
  addressesTextarea.disabled = isDisabled;
  geocodeButton.disabled = isDisabled;
  downloadJsonButton.disabled = isDisabled || !Array.isArray(geocodingResults);
  downloadCsvButton.disabled = isDisabled || !Array.isArray(geocodingResults);
}

function setGeocodeButtonLoading(isLoading) {
  geocodeButtonLabel.textContent = isLoading ? "Geocoding..." : "Geocode";
  geocodeButtonSpinner.hidden = !isLoading;
  geocodeButton.setAttribute("aria-busy", isLoading ? "true" : "false");
}

function setDownloadButtonsReady(isReady) {
  downloadJsonButton.hidden = !isReady;
  downloadCsvButton.hidden = !isReady;
  downloadJsonButton.disabled = !isReady;
  downloadCsvButton.disabled = !isReady;
}

function downloadGeocodingResultsAsJson() {
  if (!Array.isArray(geocodingResults)) {
    return;
  }

  const payload = {
    totalAddresses: geocodingResults.length,
    geocodedAt: new Date().toISOString(),
    results: geocodingResults,
  };

  downloadFile(
    JSON.stringify(payload, null, 2),
    "application/json",
    `geocoding-results-${buildTimestampForFileName()}.json`
  );
}

function downloadGeocodingResultsAsCsv() {
  if (!Array.isArray(geocodingResults)) {
    return;
  }

  const csvRows = [
    [
      "input_address",
      "status",
      "error",
      "confidence",
      "formatted",
      "lat",
      "lon",
      "country",
      "city",
      "postcode",
    ],
  ];

  for (const geocodingItem of geocodingResults) {
    const result = geocodingItem && geocodingItem.result ? geocodingItem.result : null;
    const status = geocodingItem && geocodingItem.error ? "error" : "ok";

    csvRows.push([
      geocodingItem && geocodingItem.address ? geocodingItem.address : "",
      status,
      geocodingItem && geocodingItem.error ? geocodingItem.error : "",
      result && result.rank && result.rank.confidence != null ? result.rank.confidence : "",
      result && result.formatted ? result.formatted : "",
      result && result.lat != null ? result.lat : "",
      result && result.lon != null ? result.lon : "",
      result && result.country ? result.country : "",
      result && result.city ? result.city : "",
      result && result.postcode ? result.postcode : "",
    ]);
  }

  downloadFile(
    convertRowsToCsv(csvRows),
    "text/csv;charset=utf-8",
    `geocoding-results-${buildTimestampForFileName()}.csv`
  );
}

function convertRowsToCsv(rows) {
  return rows
    .map((row) => row.map((value) => escapeCsvCell(value)).join(","))
    .join("\n");
}

function escapeCsvCell(value) {
  const text = String(value);
  const escaped = text.replaceAll('"', '""');
  return `"${escaped}"`;
}

function downloadFile(contents, mimeType, fileName) {
  const blob = new Blob([contents], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = blobUrl;
  downloadLink.download = fileName;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(blobUrl);
}

function buildTimestampForFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

window.addressListApi = {
  getAddressesToGeocode,
};
