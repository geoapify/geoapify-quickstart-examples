/**
 * Build deterministic demo coordinates in a city grid with tiny offsets.
 * @param {number} rows Number of grid rows.
 * @param {number} cols Number of grid columns.
 * @param {number} baseLat Base latitude.
 * @param {number} baseLon Base longitude.
 * @param {number} latStep Latitude delta per row.
 * @param {number} lonStep Longitude delta per column.
 * @param {number} latJitter Additional latitude noise.
 * @param {number} lonJitter Additional longitude noise.
 * @returns {{lat:number, lon:number}[]} Generated points.
 */
function buildCityGridPoints(rows, cols, baseLat, baseLon, latStep, lonStep, latJitter, lonJitter) {
  const points = [];
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      const latNoise = ((rowIndex * 17 + colIndex * 7) % 9) * latJitter;
      const lonNoise = ((rowIndex * 11 + colIndex * 13) % 9) * lonJitter;
      points.push({
        lat: Number((baseLat + rowIndex * latStep + latNoise).toFixed(6)),
        lon: Number((baseLon + colIndex * lonStep + lonNoise).toFixed(6)),
      });
    }
  }

  return points;
}

// Default dataset: New York City area (Manhattan/Brooklyn vicinity), 100 sources and 80 targets.
let sourceDestinations = buildCityGridPoints(10, 10, 40.7000, -74.0200, 0.0060, 0.0055, 0.00008, 0.00007);
let targetDestinations = buildCityGridPoints(8, 10, 40.7050, -74.0150, 0.0062, 0.0052, 0.00006, 0.00005);

// UI elements.
const hoverInfoElement = document.getElementById("hover-info");
const processingStatusElement = document.getElementById("processing-status");
const datasetInfoElement = document.getElementById("dataset-info");
const matrixTableElement = document.getElementById("matrix-table");
const apiLogOutputElement = document.getElementById("api-log-output");
const loadMatrixInputButton = document.getElementById("load-matrix-input-button");
const startProcessingButton = document.getElementById("start-processing-button");
const downloadResultsButton = document.getElementById("download-results-button");
const matrixSizeSelect = document.getElementById("matrix-size-select");
const customRowStepInput = document.getElementById("custom-row-step-input");
const customColStepInput = document.getElementById("custom-col-step-input");
const matrixValueTimeRadio = document.getElementById("matrix-value-time");
const matrixValueDistanceRadio = document.getElementById("matrix-value-distance");
const loadMatrixInputFileInput = document.getElementById("load-matrix-input-file");
const ROUTE_MATRIX_API_URL = "https://api.geoapify.com/v1/routematrix";

// Demo key for sample purposes. Replace with your own Geoapify API key:
// https://myprojects.geoapify.com/
const API_KEY_EXECUTION = "5402608de7c44a2d95121c407ad2110b";

let lastRouteMatrixResponse = null;
let isProcessing = false;
let matrixValueMode = "time";

// Initial UI state.
renderMatrixTable(sourceDestinations, targetDestinations);
setDatasetInfoForGeneratedSample();

// UI events.
loadMatrixInputButton.addEventListener("click", () => {
  loadMatrixInputFileInput.click();
});

loadMatrixInputFileInput.addEventListener("change", async (event) => {
  await onLoadMatrixInputFileChange(event);
});

startProcessingButton.addEventListener("click", async () => {
  await calculateBigMatrices();
});
downloadResultsButton.addEventListener("click", () => {
  downloadRouteMatrixResultsAsJson();
});
matrixSizeSelect.addEventListener("change", () => {
  syncMatrixSizeInputs();
});
matrixValueTimeRadio.addEventListener("change", onMatrixValueModeChange);
matrixValueDistanceRadio.addEventListener("change", onMatrixValueModeChange);
syncMatrixSizeInputs();
syncDownloadResultsButton();

/**
 * Split a large matrix into API-sized steps, process sequentially, and combine into one response.
 * @returns {Promise<object|undefined>} Combined matrix response.
 */
