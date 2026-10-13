import {
  levelById,
  priceTierOf,
  rowAt,
  rowAvailability,
  sectionAt,
  sectionAvailability,
  sectionColor,
  type Level,
  type Row,
  type RowSelection,
  type Section,
  type VenueDocument,
} from "@venue-seats/core";
import { clamp, fitViewBox, levelDisplayBounds, polygonCentroid, polygonPath, zoomViewBox, type ViewBox } from "./geometry.js";
import { htmlEl, injectStyles, svgEl } from "./dom.js";

export interface HoverInfo {
  kind: "section" | "row";
  section: Section;
  row?: Row;
}

export interface SeatMapEvents {
  /** fired after the selection state changed */
  onSelectionChange?(selection: RowSelection | null): void;
  /** a section was activated (click / keyboard) */
  onSectionClick?(section: Section, selection: RowSelection | null): void;
  /** a row inside the selected section was activated */
  onRowClick?(row: Row, section: Section, selection: RowSelection | null): void;
  /** hover target changed (section-level; row-level once a section is selected) */
  onHoverChange?(hover: HoverInfo | null): void;
}

export interface SeatMapOptions extends SeatMapEvents {
  doc: VenueDocument;
  /** level to show; defaults to the first level */
  levelId?: string;
  /** controlled selection */
  selection?: RowSelection | null;
  /** seats become visible above this many screen px per venue unit (default 0.7) */
  seatVisibleAt?: number;
  /** seat dot radius in venue units (default 3.4) */
  seatRadius?: number;
}

const FALLBACK_SIZE = { w: 900, h: 560 };
const DRAG_TOLERANCE = 4; // px before a press becomes a pan

/**
 * Framework-agnostic SVG seat-map engine.
 * One controller drives one host element; React/Vue wrappers call into it.
 * Hit-testing goes through core's `sectionAt` / `rowAt` so the DOM renderer,
 * the Flutter painter and any future 3D view resolve identical geometry.
 */
export class SeatMapController {
  private doc: VenueDocument;
  private level: Level;
  private sel: RowSelection | null = null;
  private events: SeatMapEvents;
  private seatVisibleAt: number;
  private seatRadius: number;

  private wrap: HTMLDivElement;
  private svg: SVGSVGElement;
  private gSections!: SVGGElement;
  private gSeats!: SVGGElement;
  private gLabels!: SVGGElement;
  private tooltip: HTMLDivElement;
  private live: HTMLDivElement;

  private vb: ViewBox = { x: 0, y: 0, w: 100, h: 100 };
  private fitW = 100; // viewBox width at fit zoom — zoom clamp reference
  private hover: { section: Section | null; row: Row | null } = { section: null, row: null };
  private pointers = new Map<number, { x: number; y: number }>();
  private lastPointer = { x: 0, y: 0 };
  private dragStart: { x: number; y: number; moved: boolean } | null = null;
  private pinchDist = 0;
  private rafId = 0;
  private destroyed = false;
  private ro: ResizeObserver | undefined;

