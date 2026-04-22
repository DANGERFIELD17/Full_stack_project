const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("../server");

function makeRequest(baseUrl, route, options = {}) {
  return fetch(`${baseUrl}${route}`, options);
}

async function startTestServer() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  return { server, baseUrl };
}

function stopTestServer(server) {
  return new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
}

test("creates and lists reports", async () => {
  const { server, baseUrl } = await startTestServer();

  const createResponse = await makeRequest(baseUrl, "/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Broken streetlight",
      description: "The streetlight on 3rd avenue is not working.",
      location: "3rd Avenue",
      category: "lighting"
    })
  });

  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.title, "Broken streetlight");
  assert.equal(created.status, "open");

  const listResponse = await makeRequest(baseUrl, "/api/reports");
  assert.equal(listResponse.status, 200);
  const list = await listResponse.json();
  assert.equal(list.length, 1);
  assert.equal(list[0].location, "3rd Avenue");

  await stopTestServer(server);
});

test("rejects incomplete reports", async () => {
  const { server, baseUrl } = await startTestServer();

  const createResponse = await makeRequest(baseUrl, "/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "",
      description: "Missing title",
      location: "Main Street"
    })
  });

  assert.equal(createResponse.status, 400);
  const body = await createResponse.json();
  assert.match(body.error, /required/);

  await stopTestServer(server);
});

test("updates report status and validates status updates", async () => {
  const { server, baseUrl } = await startTestServer();

  const createResponse = await makeRequest(baseUrl, "/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Overflowing trash bin",
      description: "Needs urgent cleanup.",
      location: "Park entrance"
    })
  });
  const created = await createResponse.json();

  const updateResponse = await makeRequest(
    baseUrl,
    `/api/reports/${created.id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" })
    }
  );
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json();
  assert.equal(updated.status, "resolved");

  const invalidStatusResponse = await makeRequest(
    baseUrl,
    `/api/reports/${created.id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "closed" })
    }
  );
  assert.equal(invalidStatusResponse.status, 400);

  const missingReportResponse = await makeRequest(baseUrl, "/api/reports/999/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "resolved" })
  });
  assert.equal(missingReportResponse.status, 404);

  await stopTestServer(server);
});

test("rejects invalid category values", async () => {
  const { server, baseUrl } = await startTestServer();

  const createResponse = await makeRequest(baseUrl, "/api/reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Unknown category example",
      description: "Category should be validated.",
      location: "North block",
      category: "parks"
    })
  });

  assert.equal(createResponse.status, 400);
  const body = await createResponse.json();
  assert.match(body.error, /Invalid category/);

  await stopTestServer(server);
});

test("filters reports and returns dashboard stats", async () => {
  const { server, baseUrl } = await startTestServer();

  const seedReports = [
    {
      title: "Pothole near school",
      description: "Large pothole blocks lane.",
      location: "Oak Street",
      category: "road"
    },
    {
      title: "Streetlight outage",
      description: "Dark stretch after 8pm.",
      location: "Maple Avenue",
      category: "lighting"
    },
    {
      title: "Leaking water line",
      description: "Water pooling at intersection.",
      location: "Main junction",
      category: "water"
    }
  ];

  for (const payload of seedReports) {
    const createResponse = await makeRequest(baseUrl, "/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    assert.equal(createResponse.status, 201);
  }

  const listAllResponse = await makeRequest(baseUrl, "/api/reports");
  const listAll = await listAllResponse.json();
  const firstReportId = listAll[2].id;

  const updateResponse = await makeRequest(baseUrl, `/api/reports/${firstReportId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "resolved" })
  });
  assert.equal(updateResponse.status, 200);

  const filteredByCategory = await makeRequest(baseUrl, "/api/reports?category=water");
  assert.equal(filteredByCategory.status, 200);
  const categoryReports = await filteredByCategory.json();
  assert.equal(categoryReports.length, 1);
  assert.equal(categoryReports[0].category, "water");

  const filteredByStatus = await makeRequest(baseUrl, "/api/reports?status=resolved");
  assert.equal(filteredByStatus.status, 200);
  const statusReports = await filteredByStatus.json();
  assert.equal(statusReports.length, 1);
  assert.equal(statusReports[0].status, "resolved");

  const filteredByQuery = await makeRequest(baseUrl, "/api/reports?q=streetlight");
  const queryReports = await filteredByQuery.json();
  assert.equal(queryReports.length, 1);
  assert.match(queryReports[0].title, /Streetlight/i);

  const statsResponse = await makeRequest(baseUrl, "/api/reports/stats");
  assert.equal(statsResponse.status, 200);
  const stats = await statsResponse.json();
  assert.deepEqual(stats, {
    total: 3,
    open: 2,
    inProgress: 0,
    resolved: 1
  });

  await stopTestServer(server);
});