async function calculateBigMatrices() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  loadMatrixInputButton.disabled = true;
  startProcessingButton.disabled = true;
  matrixSizeSelect.disabled = true;
  customRowStepInput.disabled = true;
  customColStepInput.disabled = true;
  matrixValueTimeRadio.disabled = true;
  matrixValueDistanceRadio.disabled = true;
  lastRouteMatrixResponse = null;
  downloadResultsButton.hidden = true;
  processingStatusElement.textContent = "Processing started...";
  clearMatrixValues();
  clearApiLog();

  const matrixRequestData = {
    mode: "drive",
    units: "metric",
    sources: sourceDestinations.map((point) => ({ location: [point.lon, point.lat] })),
    targets: targetDestinations.map((point) => ({ location: [point.lon, point.lat] })),
  };
  const matrixApiRequestData = normalizeRouteMatrixInputData(matrixRequestData);
  const selectedMatrixSize = getSelectedMatrixSize();
  let { apiRequestRows, apiRequestCols } = selectedMatrixSize.type === "fixed"
    ? {
      apiRequestRows: Math.max(1, selectedMatrixSize.apiRequestRows),
      apiRequestCols: Math.max(1, selectedMatrixSize.apiRequestCols),
    }
    : getOptimalChunkCounts(
      matrixApiRequestData.sources.length,
      matrixApiRequestData.targets.length,
      1000
    );
  if (apiRequestRows * apiRequestCols > 1000) {
    apiRequestCols = Math.max(1, Math.floor(1000 / apiRequestRows));
  }
  const totalSteps = Math.ceil(matrixApiRequestData.sources.length / apiRequestRows)
    * Math.ceil(matrixApiRequestData.targets.length / apiRequestCols);
  
  try {
    const matrixResponse = await processLargeMatrixSequential(
      matrixApiRequestData,
      apiRequestRows,
      apiRequestCols,
      (stepProgress) => {
        handleMatrixStepProgress(stepProgress, totalSteps, apiRequestRows, apiRequestCols);
      },
      (errorProgress) => {
        appendMatrixApiErrorLog(errorProgress);
      }
    );

    lastRouteMatrixResponse = matrixResponse;
    syncDownloadResultsButton();
    processingStatusElement.textContent = `Processing completed. API matrix size: ${apiRequestRows} x ${apiRequestCols}.`;
    return matrixResponse;
  } catch (error) {
    console.error(error);
    processingStatusElement.textContent = `Processing failed: ${error.message}`;
    throw error;
  } finally {
    isProcessing = false;
    loadMatrixInputButton.disabled = false;
    startProcessingButton.disabled = false;
    matrixSizeSelect.disabled = false;
    customRowStepInput.disabled = false;
    customColStepInput.disabled = false;
    matrixValueTimeRadio.disabled = false;
    matrixValueDistanceRadio.disabled = false;
    syncDownloadResultsButton();
  }
}

/**
 * Validate and normalize matrix input data to a strict internal format.
 * @param {object} matrixRequestData Raw matrix request payload.
 * @returns {{mode:string, units:string, sources:{lat:number, lon:number}[], targets:{lat:number, lon:number}[]}}
 */
function normalizeRouteMatrixInputData(matrixRequestData) {
  const matrixPayload = extractMatrixPayload(matrixRequestData);
  const sources = parseRouteMatrixPoints(matrixPayload.sources, "sources");
  const rawTargets = matrixPayload.targets || matrixPayload.sources;
  const targets = parseRouteMatrixPoints(rawTargets, "targets");

  if (sources.length === 0 || targets.length === 0) {
    throw new Error("Matrix input must contain non-empty sources and targets.");
  }

  return {
    mode: matrixPayload.mode || "drive",
    units: matrixPayload.units || "metric",
    sources,
    targets,
  };
}

/**
 * Create an empty response object in Geoapify Route Matrix API response format.
 * @param {{mode:string, units:string, sources:{lat:number, lon:number}[], targets:{lat:number, lon:number}[]}} matrixInputData Normalized matrix request data.
 * @returns {object} Response skeleton.
 */
function createRouteMatrixResponseSkeleton(matrixInputData) {
  const responseSources = matrixInputData.sources.map((point) => {
    const location = [point.lon, point.lat];
    return {
      original_location: location,
      location,
    };
  });

  const responseTargets = matrixInputData.targets.map((point) => {
    const location = [point.lon, point.lat];
    return {
      original_location: location,
      location,
    };
  });

  const sourcesToTargets = matrixInputData.sources.map((_, sourceIndex) => {
    return matrixInputData.targets.map((__, targetIndex) => {
      return {
        distance: null,
        time: null,
        source_index: sourceIndex,
        target_index: targetIndex,
      };
    });
  });

  return {
    mode: matrixInputData.mode,
    units: matrixInputData.units,
    distance_units: matrixInputData.units === "imperial" ? "miles" : "meters",
    sources: responseSources,
    targets: responseTargets,
    sources_to_targets: sourcesToTargets,
  };
}