  constructor(host: HTMLElement, options: SeatMapOptions) {
    this.doc = options.doc;
    this.events = options;
    this.seatVisibleAt = options.seatVisibleAt ?? 0.7;
    this.seatRadius = options.seatRadius ?? 3.4;
    this.level = levelById(this.doc, options.levelId ?? "") ?? this.doc.levels[0];

    injectStyles(host.ownerDocument);

    this.wrap = htmlEl("div", { class: "vs-map" }, host);
    this.svg = svgEl("svg", { role: "application", "aria-label": `${this.doc.venue.name} 座位图` }, this.wrap);
    this.tooltip = htmlEl("div", { class: "vs-tooltip", "aria-hidden": "true" }, this.wrap);
    this.live = htmlEl("div", { class: "vs-sr-only", role: "status", "aria-live": "polite" }, this.wrap);
    svgEl("rect", { x: "-5000", y: "-5000", width: "11000", height: "11000", fill: "#0b101b" }, this.svg);

    this.renderLevel();
    this.setSelection(options.selection ?? null, false);

    // --- interactions ---
    this.svg.addEventListener("pointerdown", this.onPointerDown);
    this.svg.addEventListener("pointermove", this.onPointerMove);
    this.svg.addEventListener("pointerup", this.onPointerUp);
    this.svg.addEventListener("pointercancel", this.onPointerUp);
    this.svg.addEventListener("pointerleave", this.onPointerLeave);
    this.svg.addEventListener("wheel", this.onWheel, { passive: false });
    this.svg.addEventListener("dblclick", this.onDblClick);
    this.svg.addEventListener("keydown", this.onKeyDown);
    if (typeof ResizeObserver !== "undefined") {
      this.ro = new ResizeObserver(() => this.fit());
      this.ro.observe(this.wrap);
    }
  }

  // ----------------------------------------------------------------- public

  get levelId(): string {
    return this.level.id;
  }

  getDoc(): VenueDocument {
    return this.doc;
  }

  getSelection(): RowSelection | null {
    return this.sel;
  }

  setDoc(doc: VenueDocument, opts: { keepSelection?: boolean } = {}): void {
    this.doc = doc;
    this.level = doc.levels[0];
    if (!opts.keepSelection) this.sel = null;
    this.renderLevel();
    this.setSelection(this.sel, false);
  }

  setLevel(levelId: string): void {
    const level = levelById(this.doc, levelId);
    if (!level || level.id === this.level.id) return;
    this.level = level;
    this.sel = null;
    this.renderLevel();
    this.emitSelection();
    this.fit();
  }

  /** controlled selection sync from the framework wrapper */
  setSelection(sel: RowSelection | null, emit = true): void {
    const prev = this.sel;
    this.sel = sel ? normalizeSel(this.level, sel) : sel;
    this.updateSectionStates();
    this.updateRowStates();
    if (emit) this.emitSelection(prev);
  }

  clearSelection(): void {
    this.setSelection(null);
  }

  /** keyboard row navigation within the selected section */
  moveRowSelection(delta: number): void {
    if (!this.sel) return;
    const sec = this.level.sections.find((s) => s.id === this.sel?.sectionId);
    if (!sec || sec.rows.length === 0) return;
    const idx = sec.rows.findIndex((r) => r.id === this.sel?.rowId);
    const next = clamp(idx + delta, 0, sec.rows.length - 1);
    if (sec.rows[next].id !== this.sel?.rowId) this.setSelection({ sectionId: sec.id, rowId: sec.rows[next].id });
  }

  isSeatsVisible(): boolean {
    return this.pxPerUnit() >= this.seatVisibleAt;
  }

  pxPerUnit(): number {
    const rect = this.svg.getBoundingClientRect();
    const elW = rect.width || FALLBACK_SIZE.w;
    return elW / this.vb.w;
  }

  zoomBy(factor: number, clientX?: number, clientY?: number): void {
    const rect = this.svg.getBoundingClientRect();
    const elW = rect.width || FALLBACK_SIZE.w;
    const elH = rect.height || FALLBACK_SIZE.h;
    let px: number;
    let py: number;
    if (clientX === undefined || clientY === undefined) {
      const p = this.focusPoint();
      px = p.x;
      py = p.y;
    } else {
      const v = this.clientToVenue(clientX, clientY, rect, elW, elH);
      px = v.x;
      py = v.y;
    }
    const f = clamp(factor, 0.4, 2.5);
    this.vb = zoomViewBox(this.vb, f, px, py, this.fitW / 60, this.fitW * 1.8);
    this.applyViewBox();
  }

