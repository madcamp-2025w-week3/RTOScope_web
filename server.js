const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname, "public");

let latest = null;

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj || {});
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
  };
  const type = types[ext] || "application/octet-stream";
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method === "POST" && req.url === "/ingest") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        latest = JSON.parse(body);
        sendJson(res, 200, { ok: true });
      } catch (e) {
        sendJson(res, 400, { ok: false, error: "Invalid JSON" });
      }
    });
    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    sendJson(res, 200, latest || {});
    return;
  }

  if (req.method === "GET") {
    const target = req.url === "/" ? "/index.html" : req.url;
    const filePath = path.join(PUBLIC_DIR, target);
    serveFile(res, filePath);
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`RTOS web dashboard server: http://localhost:${PORT}`);
});