/**
 * Handle loading of a user-provided JSON matrix input file.
 * @param {Event} event File input change event.
 * @returns {Promise<void>}
 */
async function onLoadMatrixInputFileChange(event) {
  const fileInput = event.target;
  const selectedFile = fileInput.files && fileInput.files[0];
  if (!selectedFile) {
    return;
  }

  try {
    const matrixInput = await parseUploadedMatrixInputFile(selectedFile);
    sourceDestinations = matrixInput.sources;
    targetDestinations = matrixInput.targets;
    lastRouteMatrixResponse = null;
    syncDownloadResultsButton();
    setDatasetInfoForLoadedFile(selectedFile.name, sourceDestinations.length, targetDestinations.length);
    renderMatrixTable(sourceDestinations, targetDestinations);
    processingStatusElement.textContent = "Loaded input file. Click Start Processing.";
    hoverInfoElement.textContent = `Loaded ${sourceDestinations.length} sources and ${targetDestinations.length} targets from ${selectedFile.name}.`;
  } catch (error) {
    console.error(error);
    hoverInfoElement.textContent = `Failed to load file: ${error.message}`;
  } finally {
    fileInput.value = "";
  }
}

/**
 * Parse uploaded JSON and return normalized source/target points.
 * @param {File} file Uploaded JSON file.
 * @returns {Promise<{sources:{lat:number, lon:number}[], targets:{lat:number, lon:number}[]}>}
 */
async function parseUploadedMatrixInputFile(file) {
  const rawText = await file.text();
  let parsedJson;
  try {
    parsedJson = JSON.parse(rawText);
  } catch (error) {
    throw new Error("JSON parsing error.");
  }

  const matrixPayload = extractMatrixPayload(parsedJson);
  const sources = parseRouteMatrixPoints(matrixPayload.sources, "sources");
  const rawTargets = matrixPayload.targets || matrixPayload.sources;
  const targets = parseRouteMatrixPoints(rawTargets, "targets");

  if (sources.length === 0 || targets.length === 0) {
    throw new Error("Matrix input must contain non-empty sources and targets.");
  }

  return { sources, targets };
}

/**
 * Extract matrix payload from root object or request-like wrapper with a body field.
 * @param {object} jsonObject Parsed JSON object.
 * @returns {object} Matrix payload object.
 */
function extractMatrixPayload(jsonObject) {
  if (!jsonObject || typeof jsonObject !== "object") {
    throw new Error("JSON root must be an object.");
  }

  if (!("body" in jsonObject)) {
    return jsonObject;
  }

  if (typeof jsonObject.body === "string") {
    try {
      return JSON.parse(jsonObject.body);
    } catch (error) {
      throw new Error("Cannot parse request body JSON.");
    }
  }

  if (jsonObject.body && typeof jsonObject.body === "object") {
    return jsonObject.body;
  }

  throw new Error("Unsupported request body format.");
}

/**
 * Parse an array of source/target entries into normalized points.
 * @param {unknown[]} rawPoints Raw points array.
 * @param {string} fieldName Field label for error messages.
 * @returns {{lat:number, lon:number}[]} Normalized points.
 */
function parseRouteMatrixPoints(rawPoints, fieldName) {
  if (!Array.isArray(rawPoints)) {
    throw new Error(`Expected '${fieldName}' to be an array.`);
  }

  return rawPoints.map((entry, index) => normalizeRouteMatrixPoint(entry, fieldName, index));
}

/**
 * Normalize a single point from supported formats to {lat, lon}.
 * @param {unknown} entry Raw point entry.
 * @param {string} fieldName Field label for error messages.
 * @param {number} index Point index for error messages.
 * @returns {{lat:number, lon:number}} Normalized point.
 */
