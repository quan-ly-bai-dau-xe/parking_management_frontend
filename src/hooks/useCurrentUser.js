import { useState, useEffect, useMemo } from "react";
import { checkIsManager } from "../constants/roleConstants";
import { notifyUnauthorized } from "../services/apiClient";

const AUTH_USER_CHANGED_EVENT = "sp:auth-user-changed";
let meReconcilePromise = null;
let meReconcileEpoch = 0;
let meReconcileSig = null;
let activeReconcileController = null;
let lastReconciledUserKey = null;
let reconcileEpoch = 0;

function getStorageSafely(kind) {
  try {
    if (kind === "local") {
      return typeof localStorage !== "undefined" && typeof localStorage?.getItem === "function"
        ? localStorage
        : null;
    }
    return typeof sessionStorage !== "undefined" && typeof sessionStorage?.getItem === "function"
      ? sessionStorage
      : null;
  } catch {
    return null;
  }
}

function getStoredUser() {
  try {
    const ls = getStorageSafely("local");
    const ss = getStorageSafely("session");
    const storedUser = ls?.getItem("sp_user") || ss?.getItem("sp_user");
    if (!storedUser) return null;
    const parsed = JSON.parse(storedUser);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearStoredAuthBoth() {
  const keys = ["sp_auth_token", "sp_user"];
  const ls = getStorageSafely("local");
  const ss = getStorageSafely("session");
  for (const storage of [ls, ss]) {
    if (storage && typeof storage.removeItem === "function") {
      for (const key of keys) {
        try {
          storage.removeItem(key);
        } catch {
          // Ignore storage access errors
        }
      }
    }
  }
}

function invalidateReconciliation() {
  reconcileEpoch += 1;
  lastReconciledUserKey = null;
  meReconcilePromise = null;
  meReconcileSig = null;
  if (activeReconcileController) {
    try {
      activeReconcileController.abort();
    } catch {
      // Ignore abort errors
    }
    activeReconcileController = null;
  }
}

const MODULE_AUTH_LISTENER_GUARD = Symbol.for("sp.useCurrentUser.moduleAuthListeners");
let registeredWindowRef = null;

function handleModuleAuthEvent(event) {
  if (event?.type === "storage") {
    if (event.key !== null && event.key !== "sp_user") {
      return;
    }
    invalidateReconciliation();
    return;
  }
  if (event?.type === AUTH_USER_CHANGED_EVENT && !event?.detail?.reconciled) {
    invalidateReconciliation();
  }
}

// Register at module level so auth transitions on unmounted routes (/login, /register) still abort in-flight /me/ requests and clear cached user signature.
function ensureModuleAuthListeners() {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return;
  }
  if (registeredWindowRef === window) {
    return;
  }
  try {
    if (window[MODULE_AUTH_LISTENER_GUARD]) {
      registeredWindowRef = window;
      return;
    }
    window[MODULE_AUTH_LISTENER_GUARD] = true;
  } catch {
    // Ignore read-only/frozen window errors
  }
  registeredWindowRef = window;
  window.addEventListener("storage", handleModuleAuthEvent);
  window.addEventListener(AUTH_USER_CHANGED_EVENT, handleModuleAuthEvent);
}

ensureModuleAuthListeners();

function writeReconciledUser(mergedUser) {
  try {
    const ls = getStorageSafely("local");
    const ss = getStorageSafely("session");
    const activeStorage = ls?.getItem("sp_user") ? ls : ss || ls;
    const inactiveStorage = activeStorage === ls ? ss : ls;
    if (activeStorage && typeof activeStorage.setItem === "function") {
      activeStorage.setItem("sp_user", JSON.stringify(mergedUser));
    }
    if (inactiveStorage && typeof inactiveStorage.removeItem === "function") {
      inactiveStorage.removeItem("sp_user");
    }
    if (
      typeof window !== "undefined" &&
      typeof window.dispatchEvent === "function" &&
      typeof CustomEvent === "function"
    ) {
      window.dispatchEvent(
        new CustomEvent(AUTH_USER_CHANGED_EVENT, {
          detail: { user: mergedUser, reconciled: true },
        })
      );
    }
  } catch {
    // Ignore storage access errors
  }
}

function getUserSignature(u) {
  if (!u || typeof u !== "object") return "";
  const r = u.role || u.role_name || u.roleName || "";
  return `${u.id ?? ""}:${r}`;
}

function reconcileWithServerMe(storedUser) {
  if (
    typeof window === "undefined" ||
    typeof fetch !== "function" ||
    !storedUser
  ) {
    return Promise.resolve(null);
  }

  const storedSig = getUserSignature(storedUser);
  if (meReconcilePromise && meReconcileSig !== storedSig) {
    invalidateReconciliation();
  }

  if (lastReconciledUserKey && lastReconciledUserKey === storedSig) {
    return Promise.resolve(null);
  }

  if (
    meReconcilePromise &&
    meReconcileEpoch === reconcileEpoch &&
    meReconcileSig === storedSig
  ) {
    return meReconcilePromise;
  }

  const epochAtStart = reconcileEpoch;
  const sigAtStart = storedSig;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  activeReconcileController = controller;
  meReconcileEpoch = epochAtStart;
  meReconcileSig = sigAtStart;

  const requestPromise = fetch("/api/v1/auth/me/", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    ...(controller ? { signal: controller.signal } : {}),
  })
    .then(async (res) => {
      if (epochAtStart !== reconcileEpoch || getUserSignature(getStoredUser()) !== sigAtStart) {
        return null;
      }
      if (!res) {
        return null;
      }
      if (res.status === 401) {
        clearStoredAuthBoth();
        lastReconciledUserKey = null;
        notifyUnauthorized();
        return null;
      }
      if (!res.ok || typeof res.json !== "function") {
        return null;
      }
      const serverUser = await res.json();
      if (epochAtStart !== reconcileEpoch || getUserSignature(getStoredUser()) !== sigAtStart) {
        return null;
      }
      if (!serverUser || typeof serverUser !== "object" || !serverUser.role) {
        return null;
      }
      const serverSig = getUserSignature(serverUser);
      lastReconciledUserKey = serverSig;

      const latestStored = getStoredUser();
      if (!latestStored) {
        return null;
      }
      if (getUserSignature(latestStored) !== serverSig) {
        const mergedUser =
          latestStored.id !== undefined &&
          latestStored.id !== null &&
          latestStored.id === serverUser.id
            ? { ...latestStored, ...serverUser }
            : serverUser;
        writeReconciledUser(mergedUser);
        return mergedUser;
      }
      return null;
    })
    .catch(() => null)
    .finally(() => {
      if (epochAtStart === reconcileEpoch) {
        meReconcilePromise = null;
        meReconcileSig = null;
        if (activeReconcileController === controller) {
          activeReconcileController = null;
        }
      }
    });

  meReconcilePromise = requestPromise;
  return requestPromise;
}

