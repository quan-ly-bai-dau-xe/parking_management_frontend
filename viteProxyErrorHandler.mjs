
export function handleProxyError(err, req, res) {
  const messages = {
    ECONNREFUSED:
      'Không thể kết nối đến máy chủ. Vui lòng kiểm tra máy chủ backend hoặc thử lại sau.',
    ETIMEDOUT:
      'Kết nối đến máy chủ quá thời gian chờ. Vui lòng thử lại.',
    ECONNRESET:
      'Kết nối với máy chủ bị gián đoạn. Vui lòng thử lại.',
  };

  const message =
    messages[err.code] ||
    'Đã xảy ra lỗi kết nối đến máy chủ. Vui lòng thử lại sau.';

  console.error(
    `[Vite Proxy] ${req.method} ${req.url} | ${err.code || 'UNKNOWN'}: ${err.message}`
  );

  if (res && !res.headersSent && !res.destroyed) {
    res.writeHead(503, {
      'Content-Type': 'application/json; charset=utf-8',
    });

    res.end(
      JSON.stringify({
        error: 'SERVICE_UNAVAILABLE',
        message,
      })
    );
  }
}
