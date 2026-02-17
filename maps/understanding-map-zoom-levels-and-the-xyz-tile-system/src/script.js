// 👉 Replace with your own API key. Sign up at https://www.geoapify.com/ to get one.
const API_KEY = "f82ea38cb77543d59c597faaa263e714";
const BASE = "https://maps.geoapify.com/v1/tile/klokantech-basic"; // check more map styles here https://apidocs.geoapify.com/docs/maps/
const TILE_SIZE = 256; // px, stndard size for raster maps

const ZOOM_LEVELS = 4; // ztoom levels to draw

const app = document.getElementById("app");
const gridToggle = document.getElementById("gridToggle");

const canvasEls = []; // store canvas elements to redraw with or without grid

// Load a single tile
function loadTile(z, x, y) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ img, x, y });
    img.onerror = reject;
    img.src = `${BASE}/${z}/${x}/${y}.png?apiKey=${API_KEY}`;
  });
}

// Draw grid lines
function drawGrid(ctx, grid, width, height) {
  ctx.strokeStyle = "rgba(0,0,0,0.4)";
  ctx.lineWidth = 1;
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.textBaseline = "top";

  for (let i = 0; i <= grid; i++) {
    const pos = i * TILE_SIZE;
    // vertical lines
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, height);
    ctx.stroke();
    // horizontal lines
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(width, pos);
    ctx.stroke();
  }
  
  // Draw labels in each tile (top-left corner)
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const label = `${grid}/${x}/${y}`;
      const px = x * TILE_SIZE + 4;
      const py = y * TILE_SIZE + 4;
      // optional shadow for better contrast
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.8)";
      ctx.shadowBlur = 2;
      ctx.fillText(label, px, py);
      ctx.restore();
    }
  }
}

// Render collage for a given zoom
async function renderZoom(z) {
  const grid = 2 ** z; // number of tiles across
  const width = grid * TILE_SIZE;
  const height = grid * TILE_SIZE;

  const ctx = canvasEls[z].getContext("2d");

  const promises = [];
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      promises.push(
        loadTile(z, x, y).then(({ img, x, y }) => {
          ctx.drawImage(img, x * TILE_SIZE, y * TILE_SIZE);
        })
      );
    }
  }

  try {
    await Promise.all(promises);
    if (gridToggle.checked) {
      drawGrid(ctx, grid, width, height);
    }
  } catch (err) {
    console.error(`Error loading tiles for zoom ${z}`, err);
  }
}

async function renderMaps() {
  for (let z = 0; z <= ZOOM_LEVELS; z++) {
    await renderZoom(z);
  }
}

// Watch for grid toggle changes
gridToggle.addEventListener("change", () => {
  renderMaps();
});

// Render zoom levels 0–4
(async () => {
  for (let z = 0; z <= ZOOM_LEVELS; z++) {
    const grid = 2 ** z; // number of tiles across
    const width = grid * TILE_SIZE;
    const height = grid * TILE_SIZE;

    // create DOM elements
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = `Zoom ${z} — ${grid}×${grid} tiles = ${
      grid * grid
    } total`;
    row.appendChild(label);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    row.appendChild(canvas);

    // store canvas elements to redraw maps later
    canvasEls.push(canvas);

    app.appendChild(row);
  }
  renderMaps();
})();