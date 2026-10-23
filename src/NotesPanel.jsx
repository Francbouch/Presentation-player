import { useRef, useState } from "react";
import { ResizeHandle } from "./Workspace.jsx";

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
}) {
  const [height, setHeight] = useState(190),
    input = useRef(null);
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
      className="notes-panel"
      style={{ height }}
      aria-label="Notes du présentateur"
    >
      <ResizeHandle
        label="Hauteur des notes"
        axis="y"
        reverse
        value={height}
        min={110}
        max={360}
        change={setHeight}
      />
      <div className="notes-heading">
        <strong>
          Notes · {number} — {page.title}
        </strong>
        <span>Texte privé · **gras** · *italique*</span>
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
      <textarea
        key={page.id}
        ref={input}
        disabled={disabled}
        aria-label="Texte des notes"
        value={page.notes || ""}
        onChange={(e) => change(e.target.value)}
        placeholder="Écrivez ici ce que vous souhaitez dire…"
      />
    </section>
  );
}