function normalizeRouteMatrixPoint(entry, fieldName, index) {
  let latValue;
  let lonValue;

  if (Array.isArray(entry) && entry.length >= 2) {
    lonValue = entry[0];
    latValue = entry[1];
  } else if (entry && typeof entry === "object") {
    if (Array.isArray(entry.location) && entry.location.length >= 2) {
      lonValue = entry.location[0];
      latValue = entry.location[1];
    } else if (Array.isArray(entry.coordinates) && entry.coordinates.length >= 2) {
      lonValue = entry.coordinates[0];
      latValue = entry.coordinates[1];
    } else if ("lat" in entry && "lon" in entry) {
      latValue = entry.lat;
      lonValue = entry.lon;
    }
  }

  const lat = Number(latValue);
  const lon = Number(lonValue);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Invalid point format in '${fieldName}' at index ${index}.`);
  }

  return { lat, lon };
}

/**
 * Render matrix table structure for all source/target indexes and attach UI events.
 * @param {{lat:number, lon:number}[]} sources Source points.
 * @param {{lat:number, lon:number}[]} targets Target points.
 */
function renderMatrixTable(sources, targets) {
  const tableHead = document.createElement("thead");
  const tableBody = document.createElement("tbody");

  const headerRow = document.createElement("tr");
  const cornerCell = document.createElement("th");
  cornerCell.textContent = "#";
  cornerCell.className = "corner";
  headerRow.append(cornerCell);

  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    const targetHeader = document.createElement("th");
    targetHeader.textContent = String(targetIndex);
    targetHeader.dataset.targetIndex = String(targetIndex);
    targetHeader.addEventListener("mouseenter", () => {
      showTargetInfo(targetIndex);
    });
    targetHeader.addEventListener("mouseleave", resetHoverInfo);
    headerRow.append(targetHeader);
  }

  tableHead.append(headerRow);

  for (let sourceIndex = 0; sourceIndex < sources.length; sourceIndex += 1) {
    const row = document.createElement("tr");

    const sourceHeader = document.createElement("th");
    sourceHeader.textContent = String(sourceIndex);
    sourceHeader.dataset.sourceIndex = String(sourceIndex);
    sourceHeader.addEventListener("mouseenter", () => {
      showSourceInfo(sourceIndex);
    });
    sourceHeader.addEventListener("mouseleave", resetHoverInfo);
    row.append(sourceHeader);

    for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
      const cell = document.createElement("td");
      cell.id = getMatrixCellId(sourceIndex, targetIndex);
      cell.dataset.sourceIndex = String(sourceIndex);
      cell.dataset.targetIndex = String(targetIndex);
      cell.addEventListener("mouseenter", () => {
        showCellInfo(sourceIndex, targetIndex);
      });
      cell.addEventListener("mouseleave", resetHoverInfo);
      cell.addEventListener("click", async () => {
        await copyMatrixCellResult(sourceIndex, targetIndex);
      });
      row.append(cell);
    }

    tableBody.append(row);
  }

  matrixTableElement.replaceChildren(tableHead, tableBody);
}

/**
 * Show hover info for a source row.
 * @param {number} sourceIndex Source index.
 */
function showSourceInfo(sourceIndex) {
  const source = sourceDestinations[sourceIndex];
  hoverInfoElement.textContent = [
    `Source #${sourceIndex}`,
    formatLocation(source),
  ].join(" | ");
}

/**
 * Show hover info for a target column.
 * @param {number} targetIndex Target index.
 */
function showTargetInfo(targetIndex) {
  const target = targetDestinations[targetIndex];
  hoverInfoElement.textContent = [
    `Target #${targetIndex}`,
    formatLocation(target),
  ].join(" | ");
}

/**
 * Show hover info for a matrix cell.
 * @param {number} sourceIndex Source index.
 * @param {number} targetIndex Target index.
 */
function showCellInfo(sourceIndex, targetIndex) {
  const source = sourceDestinations[sourceIndex];
  const target = targetDestinations[targetIndex];

  hoverInfoElement.textContent = [
    `Cell [${sourceIndex}, ${targetIndex}]`,
    `Source #${sourceIndex}: ${formatLocation(source)}`,
    `Target #${targetIndex}: ${formatLocation(target)}`,
  ].join(" | ");
}

/**
 * Convert a point to a readable text representation.
 * @param {{lat:number, lon:number}} point Point object.
 * @returns {string} Formatted location text.
 */
