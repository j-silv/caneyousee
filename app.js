const RED = "#E30000";
const GREEN = "#059400";

const LEDGE_THRESHOLD_FT = 0.8;
const MUST_PERSIST_MS = 700;
const EMA_ALPHA = 0.25;

let active = false;
let baselineFt = 5.0;

let lastSmooth = null;
let ledgeCandidateStart = null;
let ledgeDetected = false;

// Notification gating
let notifEnabled = false;
let lastNotifyAt = 0;
const NOTIFY_COOLDOWN_MS = 8000; // don’t spam notifications

const statusText = document.getElementById("statusText");
const toggleBtn = document.getElementById("toggleBtn");
const notifBanner = document.getElementById("notif");
const baselineLabel = document.getElementById("baselineLabel");
const readout = document.getElementById("readout");

// NEW
const notifyBtn = document.getElementById("notifyBtn");

baselineLabel.textContent = `${baselineFt.toFixed(1)} ft Baseline`;

// ---- Chart.js ----
const ctx = document.getElementById("chart").getContext("2d");
const MAX_POINTS = 180;

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

function setModeLevel() {
  ledgeDetected = false;
  notifBanner.style.display = "none";

  statusText.textContent = "Level Ground";
  statusText.style.color = GREEN;
  chart.data.datasets[0].borderColor = GREEN;

  toggleBtn.textContent = "Activate";
  toggleBtn.classList.add("on");
  toggleBtn.classList.remove("off");
}

function setModeLedge() {
  ledgeDetected = true;

  // In-app banner
  notifBanner.style.display = "block";

  statusText.textContent = "Ledge Ahead";
  statusText.style.color = RED;
  chart.data.datasets[0].borderColor = RED;

  toggleBtn.textContent = "Deactivate";
  toggleBtn.classList.add("off");
  toggleBtn.classList.remove("on");

  // NEW: Browser notification (once per ledge event, with cooldown)
  maybeSendBrowserNotification();
}

function smooth(ft) {
  if (lastSmooth == null) lastSmooth = ft;
  lastSmooth = EMA_ALPHA * ft + (1 - EMA_ALPHA) * lastSmooth;
  return lastSmooth;
}

function maybeSendBrowserNotification() {
  const now = Date.now();
  if (!notifEnabled) return;
  if (now - lastNotifyAt < NOTIFY_COOLDOWN_MS) return;

  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  lastNotifyAt = now;

  new Notification("Ledge Ahead", {
    body: "Edge of sidewalk reached. Continue carefully and look for nearby crosswalks.",
    // icon: "./icon.png" // optional if you have one
  });
}

// NEW: request permission only when user clicks (required by browsers)
notifyBtn?.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    alert("Notifications aren’t supported in this browser.");
    return;
  }

  const perm = await Notification.requestPermission();
  notifEnabled = (perm === "granted");

  notifyBtn.textContent = notifEnabled ? "Notifications Enabled" : "Enable Notifications";
});

// ---- Core sample handler ----
function onDistanceSample(rawFt) {
  const ft = smooth(rawFt);
  readout.textContent = `${ft.toFixed(2)} ft`;

  const aboveBaseline = ft > (baselineFt + LEDGE_THRESHOLD_FT);

  if (aboveBaseline) {
    if (ledgeCandidateStart == null) ledgeCandidateStart = performance.now();
    const elapsed = performance.now() - ledgeCandidateStart;

    if (!ledgeDetected && elapsed >= MUST_PERSIST_MS) {
      setModeLedge();
    }
  } else {
    ledgeCandidateStart = null;
    if (ledgeDetected) setModeLevel();
  }

  chart.data.labels.push(Date.now());
  chart.data.datasets[0].data.push(ft);

  if (chart.data.labels.length > MAX_POINTS) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.update("none");
}

// ---- WebSocket hookup ----
let ws = null;
let reconnectTimer = null;

function connectWS() {
  const WS_URL = "ws://localhost:8000/ws";
  ws = new WebSocket(WS_URL);

  ws.addEventListener("open", () => {
    try { ws.send(JSON.stringify({ type: "hello" })); } catch {}
  });

  ws.addEventListener("message", (event) => {
    if (!active) return;

    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    let ft = null;
    if (msg && (msg.type === "distance" || msg.type == null)) {
      if (typeof msg.distance_ft === "number") ft = msg.distance_ft;
      else if (typeof msg.distance_cm === "number") ft = msg.distance_cm / 30.48;
      else if (typeof msg.distance === "number") ft = msg.distance;
    }

    if (typeof ft === "number" && Number.isFinite(ft)) {
      onDistanceSample(ft);
    }
  });

  ws.addEventListener("close", scheduleReconnect);
  ws.addEventListener("error", () => {});
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWS();
  }, 800);
}

connectWS();

// ---- Activate / Deactivate ----
toggleBtn.addEventListener("click", () => {
  active = !active;

  if (active) {
    ledgeCandidateStart = null;
    lastSmooth = null;
    setModeLevel();

    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "activate" })); } catch {}
    }
  } else {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "deactivate" })); } catch {}
    }
    setModeLevel();
  }
});
