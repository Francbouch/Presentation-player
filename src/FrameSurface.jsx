import { useEffect, useLayoutEffect, useRef, useState } from "react";
import useMaskDimensions from "./useMaskDimensions.js";
import { frameMediaStyle } from "./mediaGeometry.js";
import { frameCrop, framePlayback } from "./mediaFrames.js";

// Les lecteurs restent montés lorsqu’un état les masque. Leur lecture ne fait
// jamais partie du document ni de l’historique d’édition.
export default function FrameSurface({
  item,
  urls,
  editing,
  visible = true,
  playbackEnabled = true,
  registerVideo,
  cropEditing = false,
}) {
  const media = item.frameMedia,
    c = media?.crop || frameCrop(),
    settings = media?.playback || framePlayback();
  const video = useRef(null),
    canvas = useRef(null),
    ended = useRef(false),
    [hidden, setHidden] = useState(false),
    [held, setHeld] = useState(false),
    [error, setError] = useState("");
  const source = urls[media?.mediaId];
  const [maskRef, maskSize] = useMaskDimensions(source);
  const [intrinsic, setIntrinsic] = useState(null);
  function measure(element) {
    const width = element.naturalWidth || element.videoWidth,
      height = element.naturalHeight || element.videoHeight;
    if (width && height)
      setIntrinsic((previous) =>
        previous?.source === source &&
        previous.width === width &&
        previous.height === height
          ? previous
          : { source, width, height },
      );
  }
  const endListeners = useRef(new Set());
  function cancelEnd(reason) {
    const listeners = [...endListeners.current];
    endListeners.current.clear();
    for (const listener of listeners) listener.cancelled?.(reason);
  }
  const current = useRef();
  current.current = { settings, visible: visible && playbackEnabled, editing };
  useLayoutEffect(() => {
    const v = video.current;
    if (!v) return;
    v.playbackRate = settings.rate;
    v.muted = settings.muted;
  }, [settings.rate, settings.muted, source]);
  useEffect(() => {
    setHidden(false);
    setHeld(false);
    setError("");
    ended.current = false;
  }, [source]);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (!visible || editing || !playbackEnabled) {
      v.pause();
      if (editing) setHidden(false);
      return;
    }
    if (settings.autoplay && !ended.current)
      v.play().catch(() =>
        setError("Lecture automatique refusée. Utilisez un bouton de lecture."),
      );
    return () => v.pause();
  }, [visible, editing, playbackEnabled, settings.autoplay, source]);
  useEffect(() => {
    const v = video.current;
    if (!v || !registerVideo) return;
    let disposed = false;
    const pending = new Set();
    const controller = {
      watchEnd: (finished, cancelled) => {
        const listener = { finished, cancelled };
        endListeners.current.add(listener);
        return () => endListeners.current.delete(listener);
      },
      ready: () =>
        new Promise((resolve) => {
          if (disposed || v.readyState >= 2 || v.error) {
            resolve(!disposed && !v.error);
            return;
          }
          let timer;
          const done = () => {
            pending.delete(done);
            clearTimeout(timer);
            v.removeEventListener("loadeddata", done);
            v.removeEventListener("error", done);
            resolve(!disposed && v.readyState >= 2 && !v.error);
          };
          pending.add(done);
          v.addEventListener("loadeddata", done);
          v.addEventListener("error", done);
          timer = setTimeout(done, 5000);
          v.load();
        }),
      reveal: () => setHidden(false),
      prepare: (command) => {
        if (disposed) return false;
        cancelEnd(command);
        if (command === "pause") {
          v.pause();
          return true;
        }
        if (command === "stop") {
          v.pause();
          v.currentTime = 0;
          setHeld(false);
          ended.current = false;
          if (current.current.visible) setHidden(false);
          return true;
        }
        if (!current.current.visible) return false;
        setHidden(false);
        setHeld(false);
        setError("");
        ended.current = false;
        if (command === "restart" || command === "stop") {
          v.pause();
          v.currentTime = 0;
          if (command === "restart" && v.seeking)
            return new Promise((resolve) => {
              let timer;
              const done = () => {
                pending.delete(done);
                clearTimeout(timer);
                v.removeEventListener("seeked", done);
                resolve(!disposed && !v.error && !v.seeking);
              };
              pending.add(done);
              v.addEventListener("seeked", done);
              timer = setTimeout(done, 2000);
            });
        }
        return true;
      },
      execute: (command) => {
        if (!current.current.visible || disposed) return Promise.resolve();
        if (command === "pause" || command === "stop") {
          v.pause();
          return Promise.resolve();
        }
        return v.play().catch(() => {
          cancelEnd("error");
          setError("Le navigateur a refusé la lecture de cette vidéo.");
        });
      },
      pause: () => {
        cancelEnd("pause");
        v.pause();
      },
    };
    const unregister = registerVideo(item.id, controller);
    return () => {
      disposed = true;
      cancelEnd("removed");
      for (const done of [...pending]) done();
      unregister();
    };
  }, [registerVideo, item.id, source]);
  function finish() {
    const v = video.current;
    if (!v.ended || ended.current) return;
    const listeners = [...endListeners.current];
    endListeners.current.clear();
    ended.current = true;
    v.pause();
    if (settings.end === "first") {
      setHeld(false);
      v.currentTime = 0;
    } else if (settings.end === "hide") setHidden(true);
    else {
      // Une petite image décodée, jamais le fichier vidéo, protège l’image finale.
      try {
        const cv = canvas.current;
        cv.width = v.videoWidth;
        cv.height = v.videoHeight;
        cv.getContext("2d").drawImage(v, 0, 0);
        setHeld(true);
      } catch {
        /* Le dernier frame du lecteur reste visible si la capture est indisponible. */
      }
    }
    for (const listener of listeners) listener.finished();
  }
  const radius = item.type === "circle" ? "50%" : `${item.cornerRadius || 0}px`;
  const cropStyle = frameMediaStyle(
    item,
    c,
    intrinsic?.source === source ? intrinsic : null,
    maskSize,
  );
  const border = item.border;
  return (
    <div
      ref={maskRef}
      className={`media-frame-surface ${cropEditing ? "is-adjusting-media" : ""}`}
      style={{
        borderRadius: radius,
        background:
          item.fillMode === "transparent"
            ? "transparent"
            : `color-mix(in srgb, ${item.color || "transparent"} ${(item.fillOpacity ?? 1) * 100}%, transparent)`,
        visibility: hidden ? "hidden" : undefined,
      }}
    >
      {media?.kind === "image" && source && (
        <img
          src={source}
          className="frame-original-media"
          onLoad={(event) => measure(event.currentTarget)}
          style={cropStyle}
          alt=""
          draggable={false}
          onError={() => setError("Image illisible.")}
        />
      )}
      {media?.kind === "video" && source && (
        <>
          <video
            ref={video}
            src={source}
            className="frame-original-media"
            onLoadedMetadata={(event) => measure(event.currentTarget)}
            style={cropStyle}
            preload="auto"
            playsInline
            muted={settings.muted}
            loop={settings.loop}
            onEnded={finish}
            onPause={() => {
              if (video.current?.paused && !video.current?.ended)
                cancelEnd("pause");
            }}
            onEmptied={() => cancelEnd("source")}
            onError={() => {
              cancelEnd("error");
              setError("Vidéo illisible ou format non pris en charge.");
            }}
          />
          <canvas
            ref={canvas}
            className="frame-original-media"
            style={{ ...cropStyle, display: held ? "block" : "none" }}
          />
          {editing && (
            <button
              className="frame-preview ui-button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setHeld(false);
                setHidden(false);
                ended.current = false;
                const v = video.current;
                if (v.paused) {
                  if (v.ended) v.currentTime = 0;
                  v.play().catch(() => setError("Lecture refusée."));
                } else v.pause();
              }}
            >
              ▶ / Ⅱ Aperçu
            </button>
          )}
        </>
      )}
      {item.type === "image" && !urls[item.imageId] && (
        <span className="button-placeholder">{item.name}</span>
      )}
      {item.type === "image" && urls[item.imageId] && (
        <img
          src={urls[item.imageId]}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      )}
      {border?.enabled && (
        <div
          className="media-frame-border"
          style={{
            borderRadius: radius,
            boxShadow: `inset 0 0 0 ${border.width}px ${border.color}`,
            opacity: border.opacity,
          }}
        />
      )}
      {error && (
        <span className="frame-error" role="status">
          {error}
        </span>
      )}
    </div>
  );
}
