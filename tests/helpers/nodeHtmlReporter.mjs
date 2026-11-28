import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

/**
 * nodeHtmlReporter.mjs
 * Modern Test & Traceability Dashboard (100% Dynamic - Zero Hardcode)
 * - Tự động phát hiện module và thư mục tests/
 * - Tích hợp trực tiếp Traceability Matrix từ specs (requirements.yaml & scenarios.yaml)
 * - Hiển thị kết quả test runs trực tiếp theo thời gian thực
 */
export default async function* customHtmlReporter(source) {
  const tests = [];
  let totalDurationMs = 0;
  let passedCount = 0;
  let failedCount = 0;

  for await (const event of source) {
    if (event.type === "test:pass" && event.data.details?.type === "test") {
      passedCount++;
      tests.push({
        name: event.data.name,
        status: "PASS",
        duration: event.data.details?.duration_ms?.toFixed(2) || "0.00",
        file: event.data.file || "",
        error: null,
      });
      yield `✔ [PASS] ${event.data.name}\n`;
    } else if (event.type === "test:fail" && event.data.details?.type === "test") {
      failedCount++;
      tests.push({
        name: event.data.name,
        status: "FAIL",
        duration: event.data.details?.duration_ms?.toFixed(2) || "0.00",
        file: event.data.file || "",
        error: event.data.details?.error?.message || "Assertion failed",
      });
      yield `✖ [FAIL] ${event.data.name}\n`;
    } else if (event.type === "test:summary") {
      totalDurationMs = event.data.duration_ms || 0;
    }
  }

  const cwd = process.cwd();
  const rootDir = path.resolve(cwd, "..");
  const testDir = path.resolve(cwd, "tests");

  // 1. TỰ ĐỘNG KHÁM PHÁ TOÀN BỘ CẤU TRÚC TEST TRÊN Ổ ĐĨA (DYNAMIC DISCOVERY - KHÔNG HARDCODE)
  function discoverTestSuites(dir) {
    const suites = {};
    if (!fs.existsSync(dir)) return suites;

    function walk(currentDir) {
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        if (item.isDirectory()) {
          walk(fullPath);
        } else if (item.name.endsWith(".test.mjs") || item.name.endsWith(".test.js")) {
          const relDir = path.relative(testDir, currentDir);
          const suiteGroup = relDir ? relDir.replace(/\\/g, "/") : "root";
          if (!suites[suiteGroup]) {
            suites[suiteGroup] = [];
          }
          suites[suiteGroup].push({
            name: item.name,
            relPath: path.relative(cwd, fullPath).replace(/\\/g, "/"),
          });
        }
      }
    }

    walk(dir);
    return suites;
  }

  const dynamicSuites = discoverTestSuites(testDir);
  const suiteGroups = Object.keys(dynamicSuites);

  // 2. TỰ ĐỘNG GỌI TRACE ENGINE ĐỂ LẤY MA TRẬN DỮ LIỆU
  let traceOutput = "";
  try {
    const traceScript = path.join(rootDir, "scripts", "trace.py");
    if (fs.existsSync(traceScript)) {
      traceOutput = execSync(`python "${traceScript}"`, { cwd: rootDir, encoding: "utf8" });
    }
  } catch (err) {
    traceOutput = `Không thể nạp ma trận tự động: ${err.message}`;
  }

  const total = tests.length;
  const passRate = total > 0 ? ((passedCount / total) * 100).toFixed(1) : "0.0";
  const reportTime = new Date().toLocaleString("vi-VN");

  // 3. TẠO GIAO DIỆN HTML HIỆN ĐẠI, GỌN GÀNG, KHÔNG DỮ LIỆU ẢO
  const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart Mobility Parking - Test & Traceability Dashboard</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #0f172a;
      --card-hover: #1e293b;
      --border: #334155;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --pass: #10b981;
      --pass-bg: rgba(16, 185, 129, 0.15);
      --pass-border: #059669;
      --fail: #ef4444;
      --fail-bg: rgba(239, 68, 68, 0.15);
      --fail-border: #dc2626;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    body { background-color: var(--bg); color: var(--text); padding: 24px; min-height: 100vh; }
    .container { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; flex-wrap: wrap; gap: 12px; }
    .header h1 { font-size: 22px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 10px; }
    .header .timestamp { font-size: 12px; color: var(--text-muted); font-family: monospace; }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .stat-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 16px; }
    .stat-label { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 28px; font-weight: 700; margin-top: 6px; color: #fff; }
    .stat-pass { color: var(--pass); }
    .stat-fail { color: var(--fail); }

    .badge {
      display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 4px 10px; border-radius: 9999px; font-weight: 700; text-transform: uppercase;
    }
    .badge-pass { background: var(--pass-bg); color: var(--pass); border: 1px solid var(--pass-border); }
    .badge-fail { background: var(--fail-bg); color: var(--fail); border: 1px solid var(--fail-border); }
    .badge-info { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid var(--primary); }

    .tabs { display: flex; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 12px; flex-wrap: wrap; }
    .tab-btn { background: transparent; border: 1px solid transparent; color: var(--text-muted); padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .tab-btn:hover { color: #fff; background: var(--card-bg); }
    .tab-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }

    .controls { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .search-input { background: var(--card-bg); border: 1px solid var(--border); color: #fff; padding: 10px 14px; border-radius: 8px; font-size: 13px; flex: 1; min-width: 280px; outline: none; }
    .search-input:focus { border-color: var(--primary); }
    .btn { background: var(--primary); color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.2s; }
    .btn:hover { background: var(--primary-hover); }

    .table-container { background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; }
    th { background: #0c1424; padding: 12px 16px; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); }
    td { padding: 12px 16px; border-bottom: 1px solid rgba(51, 65, 85, 0.4); vertical-align: middle; }
    tr:hover { background: var(--card-hover); }

    .code-tree-box {
      background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 20px; font-family: Consolas, monospace; white-space: pre-wrap; font-size: 13px; line-height: 1.6; color: #e2e8f0; overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title-group">
        <h1>🛡️ Parking Management - Quality & Test Hub</h1>
        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Dynamic Test Runner & Spec Traceability (100% Code-Driven, Zero Hardcode)</div>
      </div>
      <div class="timestamp">Báo cáo: ${reportTime} | Thời lượng: ${(totalDurationMs / 1000).toFixed(2)}s</div>
    </div>

    <!-- STATS OVERVIEW -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Tổng ca kiểm thử đã chạy</div>
        <div class="stat-value">${total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tỷ lệ thành công</div>
        <div class="stat-value stat-pass">${passRate}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Đạt (Passed)</div>
        <div class="stat-value stat-pass">${passedCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Lỗi (Failed)</div>
        <div class="stat-value ${failedCount > 0 ? "stat-fail" : ""}">${failedCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Nhóm Test trên ổ đĩa</div>
        <div class="stat-value">${suiteGroups.length}</div>
      </div>
    </div>

    <!-- TABS NAVIGATION -->
    <div class="tabs">
      <button class="tab-btn active" onclick="switchTab('traceTab', this)">🔗 Ma trận truy vết Spec (Traceability)</button>
      <button class="tab-btn" onclick="switchTab('runsTab', this)">📋 Kết quả kiểm thử Runtime (${total} ca)</button>
      <button class="tab-btn" onclick="switchTab('suitesTab', this)">📁 Khám phá File Test (${suiteGroups.length} nhóm thư mục)</button>
    </div>

    <!-- TAB 1: MA TRẬN TRUY VẾT SPEC (TRACEABILITY MATRIX) -->
    <div id="traceTab" style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); padding: 14px 18px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div>
          <span style="font-size: 14px; font-weight: 700; color: #6ee7b7;">🔗 Dynamic Spec-Kit Traceability</span>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Đọc trực tiếp từ <code>docs/specs/</code> và tự động map tới từng vị trí test trong code.</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="badge badge-info" style="cursor: pointer;" onclick="quickFilter('VEHICLE')">🚗 VEHICLE</button>
          <button class="badge badge-info" style="cursor: pointer;" onclick="quickFilter('CUSTOMER')">👤 CUSTOMER</button>
          <button class="badge badge-info" style="cursor: pointer;" onclick="quickFilter('blacklist')">⛔ Blacklist</button>
          <button class="badge badge-info" style="cursor: pointer;" onclick="quickFilter('')">🔄 Tất cả</button>
        </div>
      </div>

      <div class="controls">
        <input type="text" id="traceSearch" class="search-input" placeholder="🔍 Tìm kiếm theo SC-ID, Requirement, Test ID hoặc từ khóa..." onkeyup="if(event.key==='Enter') executeSearch()" />
        <button class="btn" onclick="executeSearch()">Tra cứu</button>
      </div>

      <div id="traceLoading" style="display: none; padding: 20px; text-align: center; color: var(--text-muted);">
        ⏳ Đang cập nhật ma trận...
      </div>

      <div id="traceContainer" class="code-tree-box">${formatAnsi(traceOutput)}</div>
    </div>

    <!-- TAB 2: TEST RUNS THỰC TẾ (RUNTIME) -->
    <div id="runsTab" style="display: none; flex-direction: column; gap: 16px;">
      <div class="controls">
        <input type="text" id="runSearch" class="search-input" placeholder="🔍 Tìm kiếm test case..." onkeyup="filterRuns()" />
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th style="width: 120px;">Trạng thái</th>
              <th>Tên Test Case</th>
              <th style="width: 140px;">Thời lượng</th>
            </tr>
          </thead>
          <tbody id="runsTableBody">
            ${tests.map(t => `
              <tr class="run-row" data-name="${escapeHtml(t.name.toLowerCase())}">
                <td><span class="badge ${t.status === "PASS" ? "badge-pass" : "badge-fail"}">${t.status}</span></td>
                <td>
                  <div style="font-weight: 600; color: #fff;">${escapeHtml(t.name)}</div>
                  ${t.error ? `<div style="color: #fca5a5; font-size: 12px; margin-top: 4px; font-family: monospace;">${escapeHtml(t.error)}</div>` : ""}
                </td>
                <td style="font-family: monospace; color: var(--text-muted);">${t.duration}ms</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 3: TỰ ĐỘNG KHÁM PHÁ FILE TEST TRÊN Ổ ĐĨA -->
    <div id="suitesTab" style="display: none; flex-direction: column; gap: 16px;">
      <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); padding: 12px 16px; border-radius: 10px; font-size: 13px; color: #93c5fd;">
        📁 Tự động quét và nhóm các file test có thực trong <code>parking_management_frontend/tests/</code> (Không dùng danh mục tĩnh).
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
        ${suiteGroups.map(group => `
          <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; padding: 18px;">
            <div style="font-size: 15px; font-weight: 700; color: #fff; text-transform: uppercase;">📂 ${group}</div>
            <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px;">
              ${dynamicSuites[group].map(f => `
                <div style="font-size: 12px; font-family: monospace; color: #6ee7b7; background: #0c1424; padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(16, 185, 129, 0.2);">
                  ${f.name}
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  </div>

  <script>
    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function switchTab(tabId, btn) {
      document.getElementById('traceTab').style.display = tabId === 'traceTab' ? 'flex' : 'none';
      document.getElementById('runsTab').style.display = tabId === 'runsTab' ? 'flex' : 'none';
      document.getElementById('suitesTab').style.display = tabId === 'suitesTab' ? 'grid' : 'none';
      document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }

    async function loadTrace(query = '') {
      const container = document.getElementById('traceContainer');
      const loader = document.getElementById('traceLoading');
      loader.style.display = 'block';
      try {
        const res = await fetch('/api/trace?q=' + encodeURIComponent(query));
        const data = await res.json();
        loader.style.display = 'none';
        if (data.output) {
          container.innerHTML = parseAnsiColors(data.output);
        } else {
          container.innerHTML = '<div style="color: #94a3b8; text-align: center;">Không có dữ liệu phù hợp.</div>';
        }
      } catch (err) {
        loader.style.display = 'none';
        container.innerHTML = '<div style="color: #f87171;">Lỗi khi tải: ' + err.message + '</div>';
      }
    }

    function parseAnsiColors(str) {
      return str
        .replace(/\\033\\[1;36m/g, '<span style="color: #38bdf8; font-weight: bold; font-size: 14px;">')
        .replace(/\\033\\[1m/g, '<span style="color: #f8fafc; font-weight: 600;">')
        .replace(/\\033\\[32m/g, '<span style="color: #34d399; font-weight: bold;">')
        .replace(/\\033\\[33m/g, '<span style="color: #fbbf24; font-weight: bold;">')
        .replace(/\\033\\[35m/g, '<span style="color: #c084fc; font-weight: bold; font-family: monospace;">')
        .replace(/\\033\\[31m/g, '<span style="color: #f87171; font-weight: bold;">')
        .replace(/\\033\\[90m/g, '<span style="color: #94a3b8; font-family: monospace;">')
        .replace(/\\033\\[0m/g, '</span>');
    }

    function executeSearch() {
      const q = document.getElementById('traceSearch').value.trim();
      loadTrace(q);
    }

    function quickFilter(kw) {
      document.getElementById('traceSearch').value = kw;
      loadTrace(kw);
    }

    function filterRuns() {
      const q = document.getElementById('runSearch').value.toLowerCase();
      document.querySelectorAll('.run-row').forEach(row => {
        const name = row.dataset.name || '';
        row.style.display = !q || name.includes(q) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

  function formatAnsi(str) {
    if (!str) return "Chưa có dữ liệu ma trận.";
    return str
      .replace(/\033\[1;36m/g, '<span style="color: #38bdf8; font-weight: bold; font-size: 14px;">')
      .replace(/\033\[1m/g, '<span style="color: #f8fafc; font-weight: 600;">')
      .replace(/\033\[32m/g, '<span style="color: #34d399; font-weight: bold;">')
      .replace(/\033\[33m/g, '<span style="color: #fbbf24; font-weight: bold;">')
      .replace(/\033\[35m/g, '<span style="color: #c084fc; font-weight: bold; font-family: monospace;">')
      .replace(/\033\[31m/g, '<span style="color: #f87171; font-weight: bold;">')
      .replace(/\033\[90m/g, '<span style="color: #94a3b8; font-family: monospace;">')
      .replace(/\033\[0m/g, '</span>');
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const reportDir = path.resolve(process.cwd(), "reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  const reportPath = path.join(reportDir, "test-report.html");
  fs.writeFileSync(reportPath, htmlContent, "utf8");

  yield `\n================================================================================\n`;
  yield `🗺️ [TEST & TRACEABILITY DASHBOARD GENERATED]: file:///${reportPath.replace(/\\/g, "/")}\n`;
  yield `   (100% Dynamic Discovery: Đã quét ${suiteGroups.length} nhóm thư mục test thực tế)\n`;
  yield `================================================================================\n`;
}
