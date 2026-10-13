import { forwardRef, useEffect, useImperativeHandle, useRef, type CSSProperties } from "react";
import { SeatMapController, type HoverInfo } from "@venue-seats/renderer";
import type { RowSelection, Seat, Section, VenueDocument } from "@venue-seats/core";

export interface SeatMapProps {
  doc: VenueDocument;
  levelId?: string;
  selection?: RowSelection | null;
  seatVisibleAt?: number;
  seatRadius?: number;
  onSelectionChange?: (selection: RowSelection | null) => void;
  onSectionClick?: (sectionId: string, selection: RowSelection | null) => void;
  onRowClick?: (rowId: string, sectionId: string, selection: RowSelection | null) => void;
  /** fired when a seat is toggled; `seat.status` is the new status */
  onSeatToggle?: (seat: Seat, section: Section) => void;
  onHoverChange?: (hover: HoverInfo | null) => void;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

export interface SeatMapHandle {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  fit(): void;
  controller(): SeatMapController | undefined;
}

const sameSel = (a: RowSelection | null | undefined, b: RowSelection | null | undefined) =>
  a?.sectionId === b?.sectionId && a?.rowId === b?.rowId;

/**
 * Interactive venue seat map. Wraps the framework-agnostic SVG engine, so the
 * behaviour (zoom, hover, hit-testing, a11y) is identical to the Vue package.
 */
export const SeatMap = forwardRef<SeatMapHandle, SeatMapProps>(function SeatMap(props, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const ctrlRef = useRef<SeatMapController | undefined>(undefined);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const p = latest.current;
    const ctrl = new SeatMapController(host, {
      doc: p.doc,
      levelId: p.levelId,
      selection: p.selection ?? null,
      seatVisibleAt: p.seatVisibleAt,
      seatRadius: p.seatRadius,
      onSelectionChange: (s) => latest.current.onSelectionChange?.(s),
      onSectionClick: (sec, sel) => latest.current.onSectionClick?.(sec.id, sel),
      onRowClick: (row, sec, sel) => latest.current.onRowClick?.(row.id, sec.id, sel),
      onSeatToggle: (seat, sec) => latest.current.onSeatToggle?.(seat, sec),
      onHoverChange: (h) => latest.current.onHoverChange?.(h),
    });
    ctrlRef.current = ctrl;
    return () => {
      ctrl.destroy();
      ctrlRef.current = undefined;
    };
  }, []);

  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (ctrl && ctrl.getDoc() !== props.doc) {
      ctrl.setDoc(props.doc);
      if (props.levelId && props.levelId !== ctrl.levelId) ctrl.setLevel(props.levelId);
    }
  }, [props.doc, props.levelId]);

  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (ctrl && props.levelId && props.levelId !== ctrl.levelId) ctrl.setLevel(props.levelId);
  }, [props.levelId]);

  useEffect(() => {
    const ctrl = ctrlRef.current;
    if (ctrl && !sameSel(props.selection, ctrl.getSelection())) ctrl.setSelection(props.selection ?? null);
  }, [props.selection]);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => ctrlRef.current?.zoomIn(),
      zoomOut: () => ctrlRef.current?.zoomOut(),
      reset: () => ctrlRef.current?.reset(),
      fit: () => ctrlRef.current?.fit(),
      controller: () => ctrlRef.current,
    }),
    []
  );

  // callback props are consumed via latest.current; keep them off the DOM node
  const {
    doc: _d,
    selection: _s,
    levelId: _l,
    onSelectionChange: _onSelectionChange,
    onSectionClick: _onSectionClick,
    onRowClick: _onRowClick,
    onSeatToggle: _onSeatToggle,
    onHoverChange: _onHoverChange,
    ...rest
  } = props;
  return <div ref={hostRef} className={props.className} style={props.style} {...rest} />;
});
