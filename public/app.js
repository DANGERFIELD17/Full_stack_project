const form = document.getElementById("report-form");
const filtersForm = document.getElementById("filters-form");
const refreshButton = document.getElementById("refresh-button");
const messageEl = document.getElementById("message");
const reportsList = document.getElementById("reports-list");
const statTotal = document.getElementById("stat-total");
const statOpen = document.getElementById("stat-open");
const statInProgress = document.getElementById("stat-inProgress");
const statResolved = document.getElementById("stat-resolved");

const statusLabelMap = {
  open: "Open",
  inProgress: "In Progress",
  resolved: "Resolved"
};

const categoryLabelMap = {
  general: "General",
  road: "Road",
  sanitation: "Sanitation",
  lighting: "Lighting",
  safety: "Safety",
  water: "Water",
  electricity: "Electricity",
  other: "Other"
};

function setMessage(text, type = "info") {
  messageEl.textContent = text;
  messageEl.dataset.type = type;
}

function buildReportQueryString() {
  const formData = new FormData(filtersForm);
  const params = new URLSearchParams();

  const status = String(formData.get("status") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const q = String(formData.get("q") || "").trim();

  if (status) {
    params.set("status", status);
  }
  if (category) {
    params.set("category", category);
  }
  if (q) {
    params.set("q", q);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function renderReportCard(report) {
  const item = document.createElement("li");
  item.className = "report-card";

  const title = document.createElement("h3");
  title.textContent = report.title;

  const status = document.createElement("span");
  status.className = `status-pill status-${report.status}`;
  status.textContent = statusLabelMap[report.status] || report.status;

  const description = document.createElement("p");
  description.className = "report-description";
  description.textContent = report.description;

  const meta = document.createElement("p");
  meta.className = "report-meta";
  const categoryLabel = categoryLabelMap[report.category] || report.category;
  const createdAt = new Date(report.createdAt).toLocaleString();
  meta.textContent = `${report.location} | ${categoryLabel} | Reported ${createdAt}`;

  const actions = document.createElement("div");
  actions.className = "report-actions";

  const statusSelect = document.createElement("select");
  statusSelect.setAttribute("aria-label", `Update status for report ${report.id}`);
  ["open", "inProgress", "resolved"].forEach((statusValue) => {
    const option = document.createElement("option");
    option.value = statusValue;
    option.textContent = statusLabelMap[statusValue];
    if (report.status === statusValue) {
      option.selected = true;
    }
    statusSelect.appendChild(option);
  });

  const updateButton = document.createElement("button");
  updateButton.type = "button";
  updateButton.className = "secondary";
  updateButton.textContent = "Update";
  updateButton.addEventListener("click", async () => {
    updateButton.disabled = true;
    const newStatus = statusSelect.value;
    const updated = await updateReportStatus(report.id, newStatus);
    updateButton.disabled = false;
    if (updated) {
      await Promise.all([fetchReports(), fetchStats()]);
    }
  });

  actions.appendChild(statusSelect);
  actions.appendChild(updateButton);

  item.appendChild(title);
  item.appendChild(status);
  item.appendChild(description);
  item.appendChild(meta);
  item.appendChild(actions);
  return item;
}

async function fetchReports() {
  let reports = [];
  try {
    const response = await fetch(`/api/reports${buildReportQueryString()}`);
    if (!response.ok) {
      setMessage("Failed to load reports.", "error");
      return;
    }
    reports = await response.json();
  } catch {
    setMessage("Failed to load reports.", "error");
    return;
  }

  reportsList.innerHTML = "";
  if (!reports.length) {
    const item = document.createElement("li");
    item.className = "report-empty";
    item.textContent = "No reports yet.";
    reportsList.appendChild(item);
    return;
  }

  reports.forEach((report) => {
    reportsList.appendChild(renderReportCard(report));
  });
}

async function fetchStats() {
  try {
    const response = await fetch("/api/reports/stats");
    if (!response.ok) {
      return;
    }
    const stats = await response.json();
    statTotal.textContent = String(stats.total || 0);
    statOpen.textContent = String(stats.open || 0);
    statInProgress.textContent = String(stats.inProgress || 0);
    statResolved.textContent = String(stats.resolved || 0);
  } catch {
    // Non-fatal, the page can still function without stats.
  }
}

async function updateReportStatus(reportId, status) {
  let response;
  try {
    response = await fetch(`/api/reports/${reportId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
  } catch {
    setMessage("Failed to update report status.", "error");
    return false;
  }

  if (!response.ok) {
    let errorMessage = "Failed to update report status.";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch {}
    setMessage(errorMessage, "error");
    return false;
  }

  setMessage("Report status updated.", "success");
  return true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const formData = new FormData(form);
  const payload = {
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    category: formData.get("category")
  };

  let response;
  try {
    response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    setMessage("Failed to submit report.", "error");
    return;
  }

  if (!response.ok) {
    let errorMessage = "Failed to submit report.";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch {}
    setMessage(errorMessage, "error");
    return;
  }

  form.reset();
  setMessage("Report submitted successfully.", "success");
  await Promise.all([fetchReports(), fetchStats()]);
});

filtersForm.addEventListener("input", () => {
  fetchReports();
});

refreshButton.addEventListener("click", async () => {
  setMessage("Refreshing reports...", "info");
  await Promise.all([fetchReports(), fetchStats()]);
  setMessage("Dashboard updated.", "success");
});

Promise.all([fetchReports(), fetchStats()]);
