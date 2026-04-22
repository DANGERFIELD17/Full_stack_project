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
