const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const reports = [];
let nextId = 1;

const publicDir = path.join(__dirname, "public");

const validStatuses = new Set(["open", "in_progress", "resolved"]);

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function getContentType(filePath) {
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".js")) return "application/javascript";
  if (filePath.endsWith(".html")) return "text/html";
  return "text/plain";
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/reports") {
    return sendJson(res, 200, reports);
  }

  if (req.method === "POST" && pathname === "/api/reports") {
    const body = await readBody(req);
    let payload;
    try {
      payload = JSON.parse(body || "{}");
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON payload" });
    }

    const title = String(payload.title || "").trim();
    const description = String(payload.description || "").trim();
    const location = String(payload.location || "").trim();
    const category = String(payload.category || "").trim() || "general";

    if (!title || !description || !location) {
      return sendJson(res, 400, {
        error: "title, description and location are required"
      });
    }

    const report = {
      id: nextId++,
      title,
      description,
      location,
      category,
      status: "open",
      createdAt: new Date().toISOString()
    };
    reports.push(report);
    return sendJson(res, 201, report);
  }

  const statusMatch = pathname.match(/^\/api\/reports\/(\d+)\/status$/);
  if (req.method === "PATCH" && statusMatch) {
    const reportId = Number(statusMatch[1]);
    const report = reports.find((item) => item.id === reportId);
    if (!report) {
      return sendJson(res, 404, { error: "Report not found" });
    }

    const body = await readBody(req);
    let payload;
    try {
      payload = JSON.parse(body || "{}");
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON payload" });
    }

    const status = String(payload.status || "").trim();
    if (!validStatuses.has(status)) {
      return sendJson(res, 400, { error: "Invalid status" });
    }

    report.status = status;
    return sendJson(res, 200, report);
  }

  return false;
}

function handleStatic(req, res, pathname) {
  const filePath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolutePath = path.join(publicDir, safePath);

  if (!absolutePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(absolutePath, (err, fileData) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": getContentType(absolutePath) });
    res.end(fileData);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, "http://localhost");
    const pathname = reqUrl.pathname;

    try {
      if (pathname.startsWith("/api/")) {
        const handled = await handleApi(req, res, pathname);
        if (handled !== false) {
          return;
        }
        return sendJson(res, 404, { error: "Not found" });
      }
      handleStatic(req, res, pathname);
    } catch (err) {
      sendJson(res, 500, { error: "Internal Server Error" });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

module.exports = { createServer };
