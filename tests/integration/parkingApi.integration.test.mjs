import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

async function startVite() {
  const server = await createServer({
    configFile: './vite.config.js',
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  await server.listen();
  return server;
}

test('health-check qua Vite Proxy trả response JSON hợp lệ', { timeout: 20000 }, async () => {
  const server = await startVite();

  try {
    const address = server.httpServer.address();
    assert.ok(address && typeof address !== 'string');

    const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health/`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.text();

    assert.ok(response.ok, `Health-check trả HTTP ${response.status}: ${body}`);
    assert.match(response.headers.get('content-type') || '', /application\/json/i);
    assert.doesNotThrow(() => JSON.parse(body), 'Health-check phải trả JSON hợp lệ.');
  } finally {
    await server.close();
  }
});

test('API nghiệp vụ tìm kiếm xe trả payload danh sách hợp lệ', { timeout: 20000 }, async () => {
  const server = await startVite();

  try {
    const address = server.httpServer.address();
    assert.ok(address && typeof address !== 'string');

    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/parking/vehicle-search/?q=`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) }
    );
    const body = await response.text();

    const payload = JSON.parse(body);

    if (response.status === 401) {
      assert.equal(payload.code, 'MSG-4.1-M02');
      assert.equal(payload.details?.detail, 'Authentication credentials were not provided.');
      return;
    }

    assert.ok(response.ok, `Vehicle search trả HTTP ${response.status}: ${body}`);
    assert.ok(Array.isArray(payload) || (payload && Array.isArray(payload.results)),
      'Vehicle search phải trả một mảng hoặc object có trường results là mảng.');
  } finally {
    await server.close();
  }
});
