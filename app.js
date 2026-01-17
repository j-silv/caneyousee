const RED = "E30000";
const GREEN = "059400";


// Constants
const LEDGE_THRSHOLD_FT = 0.8; // Distance > baseline + threshold is ledge
const MUST_PERSIST_MS = 700;
const EMA_ALPHA = 0.25;


// State 

let active = false;
let timer = null;


let lastSmooth = null;
let ledgeCandidateStart = null;
let ledgeDetected = false;


const statusText = document.getElementById("statusText");
const readout = document.getElementById("readout");
const baselineLabel = document.getElementById("baselineLabel");
const notif = document.getElementById("notif");
const toggleBtn = document.getElementById("toggleBtn");
const chart = document.getElementById("chart");


baselineLabel.textContent = `${baselineFt.toFixed(1)} ft Baseline`;

// Chart

const ctx = document.getElementById("chart").getContext("2d");
const MAX_POINTS = 100;

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
    scales: {
      x: { display: false },
      y: { display: true }
    }
  }
});

function setModeLevel() {
  ledgeDetected = false;
  notif.style.display = "none";
  statusText.textContent = "Level Ground";
  statusText.style.color = GREEN;
  chart.data.datasets[0].borderColor = GREEN;
  
  toggleBtn.textContent = "Activate";
  toggleBtn.classList.remove("off");
  toggleBtn.classList.add("on");
}