function formatLocation(point) {
  return `lat: ${point.lat}, lon: ${point.lon}`;
}

/**
 * Create the DOM id for a matrix cell.
 * @param {number} sourceIndex Source index.
 * @param {number} targetIndex Target index.
 * @returns {string} Cell id.
 */
function getMatrixCellId(sourceIndex, targetIndex) {
  return `matrix-cell-${sourceIndex}-${targetIndex}`;
}

/**
 * Set matrix cell values and visual state.
 * @param {number} sourceIndex Source index.
 * @param {number} targetIndex Target index.
 * @param {number|null|undefined} timeValue Time in seconds.
 * @param {number|null|undefined} distanceValue Distance in meters.
 */
function setMatrixCellValue(sourceIndex, targetIndex, timeValue, distanceValue) {
  const cellElement = document.getElementById(getMatrixCellId(sourceIndex, targetIndex));
  if (!cellElement) {
    return;
  }

  cellElement.dataset.time = Number.isFinite(Number(timeValue)) ? String(timeValue) : "";
  cellElement.dataset.distance = Number.isFinite(Number(distanceValue)) ? String(distanceValue) : "";
  cellElement.textContent = formatMatrixCellMetric(cellElement.dataset.time, cellElement.dataset.distance);

  if (cellElement.dataset.time || cellElement.dataset.distance) {
    cellElement.classList.add("is-filled");
  } else {
    cellElement.classList.remove("is-filled");
  }
}

/**
 * Reset all matrix cells to empty values.
 */
function clearMatrixValues() {
  const allCells = matrixTableElement.querySelectorAll("td");
  for (const cell of allCells) {
    cell.textContent = "";
    cell.classList.remove("is-filled");
    delete cell.dataset.time;
    delete cell.dataset.distance;
  }
}

/**
 * Format matrix cell value depending on selected display mode.
 * @param {string|number|undefined} timeValue Time value from dataset.
 * @param {string|number|undefined} distanceValue Distance value from dataset.
 * @returns {string} Display value.
 */
function formatMatrixCellMetric(timeValue, distanceValue) {
  if (matrixValueMode === "distance") {
    const normalizedDistance = Number(distanceValue);
    return Number.isFinite(normalizedDistance) ? String(Math.round(normalizedDistance)) : "-";
  }

  const normalizedTime = Number(timeValue);
  return Number.isFinite(normalizedTime) ? String(Math.round(normalizedTime)) : "-";
}

/**
 * Handle value mode switch (time/distance) and refresh visible cell values.
 */
function onMatrixValueModeChange() {
  matrixValueMode = matrixValueDistanceRadio.checked ? "distance" : "time";
  refreshMatrixCellValues();
}

/**
 * Re-render visible cell values after display mode changes.
 */
function refreshMatrixCellValues() {
  const allCells = matrixTableElement.querySelectorAll("td");
  for (const cell of allCells) {
    cell.textContent = formatMatrixCellMetric(cell.dataset.time, cell.dataset.distance);
  }
}

/**
 * Toggle visibility of custom matrix-size inputs.
 */
function syncMatrixSizeInputs() {
  const isCustom = matrixSizeSelect.value === "custom";
  customRowStepInput.hidden = !isCustom;
  customColStepInput.hidden = !isCustom;
}

/**
 * Read selected matrix step-size mode from UI.
 * @returns {{type:"fixed", apiRequestRows:number, apiRequestCols:number} | {type:"optimal"}}
 */
function getSelectedMatrixSize() {
  const selectedValue = matrixSizeSelect.value;
  if (selectedValue === "10x10") {
    return { type: "fixed", apiRequestRows: 10, apiRequestCols: 10 };
  }
  if (selectedValue === "20x30") {
    return { type: "fixed", apiRequestRows: 20, apiRequestCols: 30 };
  }
  if (selectedValue === "custom") {
    const apiRequestRows = Math.max(1, Math.floor(Number(customRowStepInput.value)));
    const apiRequestCols = Math.max(1, Math.floor(Number(customColStepInput.value)));
    return { type: "fixed", apiRequestRows, apiRequestCols };
  }

  return { type: "optimal" };
}

/**
 * Reset API log output to default state.
 */