  /** zoom anchor: selected row/section when present, else the view centre */
  private focusPoint(): { x: number; y: number } {
    const sec = this.sel ? this.level.sections.find((s) => s.id === this.sel!.sectionId) : undefined;
    if (sec) {
      const row = this.sel!.rowId ? sec.rows.find((r) => r.id === this.sel!.rowId) : undefined;
      if (row && row.seats.length) {
        let sx = 0;
        let sy = 0;
        for (const st of row.seats) {
          sx += st.x;
          sy += st.y;
        }
        return { x: sx / row.seats.length, y: sy / row.seats.length };
      }
      const [cx, cy] = polygonCentroid(sec.polygon);
      return { x: cx, y: cy };
    }
    return { x: this.vb.x + this.vb.w / 2, y: this.vb.y + this.vb.h / 2 };
  }

  zoomIn(): void {
    this.zoomBy(1.45);
  }

  zoomOut(): void {
    this.zoomBy(1 / 1.45);
  }

  /** fit the current level into the host element */
  fit(): void {
    if (this.destroyed) return;
    const rect = this.wrap.getBoundingClientRect();
    const elW = rect.width || FALLBACK_SIZE.w;
    const elH = rect.height || FALLBACK_SIZE.h;
    const bounds = levelDisplayBounds(this.level, this.doc.stage);
    this.vb = fitViewBox(bounds, elW, elH);
    this.fitW = this.vb.w;
    this.applyViewBox();
  }

  /** alias of fit() — semantic name for toolbar buttons */
  reset(): void {
    this.fit();
  }

  /** screen (client) point -> venue coordinates */
  clientToVenue(clientX: number, clientY: number, rect = this.svg.getBoundingClientRect(), elW = rect.width, elH = rect.height): { x: number; y: number } {
    const w = elW || FALLBACK_SIZE.w;
    const h = elH || FALLBACK_SIZE.h;
    return {
      x: this.vb.x + ((clientX - rect.left) / w) * this.vb.w,
      y: this.vb.y + ((clientY - rect.top) / h) * this.vb.h,
    };
  }

  destroy(): void {
    this.destroyed = true;
    this.ro?.disconnect();
    this.svg.removeEventListener("pointerdown", this.onPointerDown);
    this.svg.removeEventListener("pointermove", this.onPointerMove);
    this.svg.removeEventListener("pointerup", this.onPointerUp);
    this.svg.removeEventListener("pointercancel", this.onPointerUp);
    this.svg.removeEventListener("pointerleave", this.onPointerLeave);
    this.svg.removeEventListener("wheel", this.onWheel);
    this.svg.removeEventListener("dblclick", this.onDblClick);
    this.svg.removeEventListener("keydown", this.onKeyDown);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.wrap.remove();
  }

  // ------------------------------------------------------------ rendering

  private renderLevel(): void {
    this.svg.querySelectorAll(".vs-level").forEach((n) => n.remove());
    const levelRoot = svgEl("g", { class: "vs-level" }, this.svg);

    if (this.doc.stage) this.renderStage(levelRoot);
    this.gSections = svgEl("g", { class: "vs-sections" }, levelRoot);
    this.gSeats = svgEl("g", { class: "vs-seatgroups" }, levelRoot);
    this.gLabels = svgEl("g", { class: "vs-labels" }, levelRoot);
    if (this.doc.stage) this.renderStageLabel();

    const fragSect = document.createDocumentFragment();
    const fragSeats = document.createDocumentFragment();
    const fragLabels = document.createDocumentFragment();

    for (const sec of this.level.sections) {
      const color = sectionColor(this.doc, sec);
      const avail = sectionAvailability(sec);
      const tier = priceTierOf(this.doc, sec.priceTierId);
      const path = svgEl(
        "path",
        {
          class: "vs-section",
          d: polygonPath(sec.polygon),
          fill: color,
          "data-sec": sec.id,
          tabindex: 0,
          role: "button",
          "aria-label": sectionAriaLabel(sec, tier?.name, tier?.price, avail),
        },
        fragSect
      );
      if (avail.available === 0) path.classList.add("vs-section--none");

      const gSec = svgEl("g", { class: "vs-sec", "data-sec": sec.id }, fragSeats);
      for (const row of sec.rows) {
        const gRow = svgEl("g", { class: "vs-row", "data-row": row.id }, gSec);
        for (const seat of row.seats) {
          const seatColor = priceTierOf(this.doc, seat.priceTierId ?? sec.priceTierId)?.color ?? color;
          const circle = svgEl(
            "circle",
            {
              class: "vs-seat",
              cx: seat.x,
              cy: seat.y,
              r: this.seatRadius,
              fill: seatColor,
              "data-seat": seat.id,
            },
            gRow
          );
          if (seat.status !== "available") circle.classList.add(`vs-seat--${seat.status}`);
        }
      }

      const [cx, cy] = polygonCentroid(sec.polygon);
      svgEl("text", { class: "vs-label", x: cx, y: cy + 4 }, fragLabels).textContent = sec.name;
    }
    this.gSections.appendChild(fragSect);
    this.gSeats.appendChild(fragSeats);
    this.gLabels.appendChild(fragLabels);
    this.fit();
  }

