/** tiny svg/dom helpers — the renderer must not pull a framework */

export const SVG_NS = "http://www.w3.org/2000/svg";

export function svgEl<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs?: Record<string, string | number | undefined>,
  parent?: Node
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, name);
  if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== undefined) node.setAttribute(k, String(v));
  parent?.appendChild(node);
  return node;
}

export function htmlEl<K extends keyof HTMLElementTagNameMap>(
  name: K,
  attrs?: Record<string, string>,
  parent?: Element
): HTMLElementTagNameMap[K] {
  const node = document.createElement(name);
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.appendChild(node);
  return node;
}

/** injected once per page; keyed so HMR/multiple maps do not duplicate it */
const STYLE_ID = "venue-seats-renderer-styles";

export const DEFAULT_CSS = `
.vs-map{position:relative;overflow:hidden;background:#0b101b;border-radius:var(--vs-radius,16px);
  width:100%;height:100%;
  font-family:var(--vs-font,ui-sans-serif,system-ui,"PingFang SC","Microsoft YaHei",sans-serif)}
.vs-map svg{width:100%;height:100%;display:block;touch-action:none;cursor:grab;user-select:none}
.vs-map.vs-dragging svg{cursor:grabbing}
.vs-map svg:focus-visible{outline:2px solid #6ea8ff;outline-offset:-2px}
.vs-section{stroke:rgba(226,236,255,.20);stroke-width:1;fill-opacity:.48;cursor:pointer;
  transition:fill-opacity .12s ease,stroke-width .12s ease}
.vs-section:focus{outline:none}
.vs-section:focus-visible{stroke:#8db8ff;stroke-width:2}
.vs-section--hot{fill-opacity:.68;stroke:rgba(255,255,255,.85);stroke-width:1.6}
.vs-section--selected{fill-opacity:.78;stroke:#fff;stroke-width:2.2}
.vs-section--none{fill-opacity:.22}
.vs-section--none:hover{fill-opacity:.34}
.vs-seat{stroke:none}
.vs-map.vs-hover-anim .vs-seat{transition:fill .1s ease}
.vs-seat--sold{fill:#333c50!important;fill-opacity:.85}
.vs-seat--held{fill:#3d4a63!important;fill-opacity:.9}
.vs-row--hot .vs-seat:not(.vs-seat--sold):not(.vs-seat--held){stroke:#fff;stroke-width:.9;fill-opacity:1}
.vs-row--selected .vs-seat:not(.vs-seat--sold):not(.vs-seat--held){fill:#ffffff;stroke:#6ea8ff;stroke-width:1}
.vs-row--selected .vs-seat--sold{fill:#4a5570}
.vs-label{fill:#dfe8f8;font-weight:600;font-size:13px;text-anchor:middle;pointer-events:none;
  paint-order:stroke;stroke:rgba(7,11,20,.9);stroke-width:3px;stroke-linejoin:round}
.vs-label--stage{fill:#f2f6ff;letter-spacing:.14em}
.vs-stage{fill:#101828;stroke:rgba(160,190,255,.5);stroke-width:1.4}
.vs-stage-glow{fill:none;stroke:rgba(110,168,255,.22);stroke-width:10}
.vs-map.vs-zoomed-out .vs-seat{display:none}
.vs-map.vs-zoomed-out .vs-section{fill-opacity:.55}
.vs-map.vs-zoomed-out .vs-section--none{fill-opacity:.28}
.vs-map.vs-labels-hidden .vs-label:not(.vs-label--stage){display:none}
.vs-tooltip{position:absolute;pointer-events:none;z-index:5;transform:translate(-50%,calc(-100% - 12px));
  background:rgba(13,19,33,.92);border:1px solid rgba(140,170,230,.25);color:#e8eefb;border-radius:10px;
  padding:7px 10px;font-size:12px;line-height:1.45;white-space:nowrap;opacity:0;transition:opacity .1s ease;
  box-shadow:0 8px 28px rgba(0,0,0,.45);backdrop-filter:blur(6px)}
.vs-tooltip b{font-size:12.5px}
.vs-tooltip .vs-dot{display:inline-block;width:8px;height:8px;border-radius:3px;margin-right:6px;vertical-align:0}
.vs-tooltip .vs-muted{color:#93a4c3;margin-left:8px}
.vs-sr-only{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
`;

export function injectStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = DEFAULT_CSS;
  doc.head.appendChild(style);
}
