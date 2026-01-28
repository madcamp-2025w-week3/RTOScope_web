const el = (id) => document.getElementById(id);
const tasksEl = document.getElementById("tasks");
const ganttCanvas = document.getElementById("ganttChart");
const ganttLegend = document.getElementById("ganttLegend");
const ctx = ganttCanvas.getContext("2d");

// Gantt chart history
const GANTT_DURATION = 10; // seconds to show
const ganttHistory = []; // { time, taskName }
let startTime = null;

// Task colors for Gantt
const taskColors = [
  "#2196f3", "#4caf50", "#ff9800", "#9c27b0", "#e91e63",
  "#00bcd4", "#8bc34a", "#ffc107", "#673ab7", "#f44336"
];
const taskColorMap = {};
let colorIndex = 0;

function getTaskColor(taskName) {
  if (!taskColorMap[taskName]) {
    taskColorMap[taskName] = taskColors[colorIndex % taskColors.length];
    colorIndex++;
  }
  return taskColorMap[taskName];
}

function stateIcon(state) {
  switch (state) {
    case "Running": return "▶";
    case "Ready": return "●";
    case "Waiting": return "○";
    case "Blocked": return "■";
    case "Suspended": return "✕";
    default: return "?";
  }
}

function formatNumber(n) {
  return typeof n === "number" ? n.toLocaleString() : "-";
}

function getMissClass(count) {
  if (count >= 10) return "high";
  if (count >= 1) return "medium";
  return "low";
}

function render(data) {
  // Scheduler name display
  el("scheduler").textContent = data.schedulerName ?? "-";

  // Kernel status
  el("state").textContent = data.state ?? "-";
  el("ticks").textContent = formatNumber(data.ticks);
  el("vtime").textContent = data.virtualTime != null ? `${data.virtualTime.toFixed(3)}s` : "-";
  el("cpu").textContent = data.cpuUtilization != null ? `${data.cpuUtilization.toFixed(1)}%` : "-";
  el("idle").textContent = data.idleTime != null ? `${data.idleTime.toFixed(3)}s` : "-";
  el("ready").textContent = data.readyTaskCount != null ? `${data.readyTaskCount} tasks` : "-";
  el("ctx").textContent = formatNumber(data.contextSwitchCount);
  el("current").textContent = data.currentTaskName ?? "-";

  // Task list with CPU and Miss
  tasksEl.innerHTML = "";
  const tasks = data.tasks || [];
  for (const t of tasks) {
    const div = document.createElement("div");
    div.className = "task";

    const name = document.createElement("span");
    name.textContent = `${stateIcon(t.state)} ${t.name}`;
    name.title = t.name;

    const pri = document.createElement("span");
    pri.textContent = `${t.priority}`;

    const step = document.createElement("span");
    step.textContent = `[${t.currentStep}/${t.totalSteps}]`;

    const per = document.createElement("span");
    per.textContent = `${t.periodMs}ms`;

    const cpuSpan = document.createElement("span");
    const cpuVal = t.cpuUsage != null ? t.cpuUsage.toFixed(1) : "0.0";
    cpuSpan.textContent = `${cpuVal}%`;

    const missSpan = document.createElement("span");
    missSpan.className = `miss-count ${getMissClass(t.missCount || 0)}`;
    missSpan.textContent = t.missCount ?? 0;

    div.append(name, pri, step, per, cpuSpan, missSpan);
    tasksEl.appendChild(div);
  }

  // Idle task
  if (data.idle) {
    const div = document.createElement("div");
    div.className = "task";
    const name = document.createElement("span");
    name.textContent = `${stateIcon(data.idle.state)} ${data.idle.name}`;
    const pri = document.createElement("span");
    pri.textContent = "-";
    const step = document.createElement("span");
    step.textContent = "-";
    const per = document.createElement("span");
    per.textContent = "-";
    const cpuSpan = document.createElement("span");
    cpuSpan.textContent = "-";
    const missSpan = document.createElement("span");
    missSpan.className = "miss-count low";
    missSpan.textContent = "0";
    div.append(name, pri, step, per, cpuSpan, missSpan);
    tasksEl.appendChild(div);
  }

  // Update Gantt history - DETECT GAME RESTART
  if (data.currentTaskName && data.virtualTime != null) {
    // Detect game restart: if new virtualTime is much smaller than last recorded
    if (startTime !== null && data.virtualTime < 1.0 && ganttHistory.length > 0) {
      const lastTime = ganttHistory[ganttHistory.length - 1].time + startTime;
      if (lastTime > 5.0) {
        // Game restarted - clear history
        ganttHistory.length = 0;
        startTime = null;
        console.log("[Dashboard] Game restart detected, resetting Gantt chart");
      }
    }

    if (startTime === null) startTime = data.virtualTime;
    const relTime = data.virtualTime - startTime;
    ganttHistory.push({ time: relTime, taskName: data.currentTaskName });

    // Remove old entries beyond GANTT_DURATION
    const cutoff = relTime - GANTT_DURATION;
    while (ganttHistory.length > 0 && ganttHistory[0].time < cutoff) {
      ganttHistory.shift();
    }
  }

  drawGantt(data.tasks || []);
}

