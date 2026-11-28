import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn, execSync } from "node:child_process";

const PORT = 51204;
const FRONTEND_DIR = path.resolve(import.meta.dirname, "../..");
const REPORT_PATH = path.join(FRONTEND_DIR, "reports", "test-report.html");

let isRunningTests = false;

function runAllTests(callback) {
  if (isRunningTests) {
    if (callback) callback();
    return;
  }
  isRunningTests = true;
  console.log("⚡ Đang tự động chạy lại toàn bộ Unit Tests & tạo báo cáo HTML...");

  const child = spawn("node", [
    "--test",
    "--test-reporter=./tests/helpers/nodeHtmlReporter.mjs",
    "tests/features/vehicles/vehicleManagement.test.mjs"
  ], {
    cwd: FRONTEND_DIR,
    shell: true,
    stdio: "inherit"
  });

  child.on("close", () => {
    isRunningTests = false;
    console.log("✔ Hoàn thành cập nhật Test Report HTML!");
    if (callback) callback();
  });
}

// Chạy test lần đầu tiên khi khởi động server
runAllTests();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/run") {
    runAllTests(() => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "success", timestamp: Date.now() }));
    });
    return;
  }

  if (url.pathname === "/api/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ isRunning: isRunningTests }));
    return;
  }

  // API lấy dữ liệu Traceability Matrix phục vụ UI tra cứu ma trận
  if (url.pathname === "/api/trace") {
    const q = url.searchParams.get("q") || "";
    try {
      const rootDir = path.resolve(FRONTEND_DIR, "..");
      const scriptPath = path.join(rootDir, "scripts", "trace.py");
      const cmd = `python "${scriptPath}" ${q ? `"${q}"` : ""}`;
      const output = execSync(cmd, { cwd: rootDir, encoding: "utf8" });
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ output }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: err.message, output: err.stdout || "" }));
    }
    return;
  }

  // Phục vụ file test-report.html
  if (fs.existsSync(REPORT_PATH)) {
    let html = fs.readFileSync(REPORT_PATH, "utf8");

    // Tiêm thêm nút "Chạy lại Test (Re-run)" và thanh trạng thái Live
    const liveUiAddon = `
      <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; gap: 10px;">
        <button id="reRunBtn" onclick="triggerReRun()" style="background: #2563eb; color: #fff; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 8px;">
          <span>⚡ Chạy lại Test (Re-run)</span>
        </button>
      </div>
      <script>
        async function triggerReRun() {
          const btn = document.getElementById('reRunBtn');
          btn.innerHTML = '<span>⏳ Đang chạy test...</span>';
          btn.disabled = true;
          try {
            await fetch('/api/run');
            window.location.reload();
          } catch (e) {
            alert('Không thể kết nối máy chủ test!');
            btn.innerHTML = '<span>⚡ Chạy lại Test (Re-run)</span>';
            btn.disabled = false;
          }
        }
      </script>
    </body>`;
    html = html.replace("</body>", liveUiAddon);

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } else {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>Đang khởi tạo báo cáo kiểm thử... Vui lòng F5 sau vài giây!</h1>");
  }
});

server.listen(PORT, () => {
  console.log(`\n================================================================================`);
  console.log(`🚀 TEST DASHBOARD WEB UI ĐANG CHẠY TẠI: http://localhost:${PORT}`);
  console.log(`================================================================================\n`);
});
