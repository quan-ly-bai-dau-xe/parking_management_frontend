import { useEffect, useId, useRef } from "react";

// Module-level stack ensures nested modals (e.g. ConfirmModal over GateCameraControlModal)
// route Escape/Tab only to the topmost dialog and release body scroll lock on the last close.
const modalStack = [];
let savedBodyOverflow = null;

const TABBABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function isElementVisible(el) {
  if (!el || el.disabled) return false;
  if (typeof el.closest === "function" && el.closest('[aria-hidden="true"], [inert]')) {
    return false;
  }
  if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
  }
  const hasRects = typeof el.getClientRects === "function" && el.getClientRects().length > 0;
  return el.offsetWidth > 0 || el.offsetHeight > 0 || hasRects;
}

function containsNode(parent, child) {
  if (!parent || !child) return false;
  if (typeof parent.contains === "function") {
    return parent.contains(child);
  }
  let cur = child;
  while (cur) {
    if (cur === parent) return true;
    cur = cur.parentNode;
  }
  return false;
}

function getAutoFocusElement(container) {
  if (!container) return null;
  if (typeof container.querySelector === "function") {
    try {
      return container.querySelector("[autofocus]:not([disabled])");
    } catch {
      return null;
    }
  }
  return null;
}

function getTabbableElements(container) {
  if (!container || typeof container.querySelectorAll !== "function") return [];
  let candidates;
  try {
    candidates = Array.from(container.querySelectorAll(TABBABLE_SELECTOR));
  } catch {
    return [];
  }
  return candidates.filter((el) => {
    const tabIdx = typeof el.tabIndex === "number" ? el.tabIndex : 0;
    return tabIdx >= 0 && isElementVisible(el);
  });
}

function focusElementSafely(el) {
  if (!el || typeof el.focus !== "function") return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

export function useModalA11y({
  isOpen,
  onClose,
  isBusy = false,
  role = "dialog",
  closeOnEscape = true,
  initialFocusRef = null,
  titleId: customTitleId = null,
  descriptionId: customDescriptionId = null,
  hasTitle = true,
  hasDescription = false,
} = {}) {
  const modalId = useId();
  const generatedTitleId = useId();
  const generatedDescriptionId = useId();
  const dialogRef = useRef(null);

  const titleId = customTitleId || generatedTitleId;
  const descriptionId = customDescriptionId || generatedDescriptionId;

  const onCloseRef = useRef(onClose);
  const isBusyRef = useRef(isBusy);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const initialFocusRefHolder = useRef(initialFocusRef);

  useEffect(() => {
    onCloseRef.current = onClose;
    isBusyRef.current = isBusy;
    closeOnEscapeRef.current = closeOnEscape;
    initialFocusRefHolder.current = initialFocusRef;
  });

  useEffect(() => {
    if (!isOpen || typeof document === "undefined" || typeof window === "undefined") {
      return undefined;
    }

    const container = dialogRef.current;
    const opener = document.activeElement;

    if (modalStack.length === 0) {
      savedBodyOverflow = document.body?.style?.overflow ?? "";
      if (document.body?.style) {
        document.body.style.overflow = "hidden";
      }
    }

    const entry = {
      id: modalId,
      getContainer: () => dialogRef.current,
    };
    modalStack.push(entry);

    if (container) {
      const activeInside =
        document.activeElement &&
        containsNode(container, document.activeElement) &&
        document.activeElement !== container;

      if (!activeInside) {
        const customTarget = initialFocusRefHolder.current?.current;
        const autoFocusTarget = getAutoFocusElement(container);
        const tabbables = getTabbableElements(container);
        const firstTabbable = tabbables[0] || null;

        if (customTarget && containsNode(container, customTarget) && isElementVisible(customTarget)) {
          focusElementSafely(customTarget);
        } else if (autoFocusTarget && isElementVisible(autoFocusTarget)) {
          focusElementSafely(autoFocusTarget);
        } else if (firstTabbable) {
          focusElementSafely(firstTabbable);
        } else {
          focusElementSafely(container);
        }
      }
    }

    const handleKeyDown = (e) => {
      const topEntry = modalStack[modalStack.length - 1];
      if (!topEntry || topEntry.id !== modalId) return;

      if (e.key === "Escape") {
        if (closeOnEscapeRef.current === false) return;
        if (isBusyRef.current) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key === "Tab") {
        const currentContainer = dialogRef.current;
        if (!currentContainer) return;

        const tabbables = getTabbableElements(currentContainer);
        if (tabbables.length === 0) {
          e.preventDefault();
          focusElementSafely(currentContainer);
          return;
        }

        const first = tabbables[0];
        const last = tabbables[tabbables.length - 1];
        const active = document.activeElement;

        if (!containsNode(currentContainer, active)) {
          e.preventDefault();
          focusElementSafely(e.shiftKey ? last : first);
          return;
        }

        if (e.shiftKey && (active === first || active === currentContainer)) {
          e.preventDefault();
          focusElementSafely(last);
          return;
        }

        if (!e.shiftKey && active === last) {
          e.preventDefault();
          focusElementSafely(first);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);

      const idx = modalStack.findIndex((item) => item.id === modalId);
      if (idx >= 0) {
        modalStack.splice(idx, 1);
      }

      if (modalStack.length === 0 && document.body?.style) {
        document.body.style.overflow = savedBodyOverflow ?? "";
        savedBodyOverflow = null;
      }

      const restoreOpenerFocus = () => {
        if (!opener || typeof opener.focus !== "function" || !opener.isConnected) {
          return;
        }
        const remainingTop = modalStack[modalStack.length - 1]?.getContainer?.();
        if (
          remainingTop &&
          !containsNode(remainingTop, opener) &&
          containsNode(remainingTop, document.activeElement)
        ) {
          return;
        }
        focusElementSafely(opener);
      };

      restoreOpenerFocus();
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          if (
            document.activeElement === document.body ||
            !document.activeElement ||
            !document.activeElement.isConnected
          ) {
            restoreOpenerFocus();
          }
        });
      }
    };
  }, [isOpen, modalId]);

  const dialogProps = {
    ref: dialogRef,
    role,
    "aria-modal": "true",
    tabIndex: -1,
    ...(hasTitle ? { "aria-labelledby": titleId } : {}),
    ...(hasDescription ? { "aria-describedby": descriptionId } : {}),
  };

  return {
    dialogRef,
    titleId,
    descriptionId,
    dialogProps,
  };
}

export default useModalA11y;