function clearApiLog() {
  apiLogOutputElement.textContent = "No API errors.";
}

/**
 * Append one API step error line to the log panel.
 * @param {{sourceIndexStart:number, targetIndexStart:number, errorMessage:string}} errorProgress Error metadata.
 */
function appendMatrixApiErrorLog(errorProgress) {
  const nextLine = `[${new Date().toISOString()}] Step failed at sourceIndexStart=${errorProgress.sourceIndexStart}, targetIndexStart=${errorProgress.targetIndexStart}: ${errorProgress.errorMessage}`;
  if (apiLogOutputElement.textContent === "No API errors.") {
    apiLogOutputElement.textContent = nextLine;
  } else {
    apiLogOutputElement.textContent += `\n${nextLine}`;
  }
}

/**
 * Check whether response contains matrix results.
 * @param {any} response Candidate response object.
 * @returns {boolean} True when sources_to_targets exists.
 */
function hasRouteMatrixResults(response) {
  return Boolean(response && Array.isArray(response.sources_to_targets));
}

/**
 * Show/hide download button based on availability of results.
 */
function syncDownloadResultsButton() {
  downloadResultsButton.hidden = !hasRouteMatrixResults(lastRouteMatrixResponse);
}

/**
 * Download combined matrix results as a JSON file.
 */
