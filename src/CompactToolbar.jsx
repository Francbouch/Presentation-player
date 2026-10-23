import { useEffect, useId, useRef, useState } from "react";
export function ToolbarOverflow({ children }) {
  const [open, setOpen] = useState(false),
    root = useRef(null),
    trigger = useRef(null),
    id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    function escape(e) {
      if (e.key === "Escape" && root.current?.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className={`toolbar-overflow ${open ? "is-open" : ""}`}
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        type="button"
        className="ui-button overflow-trigger"
        ref={trigger}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        Plus
      </button>
      <div
        id={id}
        className="toolbar-command-content"
        aria-label="Commandes supplémentaires"
      >
        {children}
      </div>
    </div>
  );
}
export function ToolbarNotifications({ children, count, urgent }) {
  const [open, setOpen] = useState(false),
    root = useRef(null),
    trigger = useRef(null),
    id = useId();
  useEffect(() => {
    if (urgent) setOpen(true);
  }, [urgent]);
  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (!root.current?.contains(e.target)) setOpen(false);
    };
    function escape(e) {
      if (e.key === "Escape" && root.current?.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div
      className="toolbar-notifications"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        type="button"
        className={`ui-button notifications-trigger ${count ? "has-notices" : ""}`}
        title={`${count} notification(s)`}
        aria-label="Notifications"
        aria-expanded={open}
        aria-controls={id}
        ref={trigger}
        onClick={() => setOpen(!open)}
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 20h6" />
        </svg>
        <span aria-live="polite" aria-atomic="true">
          {count}
        </span>
      </button>
      <div
        className="notification-panel"
        id={id}
        hidden={!open}
        role="region"
        aria-label="Notifications de l’application"
      >
        <div className="panel-heading">
          <strong>Notifications · {count}</strong>
          <button
            className="ui-button"
            type="button"
            aria-label="Fermer les notifications"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            ×
          </button>
        </div>
        {!count && <p>Aucune notification.</p>}
        {children}
      </div>
    </div>
  );
}
