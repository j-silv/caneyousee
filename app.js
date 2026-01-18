const RED = "#E30000";
const GREEN = "#059400";

// keep only last N points in chart
const MAX_POINTS = 180;

// ---- UI refs ----
const statusText = document.getElementById("statusText");
const toggleBtn = document.getElementById("toggleBtn");
const notifBanner = document.getElementById("notif");
const baselineLabel = document.getElementById("baselineLabel");
const readout = document.getElementById("readout");
const vibeText = document.getElementById("vibeText");

// baseline label (static; you can update if you calibrate)
let baselineFt = 5.0;
baselineLabel.textContent = `${baselineFt.toFixed(1)} ft Baseline`;

// ---- Chart.js ----
const ctx = document.getElementById("chart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      data: [],
      borderWidth: 3,
      pointRadius: 0,
      tension: 0.35,
      borderColor: GREEN
    }]
  },
  options: {
    animation: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { display: true } }
  }
});

// ---- UI states ----
function setModeLevel() {
  notifBanner.style.display = "none";
  statusText.textContent = "Level Ground";
  statusText.style.color = GREEN;
  chart.data.datasets[0].borderColor = GREEN;

  toggleBtn.textContent = "Activate";
  toggleBtn.classList.add("on");
  toggleBtn.classList.remove("off");
}

function setModeLedge() {
  notifBanner.style.display = "block";
  statusText.textContent = "Ledge Ahead";
  statusText.style.color = RED;
  chart.data.datasets[0].borderColor = RED;

  toggleBtn.textContent = "Deactivate";
  toggleBtn.classList.add("off");
  toggleBtn.classList.remove("on");
}

// ---- Chart point function (called by poll) ----
function addPointToChart(timestamp, distanceFt) {
  const label = (typeof timestamp === "number") ? timestamp : Date.now();

  chart.data.labels.push(label);
  chart.data.datasets[0].data.push(distanceFt);

  if (chart.data.labels.length > MAX_POINTS) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update("none");
}

// ===================================================
// ✅ YOUR POLL FUNCTION (fetch JSON, update UI + chart)
// ===================================================

// IMPORTANT:
// - If the backend is on your SAME computer, localhost is correct.
// - If it’s on your FRIEND’S computer, replace localhost with their IP.
// Example: "http://192.168.1.23:5000/data"
const DATA_URL = "http://localhost:5000/data";

async function poll() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const json = await res.json();

  // update chart + readout
  readout.textContent = `${json.distance_ft.toFixed(2)} ft`;
  addPointToChart(json.timestamp, json.distance_ft);

  // vibration true/false drives UI
  const vib = Boolean(json.vibration);
  vibeText.textContent = `Vibration: ${vib ? "TRUE" : "FALSE"}`;

  if (vib) setModeLedge();
  else setModeLevel();
}

// Only poll while activated
let active = false;
let pollTimer = null;

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    poll().catch(() => {
      // If backend is down / CORS / network issue, don’t crash UI
      // Optional: show disconnected state
    });
  }, 50);
}

function stopPolling() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

// Activate/Deactivate
toggleBtn.addEventListener("click", () => {
  active = !active;

  if (active) {
    setModeLevel();
    startPolling();
  } else {
    stopPolling();
    setModeLevel();
    vibeText.textContent = "Vibration: --";
    readout.textContent = "-- ft";
  }
});

// init
setModeLevel();
startPolling();