  private renderStage(parent: SVGGElement): void {
    const stage = this.doc.stage!;
    const w = stage.w ?? 240;
    const h = stage.h ?? 48;
    const g = svgEl("g", { class: "vs-stagegroup", transform: `rotate(${stage.rotation} ${stage.x} ${stage.y})` }, parent);
    svgEl("rect", { class: "vs-stage-glow", x: stage.x - w / 2 - 8, y: stage.y - h / 2 - 8, width: w + 16, height: h + 16, rx: 18 }, g);
    svgEl("rect", { class: "vs-stage", x: stage.x - w / 2, y: stage.y - h / 2, width: w, height: h, rx: 12 }, g);
    // facing indicator in local space (+y faces the audience at rotation 0)
    const ax = stage.x;
    const ay = stage.y + h / 2 + 4;
    svgEl("path", { d: `M${ax - 9} ${ay} L${ax + 9} ${ay} L${ax} ${ay + 12} Z`, fill: "rgba(110,168,255,.65)" }, g);
  }

  /** upright (never rotated) stage caption, centred inside the stage block */
  private renderStageLabel(): void {
    const stage = this.doc.stage!;
    const label = svgEl("text", { class: "vs-label vs-label--stage", x: stage.x, y: stage.y + 4.5 }, this.gLabels);
    label.textContent = "STAGE · 舞台";
  }

  private applyViewBox(): void {
    this.svg.setAttribute("viewBox", `${this.vb.x} ${this.vb.y} ${this.vb.w} ${this.vb.h}`);
    const ppu = this.pxPerUnit();
    this.wrap.classList.toggle("vs-zoomed-out", ppu < this.seatVisibleAt);
    this.wrap.classList.toggle("vs-hover-anim", ppu >= this.seatVisibleAt);
    // constant screen-size section labels
    const fs = clamp(13 / ppu, 0.8, 60);
    for (const t of this.gLabels.querySelectorAll<SVGTextElement>(".vs-label")) t.style.fontSize = `${fs}px`;
    this.wrap.classList.toggle("vs-labels-hidden", ppu < 0.32);
  }

  private updateSectionStates(): void {
    for (const path of this.gSections.querySelectorAll<SVGPathElement>(".vs-section")) {
      path.classList.toggle("vs-section--selected", path.dataset.sec === this.sel?.sectionId);
      path.setAttribute("aria-pressed", path.dataset.sec === this.sel?.sectionId ? "true" : "false");
    }
  }

  private updateRowStates(): void {
    const hot = this.hover.row?.id;
    const selectedRow = this.sel?.rowId;
    for (const g of this.gSeats.querySelectorAll<SVGGElement>(".vs-row")) {
      const id = g.dataset.row;
      g.classList.toggle("vs-row--hot", !!hot && id === hot);
      g.classList.toggle("vs-row--selected", !!selectedRow && id === selectedRow);
    }
  }

