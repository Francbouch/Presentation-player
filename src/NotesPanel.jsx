import { useEffect, useRef, useState } from "react";
import useFloatingNotes from "./useFloatingNotes.js";

// Plain text with lightweight Markdown: no imported HTML is ever executed.
export function NotesText({ text = "" }) {
  return (
    <div className="notes-reading">
      {text.split("\n").map((line, i) => (
        <div key={i}>
          {line
            .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
            .map((part, j) =>
              part.startsWith("**") ? (
                <strong key={j}>{part.slice(2, -2)}</strong>
              ) : part.startsWith("*") ? (
                <em key={j}>{part.slice(1, -1)}</em>
              ) : (
                part
              ),
            )}
          {!line && <br />}
        </div>
      ))}
    </div>
  );
}
export default function NotesPanel({
  page,
  number,
  change,
  close,
  disabled = false,
  geometry,
  saveGeometry,
}) {
  const input = useRef(null);
  const floating = useFloatingNotes(geometry, saveGeometry);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const outside = (e) => {
      if (!e.target.closest(".notes-menu,.notes-menu-trigger")) setMenu(false);
    };
    window.addEventListener("pointerdown", outside);
    return () => window.removeEventListener("pointerdown", outside);
  }, [menu]);
  function wrap(mark) {
    const e = input.current,
      start = e.selectionStart,
      end = e.selectionEnd;
    e.focus();
    e.setSelectionRange(start, end);
    document.execCommand(
      "insertText",
      false,
      mark + e.value.slice(start, end) + mark,
    );
  }
  return (
    <section
      onKeyDown={(event) => event.stopPropagation()}
      className="notes-panel"
      style={{
        left: floating.box.x,
        top: floating.box.y,
        width: floating.box.width,
        height: floating.box.height,
      }}
      aria-label="Notes du présentateur"
    >
      <div
        className="notes-heading"
        tabIndex={0}
        aria-label="Déplacer les notes"
        title="Glissez pour déplacer · flèches au clavier"
        {...floating.handlers("move")}
      >
        <span className="notes-grip" aria-hidden="true">
          ⠿
        </span>
        <strong>
          Notes · {number} — {page.title}
        </strong>
        <button
          className="notes-menu-trigger"
          aria-label="Menu des notes"
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
        >
          ⋯
        </button>
        {menu && (
          <div
            className="notes-menu"
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setMenu(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setMenu(false);
                e.currentTarget.previousElementSibling.focus();
              }
            }}
          >
            <button
              autoFocus
              onClick={() => {
                floating.reset();
                setMenu(false);
              }}
            >
              Réinitialiser la position
            </button>
          </div>
        )}

        <button
          disabled={disabled}
          onClick={() => wrap("**")}
          aria-label="Gras dans les notes"
        >
          G
        </button>
        <button
          disabled={disabled}
          onClick={() => wrap("*")}
          aria-label="Italique dans les notes"
        >
          I
        </button>
        <button
          onClick={() => {
            input.current.focus();
            document.execCommand("insertText", false, "• ");
          }}
          disabled={disabled}
          aria-label="Puce dans les notes"
        >
          •
        </button>
        <button onClick={close} aria-label="Fermer les notes">
          ✕
        </button>
      </div>
      <div className="notes-format-hint">
        Texte privé · **gras** · *italique*
      </div>
      <textarea
        key={page.id}
        ref={input}
        disabled={disabled}
        aria-label="Texte des notes"
        value={page.notes || ""}
        onChange={(e) => change(e.target.value)}
        placeholder="Écrivez ici ce que vous souhaitez dire…"
      />
      <div
        role="separator"
        tabIndex={0}
        aria-label="Taille des notes"
        aria-valuenow={Math.round(floating.box.height)}
        aria-valuetext={`${Math.round(floating.box.width)} × ${Math.round(floating.box.height)} pixels`}
        className="notes-resize"
        title="Glissez pour redimensionner · flèches au clavier"
        {...floating.handlers("resize")}
      >
        ◢
      </div>
    </section>
  );
}
