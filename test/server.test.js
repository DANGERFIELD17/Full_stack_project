const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("../server");

function requestJson(baseUrl, route, options = {}) {
  return fetch(`${baseUrl}${route}`, options);
}

test("creates and lists reports", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const createResponse = await requestJson(baseUrl, "/api/reports", {
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

  const listResponse = await requestJson(baseUrl, "/api/reports");
  assert.equal(listResponse.status, 200);
  const list = await listResponse.json();
  assert.equal(list.length, 1);
  assert.equal(list[0].location, "3rd Avenue");

  await new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});

test("rejects incomplete reports", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const createResponse = await requestJson(baseUrl, "/api/reports", {
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

  await new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
});
