import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('Vite khởi động được và phục vụ trang frontend', { timeout: 15000 }, async () => {
  const server = await createServer({
    configFile: './vite.config.js',
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
  });

  try {
    await server.listen();
    const address = server.httpServer.address();

    assert.ok(address && typeof address !== 'string', 'Vite không mở được HTTP server.');

    const response = await fetch(`http://127.0.0.1:${address.port}/`, {
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.text();

    assert.equal(response.status, 200, `Vite trả HTTP ${response.status}.`);
    assert.match(body, /<div\s+id=["']root["']/i, 'Trang Vite không có root element của React.');
  } finally {
    await server.close();
  }
});