/**
 * Hook quản lý thông tin User đăng nhập
 * Đồng bộ với localStorage / sessionStorage và lắng nghe sự thay đổi
 */
export function useCurrentUser() {
  const [user, setUser] = useState(getStoredUser);

  useEffect(() => {
    let isMounted = true;
    ensureModuleAuthListeners();

    const handleUserChange = (event) => {
      if (event?.type === "storage" && event.key !== null && event.key !== "sp_user") {
        return;
      }
      const nextUser = getStoredUser();
      if (isMounted) {
        setUser(nextUser);
      }
    };

    window.addEventListener("storage", handleUserChange);
    window.addEventListener(AUTH_USER_CHANGED_EVENT, handleUserChange);

    const currentStored = getStoredUser();
    if (currentStored) {
      reconcileWithServerMe(currentStored)
        .then((updatedUser) => {
          if (!isMounted) return;
          if (updatedUser) {
            setUser(updatedUser);
          } else if (!getStoredUser()) {
            setUser(null);
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleUserChange);
      window.removeEventListener(AUTH_USER_CHANGED_EVENT, handleUserChange);
    };
  }, []);

  const role = user?.role || user?.role_name || user?.roleName || "Chưa xác định";
  const isManager = useMemo(() => checkIsManager(user || role), [user, role]);

  return {
    user,
    setUser,
    displayName:
      user?.name ||
      user?.full_name ||
      user?.fullName ||
      user?.username ||
      "",
    role,
    isManager,
  };
}