  private setHover(section: Section | null, row: Row | null, px: number, py: number): void {
    const changed = section?.id !== this.hover.section?.id || row?.id !== this.hover.row?.id;
    this.hover = { section, row };
    if (changed) {
      for (const path of this.gSections.querySelectorAll<SVGPathElement>(".vs-section"))
        path.classList.toggle("vs-section--hot", !!section && path.dataset.sec === section.id && path.dataset.sec !== this.sel?.sectionId);
      this.updateRowStates();
      this.events.onHoverChange?.(section ? { kind: row ? "row" : "section", section, row: row ?? undefined } : null);
    }
    if (section) {
      this.tooltip.innerHTML = this.tooltipHtml(section, row);
      this.tooltip.style.left = `${px}px`;
      this.tooltip.style.top = `${py}px`;
      this.tooltip.style.opacity = "1";
    } else {
      this.tooltip.style.opacity = "0";
    }
  }

  private tooltipHtml(sec: Section, row: Row | null): string {
    const tier = priceTierOf(this.doc, sec.priceTierId);
    const avail = row ? rowAvailability(row) : sectionAvailability(sec);
    const dot = tier ? `<span class="vs-dot" style="background:${tier.color}"></span>` : "";
    const price = tier?.price != null ? `<span class="vs-muted">¥${tier.price}</span>` : "";
    const where = row ? `${sec.name} · <b>${row.label}</b>` : `<b>${sec.name}</b>`;
    const count = avail.available > 0 ? `可用 ${avail.available} / ${avail.total}` : "已售罄";
    return `<div>${dot}${where}${price}</div><div class="vs-muted">${tier?.name ?? ""}${tier?.name ? " · " : ""}${count}</div>`;
  }

  private emitSelection(prev?: RowSelection | null): void {
    this.events.onSelectionChange?.(this.sel);
    if (this.sel && this.sel !== prev) {
      const sec = this.level.sections.find((s) => s.id === this.sel?.sectionId);
      if (!sec) return;
      const row = sec.rows.find((r) => r.id === this.sel?.rowId);
      const avail = row ? rowAvailability(row) : sectionAvailability(sec);
      this.live.textContent = row
        ? `已选中 ${sec.name} ${row.label}，可用 ${avail.available} / ${avail.total} 座`
        : `已选中 ${sec.name}，共 ${sec.rows.length} 排，可用 ${avail.available} / ${avail.total} 座`;
    } else if (!this.sel && prev !== undefined) {
      this.live.textContent = "已清除选择";
    }
  }

  // ----------------------------------------------------------- interactions