function downloadRouteMatrixResultsAsJson() {
  if (!hasRouteMatrixResults(lastRouteMatrixResponse)) {
    return;
  }

  const jsonContent = JSON.stringify(lastRouteMatrixResponse, null, 2);
  const downloadBlob = new Blob([jsonContent], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(downloadBlob);
  const downloadLink = document.createElement("a");
  downloadLink.href = downloadUrl;
  downloadLink.download = "route-matrix-results.json";
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Apply one processed API step to UI progress and table cells.
 * @param {{processedSteps:number, sourceIndexStart:number, targetIndexStart:number, stepSourcesToTargets:any[][]}} stepProgress Step progress payload.
 * @param {number} totalSteps Total number of API calls planned.
 * @param {number} apiRequestRows Configured API rows per call.
 * @param {number} apiRequestCols Configured API cols per call.
 */
function handleMatrixStepProgress(stepProgress, totalSteps, apiRequestRows, apiRequestCols) {
  const processedSteps = Number(stepProgress.processedSteps || 0);
  processingStatusElement.textContent = `Processed API calls: ${processedSteps} / ${Number(totalSteps || 0)}. API matrix size: ${apiRequestRows} x ${apiRequestCols}.`;

  const sourceIndexStart = Number(stepProgress.sourceIndexStart || 0);
  const targetIndexStart = Number(stepProgress.targetIndexStart || 0);
  for (let localSourceIndex = 0; localSourceIndex < stepProgress.stepSourcesToTargets.length; localSourceIndex += 1) {
    const row = stepProgress.stepSourcesToTargets[localSourceIndex];

    for (let localTargetIndex = 0; localTargetIndex < row.length; localTargetIndex += 1) {
      const matrixCell = row[localTargetIndex];
      setMatrixCellValue(
        sourceIndexStart + localSourceIndex,
        targetIndexStart + localTargetIndex,
        matrixCell?.time,
        matrixCell?.distance
      );
    }
  }
}

/**
 * Reset hover info to default helper text.
 */
function resetHoverInfo() {
  hoverInfoElement.textContent = "Hover a source, target, or matrix cell.";
}

/**
 * Show dataset info for built-in generated sample.
 */
function setDatasetInfoForGeneratedSample() {
  datasetInfoElement.textContent = `Dataset: generated New York City area grid sample (${sourceDestinations.length} sources x ${targetDestinations.length} targets).`;
}

/**
 * Show dataset info for user-loaded file.
 * @param {string} fileName Loaded file name.
 * @param {number} sourcesCount Number of sources.
 * @param {number} targetsCount Number of targets.
 */
function setDatasetInfoForLoadedFile(fileName, sourcesCount, targetsCount) {
  datasetInfoElement.textContent = `Dataset: ${fileName} (${sourcesCount} sources x ${targetsCount} targets).`;
}

/**
 * Copy clicked cell data (source, destination, time, distance) to clipboard.
 * @param {number} sourceIndex Source index.
 * @param {number} targetIndex Target index.
 * @returns {Promise<void>}
 */
async function copyMatrixCellResult(sourceIndex, targetIndex) {
  const source = sourceDestinations[sourceIndex];
  const destination = targetDestinations[targetIndex];
  const cellElement = document.getElementById(getMatrixCellId(sourceIndex, targetIndex));
  const timeValue = Number(cellElement?.dataset.time);
  const distanceValue = Number(cellElement?.dataset.distance);

  const payload = {
    source: {
      index: sourceIndex,
      lat: source?.lat ?? null,
      lon: source?.lon ?? null,
    },
    destination: {
      index: targetIndex,
      lat: destination?.lat ?? null,
      lon: destination?.lon ?? null,
    },
    time: Number.isFinite(timeValue) ? timeValue : null,
    distance: Number.isFinite(distanceValue) ? distanceValue : null,
  };

  const copied = await copyTextToClipboard(JSON.stringify(payload, null, 2));
  if (copied) {
    hoverInfoElement.textContent = `Copied cell [${sourceIndex}, ${targetIndex}] to clipboard.`;
  } else {
    hoverInfoElement.textContent = `Cannot copy cell [${sourceIndex}, ${targetIndex}] in this browser context.`;
  }
}

/**
 * Copy text to clipboard using the modern Clipboard API.
 * @param {string} text Text to copy.
 * @returns {Promise<boolean>} True when copied.
 */
async function copyTextToClipboard(text) {
  if (!navigator.clipboard || !window.isSecureContext) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Process a large matrix sequentially by splitting it into API-sized steps and combining results.
 * @param {{mode:string, units:string, sources:{lat:number, lon:number}[], targets:{lat:number, lon:number}[]}} matrixApiRequestData Normalized matrix request data.
 * @param {number} apiRequestRows Number of source rows per API call.
 * @param {number} apiRequestCols Number of target cols per API call.
 * @param {(stepProgress:{processedSteps:number, sourceIndexStart:number, targetIndexStart:number, stepSourcesToTargets:any[][]}) => void} [onStepProcessed] Progress callback.
 * @param {(errorProgress:{sourceIndexStart:number, targetIndexStart:number, errorMessage:string}) => void} [onError] Error callback for failed steps.
 * @returns {Promise<object>} Combined matrix response object.
 */
async function processLargeMatrixSequential(
  matrixApiRequestData,
  apiRequestRows,
  apiRequestCols,
  onStepProcessed,
  onError
) {
  // Combined final response that is progressively filled with step results.
  const combinedResponse = createRouteMatrixResponseSkeleton(matrixApiRequestData);

  const { sources, targets, mode, units } = matrixApiRequestData;
  const rowCount = sources.length;
  const colCount = targets.length;
  let processedSteps = 0;

  for (let sourceIndexStart = 0; sourceIndexStart < rowCount; sourceIndexStart += apiRequestRows) {
    const stepSources = sources.slice(sourceIndexStart, sourceIndexStart + apiRequestRows);

    for (let targetIndexStart = 0; targetIndexStart < colCount; targetIndexStart += apiRequestCols) {
      const stepTargets = targets.slice(targetIndexStart, targetIndexStart + apiRequestCols);
      let stepSourcesToTargets;
      try {
        // One Geoapify Route Matrix API call for the current step.
        stepSourcesToTargets = await callGeoapifyRouteMatrixApiSourcesToTargets(
          stepSources,
          stepTargets,
          mode,
          units
        );
      } catch (error) {
        if (typeof onError === "function") {
          onError({
            sourceIndexStart,
            targetIndexStart,
            errorMessage: error.message,
          });
        }
        stepSourcesToTargets = stepSources.map(() => stepTargets.map(() => ({})));
      }

      // Copy current step results into the final matrix output.
      for (let localSourceIndex = 0; localSourceIndex < stepSourcesToTargets.length; localSourceIndex += 1) {
        const row = stepSourcesToTargets[localSourceIndex];

        for (let localTargetIndex = 0; localTargetIndex < row.length; localTargetIndex += 1) {
          const cell = row[localTargetIndex];
          const globalSourceIndex = sourceIndexStart + localSourceIndex;
          const globalTargetIndex = targetIndexStart + localTargetIndex;

          combinedResponse.sources_to_targets[globalSourceIndex][globalTargetIndex] = {
            distance: cell?.distance ?? null,
            time: cell?.time ?? null,
            source_index: globalSourceIndex,
            target_index: globalTargetIndex,
          };
        }
      }

      processedSteps += 1;
      if (typeof onStepProcessed === "function") {
        onStepProcessed({
          processedSteps,
          sourceIndexStart,
          targetIndexStart,
          stepSourcesToTargets,
        });
      }
    }
  }

  return combinedResponse;
}

/**
 * Call Geoapify Route Matrix API for one source/target step and return sources_to_targets.
 * @param {Array} sources Source points for one step.
 * @param {Array} targets Target points for one step.
 * @param {string} [mode="drive"] Routing mode.
 * @param {string} [units="metric"] Distance units.
 * @param {string} [apiKey=API_KEY_EXECUTION] Geoapify API key.
 * @returns {Promise<any[][]>} sources_to_targets matrix.
 */
async function callGeoapifyRouteMatrixApiSourcesToTargets(
  sources,
  targets,
  mode = "drive",
  units = "metric",
  apiKey = API_KEY_EXECUTION
) {
  // Accept multiple point formats, normalize to {lat, lon}, then convert to API payload.
  const normalizedSources = parseRouteMatrixPoints(sources, "sources");
  const normalizedTargets = parseRouteMatrixPoints(targets, "targets");
  const requestBody = {
    mode,
    units,
    sources: normalizedSources.map((point) => ({ location: [point.lon, point.lat] })),
    targets: normalizedTargets.map((point) => ({ location: [point.lon, point.lat] })),
  };

  const requestUrl = `${ROUTE_MATRIX_API_URL}?apiKey=${encodeURIComponent(apiKey)}`;
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Route Matrix API request failed (${response.status}): ${responseText}`);
  }

  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    throw new Error("Route Matrix API response is not valid JSON.");
  }

  if (!Array.isArray(responseData.sources_to_targets)) {
    throw new Error("Route Matrix API response does not contain 'sources_to_targets'.");
  }

  return responseData.sources_to_targets;
}

/**
 * Find API step sizes that minimize estimated Geoapify request cost under matrix element limit.
 * @param {number} sourcesCount Total number of sources.
 * @param {number} targetsCount Total number of targets.
 * @param {number} [maxMatrixElements=1000] Maximum rows*cols per API call.
 * @returns {{apiRequestRows:number, apiRequestCols:number}} Suggested step sizes.
 */
function getOptimalChunkCounts(sourcesCount, targetsCount, maxMatrixElements = 1000) {
  const s = Math.max(1, Math.floor(Number(sourcesCount)));
  const t = Math.max(1, Math.floor(Number(targetsCount)));
  const m = Math.max(1, Math.floor(Number(maxMatrixElements)));
  // Keep best chunk steps by total estimated API cost. Tie-breaker prefers larger chunks.
  let best = { apiRequestRows: 1, apiRequestCols: Math.min(t, m), totalCost: Number.POSITIVE_INFINITY, stepArea: 0 };
  // Iterate candidate row chunk size. For each, derive the largest valid col chunk size.
  for (let apiRequestRows = 1; apiRequestRows <= Math.min(s, m); apiRequestRows += 1) {
    // Per-request hard limit: rows * cols <= maxMatrixElements.
    const apiRequestCols = Math.max(1, Math.min(t, Math.floor(m / apiRequestRows)));
    let totalCost = 0;
    // Simulate all chunked requests, including edge chunks that may be smaller.
    for (let r = 0; r < s; r += apiRequestRows) for (let c = 0; c < t; c += apiRequestCols) {
      const rs = Math.min(apiRequestRows, s - r), cs = Math.min(apiRequestCols, t - c);
      // Geoapify cost per request: max(rows, cols) * min(rows, cols, 10).
      totalCost += Math.max(rs, cs) * Math.min(Math.min(rs, cs), 10);
    }
    const stepArea = apiRequestRows * apiRequestCols;
    if (totalCost < best.totalCost || (totalCost === best.totalCost && stepArea > best.stepArea)) {
      best = { apiRequestRows, apiRequestCols, totalCost, stepArea };
    }
  }
  return { apiRequestRows: best.apiRequestRows, apiRequestCols: best.apiRequestCols };
}
