
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import viteConfig from '../vite.config.js';

test(
  'Happy path: Vite Proxy chuyển request đến backend thành công',
  { timeout: 15000 },
  async () => {
    const server = await createServer({
      configFile: false,
      plugins: viteConfig.plugins,
      logLevel: 'silent',
      server: {
        host: '127.0.0.1',
        port: 0,
        proxy: viteConfig.server.proxy,
      },
    });

    try {
      await server.listen();

      const address = server.httpServer.address();
      assert.ok(address && typeof address !== 'string');

      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/health/`,
        { signal: AbortSignal.timeout(10000) }
      );

      const responseText = await response.text();

      console.log('HTTP status:', response.status);
      console.log('Response body:', responseText);

      assert.ok(
        response.status >= 200 && response.status < 300,
        `Happy path thất bại: mong đợi HTTP 2xx, nhận HTTP ${response.status}. Body: ${responseText}`
      );
    } finally {
      await server.close();
    }
  }
);
