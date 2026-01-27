const el = (id) => document.getElementById(id);
const tasksEl = document.getElementById("tasks");

function formatNumber(n) {
  return typeof n === "number" ? n.toLocaleString() : "-";
}

function render(data) {
  el("state").textContent = data.state ?? "-";
  el("ticks").textContent = formatNumber(data.ticks);
  el("vtime").textContent = data.virtualTime != null ? `${data.virtualTime.toFixed(3)}s` : "-";
  el("cpu").textContent = data.cpuUtilization != null ? `${data.cpuUtilization.toFixed(1)}%` : "-";
  el("idle").textContent = data.idleTime != null ? `${data.idleTime.toFixed(3)}s` : "-";
  el("ready").textContent = data.readyTaskCount != null ? `${data.readyTaskCount} tasks` : "-";
  el("ctx").textContent = formatNumber(data.contextSwitchCount);
  el("current").textContent = data.currentTaskName ?? "-";

  tasksEl.innerHTML = "";
  const tasks = data.tasks || [];
  for (const t of tasks) {
    const div = document.createElement("div");
    div.className = "task";
    const name = document.createElement("span");
    name.textContent = `${t.name} (${t.state})`;
    const pri = document.createElement("span");
    pri.textContent = `P:${t.priority}`;
    const step = document.createElement("span");
    step.textContent = `[${t.currentStep}/${t.totalSteps}]`;
    const per = document.createElement("span");
    per.textContent = `${t.periodMs}ms`;
    div.append(name, pri, step, per);
    tasksEl.appendChild(div);
  }

  if (data.idle) {
    const div = document.createElement("div");
    div.className = "task";
    const name = document.createElement("span");
    name.textContent = `${data.idle.name} (${data.idle.state})`;
    const pri = document.createElement("span");
    pri.textContent = "Idle";
    const step = document.createElement("span");
    step.textContent = "-";
    const per = document.createElement("span");
    per.textContent = "-";
    div.append(name, pri, step, per);
    tasksEl.appendChild(div);
  }
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

setInterval(poll, 200);
poll();
