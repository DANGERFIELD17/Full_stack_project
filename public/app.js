const form = document.getElementById("report-form");
const messageEl = document.getElementById("message");
const reportsList = document.getElementById("reports-list");

async function fetchReports() {
  let reports = [];
  try {
    const response = await fetch("/api/reports");
    if (!response.ok) {
      messageEl.textContent = "Failed to load reports.";
      return;
    }
    reports = await response.json();
  } catch {
    messageEl.textContent = "Failed to load reports.";
    return;
  }

  reportsList.innerHTML = "";
  if (!reports.length) {
    const item = document.createElement("li");
    item.textContent = "No reports yet.";
    reportsList.appendChild(item);
    return;
  }

  reports.forEach((report) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${escapeHtml(report.title)}</strong> (${escapeHtml(report.status)})<br>
      ${escapeHtml(report.description)}<br>
      <em>${escapeHtml(report.location)} • ${escapeHtml(report.category)}</em>
    `;
    reportsList.appendChild(item);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageEl.textContent = "";

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
    messageEl.textContent = "Failed to submit report.";
    return;
  }

  if (!response.ok) {
    let errorMessage = "Failed to submit report.";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch {}
    messageEl.textContent = errorMessage;
    return;
  }

  form.reset();
  messageEl.textContent = "Report submitted successfully.";
  await fetchReports();
});

fetchReports();
