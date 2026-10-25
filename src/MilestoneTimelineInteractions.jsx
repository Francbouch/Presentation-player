import TimelineCardLayoutSettings from "./TimelineCardLayoutSettings.jsx";
import {
  TIMELINE_STATUSES,
  timelineStepActions,
  normalizeTimelineCardLayout,
  defaultTimelineCardLayout,
} from "./milestoneTimeline.js";
import {
  TLNumber,
  TLSelect,
  TLCheck,
  TLColor,
} from "./MilestoneTimelineSettings.jsx";
import { ChooseImage } from "./MediaLibrary.jsx";
export default function MilestoneTimelineInteractions({
  layer,
  step,
  patch,
  edit,
  design,
  media,
  importMedia,
}) {
  const t = layer.timeline,
    d = t.design;
  function removePhase(p) {
    if (
      !window.confirm(
        `Supprimer « ${p.name} » ? Ses étapes seront conservées sans phase. Vous pouvez les réaffecter avant de supprimer la phase.`,
      )
    )
      return;
    patch({
      phases: t.phases.filter((v) => v.id !== p.id),
      steps: t.steps.map((s) =>
        s.phaseId === p.id ? { ...s, phaseId: null } : s,
      ),
    });
  }
  return (
    <>
      <details className="property-section" open>
        <summary>Phases</summary>
        <button
          className="ui-button"
          onClick={() =>
            patch({
              phases: [
                ...t.phases,
                {
                  id: crypto.randomUUID(),
                  name: `Phase ${t.phases.length + 1}`,
                  color: d.progressColor,
                  collapsed: false,
                },
              ],
            })
          }
        >
          Ajouter une phase
        </button>
        {t.phases.map((p, i) => (
          <div className="state-card" key={p.id}>
            <label className="field">
              Nom de la phase
              <input
                aria-label={`Nom de la phase ${p.id}`}
                maxLength={160}
                value={p.name}
                onChange={(e) =>
                  patch({
                    phases: t.phases.map((v) =>
                      v.id === p.id ? { ...v, name: e.target.value } : v,
                    ),
                  })
                }
              />
            </label>
            <TLColor
              label={`Couleur de la phase ${p.name}`}
              value={p.color}
              change={(color) =>
                patch({
                  phases: t.phases.map((v) =>
                    v.id === p.id ? { ...v, color } : v,
                  ),
                })
              }
            />
            <TLCheck
              label={`Réduire la phase ${p.name} au départ`}
              value={p.collapsed}
              change={(collapsed) =>
                patch({
                  phases: t.phases.map((v) =>
                    v.id === p.id ? { ...v, collapsed } : v,
                  ),
                })
              }
            />
            <div className="button-row">
              <button
                className="ui-button"
                disabled={i === 0}
                onClick={() => {
                  const phases = [...t.phases];
                  [phases[i - 1], phases[i]] = [phases[i], phases[i - 1]];
                  patch({
                    phases,
                    steps: [
                      ...phases.flatMap((p) =>
                        t.steps.filter((s) => s.phaseId === p.id),
                      ),
                      ...t.steps.filter((s) => !s.phaseId),
                    ],
                  });
                }}
              >
                Monter la phase {p.name}
              </button>
              <button
                className="ui-button"
                disabled={i === t.phases.length - 1}
                onClick={() => {
                  const phases = [...t.phases];
                  [phases[i + 1], phases[i]] = [phases[i], phases[i + 1]];
                  patch({
                    phases,
                    steps: [
                      ...phases.flatMap((p) =>
                        t.steps.filter((s) => s.phaseId === p.id),
                      ),
                      ...t.steps.filter((s) => !s.phaseId),
                    ],
                  });
                }}
              >
                Descendre la phase {p.name}
              </button>
              <button className="ui-button" onClick={() => removePhase(p)}>
                Supprimer la phase {p.name}
              </button>
            </div>
          </div>
        ))}
      </details>
      <details className="property-section" open>
        <summary>Interactions de la ligne du temps</summary>
        <TLCheck
          label="Révélation progressive"
          value={d.reveal}
          change={(reveal) => design({ reveal })}
        />
        {d.reveal && (
          <>
            <TLNumber
              label="Étapes visibles au départ"
              value={d.initialVisible}
              min={0}
              max={5000}
              change={(initialVisible) =>
                design({ initialVisible: Math.round(initialVisible) })
              }
            />
            <TLSelect
              label="Apparition des étapes"
              value={d.revealType}
              options={{
                none: "Apparition directe",
                fade: "Fondu",
                slide: "Glissement léger",
                scale: "Agrandissement léger",
              }}
              change={(revealType) => design({ revealType })}
            />
            <TLNumber
              label="Durée de révélation (ms)"
              value={d.revealDuration}
              min={0}
              max={5000}
              change={(revealDuration) => design({ revealDuration })}
            />
            <TLCheck
              label="Révéler au clic sur Suivante"
              value={d.revealClick}
              change={(revealClick) => design({ revealClick })}
            />
          </>
        )}
        <TLSelect
          label="Mise en évidence de l’étape active"
          value={d.highlight}
          options={{
            none: "Aucune",
            scale: "Agrandissement",
            glow: "Contour lumineux",
            color: "Changement de couleur",
            opacity: "Augmentation d’opacité",
            bold: "Mise en gras",
            dim: "Atténuation des autres étapes",
          }}
          change={(highlight) => design({ highlight })}
        />
        {d.highlight === "scale" && (
          <TLNumber
            label="Agrandissement de l’étape (%)"
            value={d.highlightScale}
            min={100}
            max={150}
            change={(highlightScale) => design({ highlightScale })}
          />
        )}
        {d.highlight === "glow" && (
          <TLNumber
            label="Intensité du contour de l’étape"
            value={d.highlightIntensity}
            min={0}
            max={60}
            change={(highlightIntensity) => design({ highlightIntensity })}
          />
        )}
        {d.highlight === "dim" && (
          <TLNumber
            label="Atténuation des autres étapes (%)"
            value={d.dimOthers}
            min={0}
            max={80}
            change={(dimOthers) => design({ dimOthers })}
          />
        )}
        <TLCheck
          label="Une seule étape sélectionnée"
          value={d.exclusive}
          change={(exclusive) => design({ exclusive })}
        />
        <TLSelect
          label="Disposition des fiches"
          value={d.cardMode}
          options={{
            floating: d.cardLayout
              ? "Position personnalisée"
              : "Fenêtre près de l’étape",
            side: "Panneau latéral",
            bottom: "Zone fixe sous la ligne",
          }}
          change={(cardMode) =>
            design({
              cardMode,
              ...(d.cardLayout
                ? {
                    cardLayout:
                      cardMode === "side"
                        ? { x: 0.72, y: 0.06, width: 0.26, height: 0.86 }
                        : cardMode === "bottom"
                          ? { x: 0.03, y: 0.58, width: 0.94, height: 0.38 }
                          : defaultTimelineCardLayout(),
                  }
                : {}),
            })
          }
        />
        {[
          ["cardBackground", "Fond des fiches"],
          ["cardText", "Texte des fiches"],
          ["cardBorder", "Bordure des fiches"],
        ].map(([k, label]) => (
          <TLColor
            key={k}
            label={label}
            path={`timeline.design.${k}`}
            value={d[k]}
            change={(v) =>
              design({
                [k]: v,
                ...(d.cardLayout && ["cardWidth", "cardHeight"].includes(k)
                  ? {
                      cardLayout: normalizeTimelineCardLayout({
                        ...d.cardLayout,
                        [k === "cardWidth" ? "width" : "height"]:
                          v / (k === "cardWidth" ? 1920 : 1080),
                      }),
                    }
                  : {}),
              })
            }
          />
        ))}
        {[
          ["cardWidth", "Largeur des fiches", 220, 900],
          ["cardHeight", "Hauteur maximale des fiches", 150, 900],
          ["cardRadius", "Coins des fiches", 0, 100],
          ["cardShadow", "Ombre des fiches", 0, 80],
          ["cardDuration", "Animation des fiches (ms)", 0, 5000],
        ]
          .filter(
            ([k]) => !d.cardLayout || !["cardWidth", "cardHeight"].includes(k),
          )
          .map(([k, label, min, max]) => (
            <TLNumber
              key={k}
              label={label}
              value={d[k]}
              min={min}
              max={max}
              change={(v) =>
                design({
                  [k]: v,
                  ...(d.cardLayout && ["cardWidth", "cardHeight"].includes(k)
                    ? {
                        cardLayout: normalizeTimelineCardLayout({
                          ...d.cardLayout,
                          [k === "cardWidth" ? "width" : "height"]:
                            v / (k === "cardWidth" ? 1920 : 1080),
                        }),
                      }
                    : {}),
                })
              }
            />
          ))}
        <TLCheck
          label="Lecture automatique de la fiche ouverte"
          value={d.cardAutoplay}
          change={(cardAutoplay) => design({ cardAutoplay })}
        />
        <p className="help">
          Seule la vidéo de la fiche ouverte est chargée. La lecture automatique
          utilise le lecteur média existant, en mode muet.
        </p>
      </details>
      {step && (
        <details className="property-section" open>
          <summary>Fiche et interaction de l’étape</summary>
          <TLSelect
            label="Phase de l’étape"
            value={step.phaseId || ""}
            options={{
              "": "Sans phase",
              ...Object.fromEntries(t.phases.map((p) => [p.id, p.name])),
            }}
            change={(phaseId) => edit({ phaseId: phaseId || null })}
          />
          <TLSelect
            label="Clic sur l’étape"
            value={step.click}
            options={{
              select: "Sélectionner",
              card: "Afficher une fiche au clic",
              zoom: "Zoomer sur cette étape",
              none: "Aucune interaction",
            }}
            change={(click) =>
              edit({ click, zoomOnSelect: undefined, cardOnSelect: undefined })
            }
          />
          <TLCheck
            label="Zoomer sur l’étape"
            value={timelineStepActions(step).zoom}
            change={(zoomOnSelect) => edit({ zoomOnSelect })}
          />
          <TLCheck
            label="Afficher la fiche d’information"
            value={timelineStepActions(step).card}
            change={(cardOnSelect) => edit({ cardOnSelect })}
          />
          <TimelineCardLayoutSettings
            layer={layer}
            step={step}
            edit={edit}
            design={design}
          />
          <p className="help">
            Ces deux options peuvent être activées ensemble. Le zoom utilise les
            réglages communs de la Timeline.
          </p>
          <label className="field">
            Informations supplémentaires
            <textarea
              aria-label="Informations supplémentaires"
              maxLength={10000}
              value={step.details}
              onChange={(e) => edit({ details: e.target.value })}
            />
          </label>
          <ChooseImage
            label="Choisir l’image de l’étape"
            onChoose={(imageId) => edit({ imageId })}
          />
          {["image", "video"].map((kind) => (
            <div key={kind}>
              <TLSelect
                label={
                  kind === "image" ? "Image de la fiche" : "Vidéo de la fiche"
                }
                value={step[`${kind}Id`] || ""}
                options={{
                  "": "Aucun média",
                  ...Object.fromEntries(
                    media
                      .filter((m) => m.type.startsWith(kind + "/"))
                      .map((m) => [m.id, m.name]),
                  ),
                }}
                change={(id) => edit({ [`${kind}Id`]: id || null })}
              />
              {step[`${kind}Id`] &&
                !media.some((m) => m.id === step[`${kind}Id`]) && (
                  <p role="alert">
                    {kind === "image" ? "Image" : "Vidéo"} absente : choisissez
                    un média existant ou retirez la référence.
                  </p>
                )}
              <button
                className="ui-button"
                onClick={() => importMedia?.(layer.id, step.id, kind)}
              >
                Importer {kind === "image" ? "l’image" : "la vidéo"} de l’étape
              </button>
              <button
                className="ui-button"
                disabled={!step[`${kind}Id`]}
                onClick={() => edit({ [`${kind}Id`]: null })}
              >
                Retirer {kind === "image" ? "l’image" : "la vidéo"} de l’étape
              </button>
            </div>
          ))}
        </details>
      )}
    </>
  );
}