function drawGantt(tasks) {
  const width = ganttCanvas.width;
  const height = ganttCanvas.height;
  
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, width, height);

  if (ganttHistory.length < 2) return;

  const taskNames = [...new Set(ganttHistory.map(h => h.taskName))];
  const rowHeight = Math.min(30, (height - 40) / Math.max(taskNames.length, 1));
  const startY = 30;

  // Time range
  const minTime = ganttHistory[0].time;
  const maxTime = ganttHistory[ganttHistory.length - 1].time;
  const timeRange = Math.max(maxTime - minTime, 1);

  // Draw time axis
  ctx.fillStyle = "#b4c2d3";
  ctx.font = "10px monospace";
  ctx.textAlign = "left";
  for (let i = 0; i <= 5; i++) {
    const t = minTime + (timeRange * i / 5);
    const x = (i / 5) * (width - 20) + 10;
    ctx.fillText(`${t.toFixed(1)}s`, x, 15);
  }

  // Draw task lanes
  ctx.textAlign = "right";
  taskNames.forEach((taskName, idx) => {
    const y = startY + idx * rowHeight;
    
    // Task label
    ctx.fillStyle = "#b4c2d3";
    ctx.font = "10px monospace";
    const shortName = taskName.length > 12 ? taskName.substring(0, 12) + ".." : taskName;

    // Draw execution blocks
    ctx.fillStyle = getTaskColor(taskName);
    for (let i = 0; i < ganttHistory.length - 1; i++) {
      if (ganttHistory[i].taskName === taskName) {
        const t1 = ganttHistory[i].time;
        const t2 = ganttHistory[i + 1].time;
        const x1 = ((t1 - minTime) / timeRange) * (width - 20) + 10;
        const x2 = ((t2 - minTime) / timeRange) * (width - 20) + 10;
        ctx.fillRect(x1, y + 2, Math.max(x2 - x1, 2), rowHeight - 4);
      }
    }

    // Task name on left
    ctx.fillStyle = "#e9f2ff";
    ctx.textAlign = "left";
    ctx.fillText(shortName, 12, y + rowHeight / 2 + 3);
  });

  // Update legend
  updateLegend(taskNames);
}

function updateLegend(taskNames) {
  ganttLegend.innerHTML = "";
  taskNames.forEach(name => {
    const item = document.createElement("div");
    item.className = "legend-item";
    
    const colorBox = document.createElement("div");
    colorBox.className = "legend-color";
    colorBox.style.backgroundColor = getTaskColor(name);
    
    const label = document.createElement("span");
    label.textContent = name;
    
    item.append(colorBox, label);
    ganttLegend.appendChild(item);
  });
}

async function poll() {
  try {
    const res = await fetch("/status");
    const data = await res.json();
    render(data);
  } catch (_) {
    // ignore transient errors
  }
}

// Resize canvas for HiDPI
function resizeCanvas() {
  const rect = ganttCanvas.getBoundingClientRect();
  ganttCanvas.width = rect.width;
  ganttCanvas.height = 300;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

setInterval(poll, 200);
poll();
