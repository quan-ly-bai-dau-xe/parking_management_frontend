import axios from "axios";

export const API_UNAVAILABLE_MESSAGE =
    "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng hoặc hệ thống máy chủ rồi thử lại.";

export const UNAUTHORIZED_EVENT_NAME = "app:auth-unauthorized";
export const DEFAULT_UNAUTHORIZED_MESSAGE =
    "Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại.";

// Dedupe cooldown: Ngăn bão event / toast khi hàng loạt API đồng thời trả về 401
let lastUnauthorizedNotifyTime = 0;
const UNAUTHORIZED_COOLDOWN_MS = 3000;

export function notifyUnauthorized(message = DEFAULT_UNAUTHORIZED_MESSAGE) {
    const now = Date.now();
    if (now - lastUnauthorizedNotifyTime < UNAUTHORIZED_COOLDOWN_MS) {
        return;
    }
    lastUnauthorizedNotifyTime = now;

    // Dọn dẹp session đã hết hạn trong storage
    try {
        localStorage.removeItem("sp_user");
        localStorage.removeItem("sp_auth_token");
        sessionStorage.removeItem("sp_user");
        sessionStorage.removeItem("sp_auth_token");
    } catch {
        // Safe-guard trong môi trường không có storage hoặc bị block
    }

    if (typeof window !== "undefined") {
        window.dispatchEvent(
            new CustomEvent(UNAUTHORIZED_EVENT_NAME, {
                detail: {
                    message,
                    timestamp: now,
                },
            })
        );
    }
}

export function getCookie(name) {
    if (typeof document === "undefined" || !document.cookie) {
        return null;
    }
    const cookie = document.cookie
        .split("; ")
        .find((item) => item.startsWith(`${name}=`));

    return cookie ? cookie.split("=").slice(1).join("=") : null;
}

function createApiConnectionError(error) {
    const err = new Error(API_UNAVAILABLE_MESSAGE);
    err.code = "API_UNAVAILABLE";
    err.cause = error;
    return err;
}

export const axiosInstance = axios.create({
    baseURL: "/",
    withCredentials: true,
    headers: {
        Accept: "application/json",
    },
    xsrfCookieName: "csrftoken",
    xsrfHeaderName: "X-CSRFToken",
});

let csrfInitPromise = null;

export async function fetchCsrfToken() {
    if (csrfInitPromise) return csrfInitPromise;

    csrfInitPromise = (async () => {
        try {
            await axiosInstance.get("/api/v1/auth/csrf/");

            if (!getCookie("csrftoken")) {
                throw new Error("CSRF token was not set by the server.");
            }
        } catch (error) {
            if (!error.response) {
                throw createApiConnectionError(error);
            }

            throw error;
        } finally {
            csrfInitPromise = null;
        }
    })();

    return csrfInitPromise;
}
axiosInstance.interceptors.request.use(async (config) => {
    const method = (config.method || "GET").toUpperCase();

    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        return config;
    }

    let token = getCookie("csrftoken");

    if (!token) {
        await fetchCsrfToken();
        token = getCookie("csrftoken");
    }

    if (!token) {
        throw new Error("CSRF token is unavailable. Request was not sent.");
    }

    if (config.headers) {
        if (typeof config.headers.set === "function") {
            config.headers.set("X-CSRFToken", token);
        } else {
            config.headers["X-CSRFToken"] = token;
        }
    } else {
        config.headers = { "X-CSRFToken": token };
    }

    return config;
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Preserve canceled / aborted requests.
        if (
            axios.isCancel(error) ||
            error?.name === "AbortError" ||
            error?.code === "ERR_CANCELED"
        ) {
            error.name = "AbortError";
            return Promise.reject(error);
        }

        // No HTTP response means connection failure.
        if (!error.response) {
            return Promise.reject(createApiConnectionError(error));
        }

        const { status, data, headers: resHeaders } = error.response;

        // Xử lý 401 Unauthorized có Dedupe & Guard
        // Không kích hoạt thông báo hết hạn phiên nếu endpoint đang gọi chính là API login (tránh nhầm với nhập sai mật khẩu)
        const requestUrl = error.config?.url || "";
        const isLoginEndpoint = requestUrl.includes("/api/v1/auth/login/");

        if (status === 401 && !isLoginEndpoint) {
            const unauthorizedMsg =
                (typeof data === "object" && !(data instanceof Blob) && (data?.detail || data?.message)) ||
                DEFAULT_UNAUTHORIZED_MESSAGE;
            notifyUnauthorized(unauthorizedMsg);
        }

        const validationMessage =
            typeof data === "object" && data && !(data instanceof Blob)
                ? Object.entries(data)
                      .map(([field, value]) => {
                          const detail = Array.isArray(value) ? value.join(", ") : String(value);
                          return `${field}: ${detail}`;
                      })
                      .join("; ")
                : "";
        const message =
            (typeof data === "object" &&
                !(data instanceof Blob) &&
                (data?.detail || data?.message || validationMessage)) ||
            `HTTP Error ${status}`;

        const err = new Error(message, { cause: error });
        err.code = error.code;
        err.status = status;
        err.data = data;
        err.headers = resHeaders;
        err.isUnauthorized = status === 401;

        const retryAfterHeader =
            resHeaders?.["retry-after"] ||
            resHeaders?.["Retry-After"] ||
            (typeof resHeaders?.get === "function"
                ? resHeaders.get("retry-after")
                : undefined);

        if (retryAfterHeader) {
            const parsedRetry = parseInt(retryAfterHeader, 10);
            if (!Number.isNaN(parsedRetry) && parsedRetry > 0) {
                err.retryAfter = parsedRetry;
            } else {
                const retryDateMs = Date.parse(retryAfterHeader);
                if (!Number.isNaN(retryDateMs)) {
                    err.retryAfter = Math.max(
                        1,
                        Math.ceil((retryDateMs - Date.now()) / 1000)
                    );
                }
            }
        }

        return Promise.reject(err);
    }
);

/**
 * Backward-compatible wrapper for existing Fetch-style callers.
 */
export async function apiClient(endpoint, options = {}) {
    const {
        method = "GET",
        body,
        data,
        params,
        headers = {},
        ...config
    } = options;

    const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    // Prefer Axios data; fallback to Fetch-style body.
    const payload = data !== undefined ? data : body;

    const requestHeaders = { ...headers };

    const isFormData =
        typeof FormData !== "undefined" && payload instanceof FormData;

    // Explicitly set JSON content-type if body is provided and Content-Type was not specified
    if (payload !== undefined && !isFormData) {
        const hasContentType = Object.keys(requestHeaders).some(
            (key) => key.toLowerCase() === "content-type"
        );
        if (!hasContentType) {
            requestHeaders["Content-Type"] = "application/json";
        }
    }

    if (isFormData) {
        // Prevent Axios from forcing application/x-www-form-urlencoded or application/json,
        // allowing the browser/client to generate the multipart boundary.
        requestHeaders["Content-Type"] = null;
    }

    const response = await axiosInstance.request({
        ...config,
        url,
        method,
        data: payload,
        params,
        headers: requestHeaders,
    });

    return response.data;
}
