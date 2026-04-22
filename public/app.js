const form = document.getElementById("report-form");
const messageEl = document.getElementById("message");
const reportsList = document.getElementById("reports-list");

async function fetchReports() {
  const response = await fetch("/api/reports");
  const reports = await response.json();

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
  return value
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

  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json();
    messageEl.textContent = errorBody.error || "Failed to submit report";
    return;
  }

  form.reset();
  messageEl.textContent = "Report submitted successfully.";
  await fetchReports();
});

fetchReports();
