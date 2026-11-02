import axios from "axios";

const API_UNAVAILABLE_MESSAGE =
    "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối và trạng thái backend.";

export function getCookie(name) {
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
        // Preserve canceled requests.
        if (axios.isCancel(error)) {
            return Promise.reject(error);
        }

        // No HTTP response means connection failure.
        if (!error.response) {
            return Promise.reject(createApiConnectionError(error));
        }

        const { status, data } = error.response;

        const message =
            (typeof data === "object" &&
                !(data instanceof Blob) &&
                (data?.detail || data?.message)) ||
            `HTTP Error ${status}`;

        const err = new Error(message, { cause: error });
        err.code = error.code;
        err.status = status;
        err.data = data;

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

    // Explicitly set JSON content-type if body is provided and Content-Type was not specified
    if (payload !== undefined) {
        const hasContentType = Object.keys(requestHeaders).some(
            (key) => key.toLowerCase() === "content-type"
        );
        if (!hasContentType) {
            requestHeaders["Content-Type"] = "application/json";
        }
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
