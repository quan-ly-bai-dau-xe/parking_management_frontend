
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test(
  'Smoke Test: Frontend kết nối được Django qua Vite Proxy',
  { timeout: 20000 },
  async () => {
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

      assert.ok(
        address && typeof address !== 'string',
        'Vite không mở được HTTP server.'
      );

      const url = `http://127.0.0.1:${address.port}/api/v1/health/`;

      console.log(`Kiểm tra API: ${url}`);

      let response;

      try {
        response = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
      } catch (error) {
        assert.fail(
          `Không nhận được HTTP response từ Vite Proxy. ` +
          `Lỗi: ${error.message}`
        );
      }

      const body = await response.text();

      console.log(`HTTP status: ${response.status}`);

      assert.ok(
        response.status >= 200 && response.status < 300,
        `API không trả HTTP 2xx. Status: ${response.status}. ` +
        `Response: ${body}`
      );

      console.log('Smoke Test PASS: API trả HTTP 2xx.');
    } finally {
      await server.close();
    }
  }
);