  private onPointerDown = (e: PointerEvent): void => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.lastPointer = { x: e.clientX, y: e.clientY };
    if (this.pointers.size === 1) {
      this.dragStart = { x: e.clientX, y: e.clientY, moved: false };
      this.wrap.classList.add("vs-dragging");
    } else if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      this.dragStart = null;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // two-finger pinch zoom
    if (this.pointers.size === 2 && this.pinchDist > 0) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = this.svg.getBoundingClientRect();
      const mid = this.clientToVenue((a.x + b.x) / 2, (a.y + b.y) / 2, rect);
      this.vb = zoomViewBox(this.vb, d / this.pinchDist, mid.x, mid.y, this.fitW / 60, this.fitW * 1.8);
      this.pinchDist = d;
      this.applyViewBox();
      return;
    }

    // pan
    if (this.dragStart && this.pointers.size === 1) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      if (!this.dragStart.moved && Math.hypot(dx, dy) > DRAG_TOLERANCE) this.dragStart.moved = true;
      if (this.dragStart.moved) {
        const rect = this.svg.getBoundingClientRect();
        const sx = this.vb.w / (rect.width || FALLBACK_SIZE.w);
        const sy = this.vb.h / (rect.height || FALLBACK_SIZE.h);
        this.vb.x += (e.clientX - this.lastPointer.x) * sx;
        this.vb.y += (e.clientY - this.lastPointer.y) * sy;
        this.applyViewBox();
        this.setHover(null, null, 0, 0);
        this.lastPointer = { x: e.clientX, y: e.clientY };
        return;
      }
    }
    this.lastPointer = { x: e.clientX, y: e.clientY };

    // hover (rAF-throttled)
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      if (this.destroyed || this.dragStart?.moved) return;
      const v = this.clientToVenue(e.clientX, e.clientY);
      const wrapRect = this.wrap.getBoundingClientRect();
      const sec = sectionAt(this.level, v.x, v.y) ?? null;
      let row: Row | null = null;
      if (sec && this.sel?.sectionId === sec.id) row = rowAt(sec, v.x, v.y) ?? null;
      this.setHover(sec, row, e.clientX - wrapRect.left, e.clientY - wrapRect.top);
    });
  };

  private onPointerUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.wrap.classList.remove("vs-dragging");
    const start = this.dragStart;
    this.dragStart = null;
    this.pinchDist = 0;
    if (!start || start.moved) return;
    const v = this.clientToVenue(e.clientX, e.clientY);
    this.activateAt(v.x, v.y);
  };

  private onPointerLeave = (): void => {
    this.setHover(null, null, 0, 0);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = Math.exp(clamp(-e.deltaY, -120, 120) * 0.0022);
    this.zoomBy(factor, e.clientX, e.clientY);
  };

  private onDblClick = (e: MouseEvent): void => {
    this.zoomBy(1.9, e.clientX, e.clientY);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as Element;
    const secId = target?.getAttribute?.("data-sec");
    if (e.key === "Escape") {
      this.setSelection(null);
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      if (this.sel?.sectionId) {
        e.preventDefault();
        this.moveRowSelection(e.key === "ArrowDown" ? 1 : -1);
      }
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && secId) {
      e.preventDefault();
      const sec = this.level.sections.find((s) => s.id === secId);
      if (!sec) return;
      const [cx, cy] = polygonCentroid(sec.polygon);
      this.activateAt(cx, cy);
    }
  };

  /** resolve a venue-space activation through core hit-testing */
  private activateAt(x: number, y: number): void {
    const sec = sectionAt(this.level, x, y);
    if (!sec) {
      if (this.sel) this.setSelection(null);
      return;
    }
    if (this.sel?.sectionId !== sec.id) {
      this.setSelection({ sectionId: sec.id });
      this.events.onSectionClick?.(sec, this.sel);
      return;
    }
    // same section: pick / toggle a row
    const row = rowAt(sec, x, y);
    if (!row) {
      this.setSelection(null);
      return;
    }
    if (this.sel?.rowId === row.id) this.setSelection({ sectionId: sec.id });
    else this.setSelection({ sectionId: sec.id, rowId: row.id });
    this.events.onRowClick?.(row, sec, this.sel);
  }
}

function normalizeSel(level: Level, sel: RowSelection): RowSelection {
  const exists = level.sections.some((s) => s.id === sel.sectionId);
  if (!exists) return sel; // may belong to another level; wrappers decide
  if (sel.rowId && !level.sections.some((s) => s.rows.some((r) => r.id === sel.rowId))) {
    return { sectionId: sel.sectionId };
  }
  return sel;
}

function sectionAriaLabel(sec: Section, tierName?: string, price?: number, avail = { available: 0, total: 0 }): string {
  const parts = [sec.name];
  if (tierName) parts.push(tierName);
  if (price != null) parts.push(`¥${price}`);
  parts.push(avail.available > 0 ? `可用 ${avail.available} / ${avail.total}` : "已售罄");
  return parts.join("，");
}
