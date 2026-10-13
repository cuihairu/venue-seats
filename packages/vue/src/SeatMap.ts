import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue";
import { SeatMapController, type HoverInfo } from "@venue-seats/renderer";
import type { RowSelection, VenueDocument } from "@venue-seats/core";

export interface VenueSeatMapExpose {
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  fit(): void;
  controller(): SeatMapController | undefined;
}

const sameSel = (a: RowSelection | null | undefined, b: RowSelection | null | undefined) =>
  a?.sectionId === b?.sectionId && a?.rowId === b?.rowId;

/**
 * Interactive venue seat map for Vue 3. Wraps the same SVG engine as the
 * React package, so behaviour and a11y are identical across frameworks.
 */
export const VenueSeatMap = defineComponent({
  name: "VenueSeatMap",
  props: {
    doc: { type: Object as PropType<VenueDocument>, required: true },
    levelId: { type: String, default: undefined },
    selection: { type: Object as PropType<RowSelection | null>, default: null },
    seatVisibleAt: { type: Number, default: undefined },
    seatRadius: { type: Number, default: undefined },
  },
  emits: {
    selectionChange: (_s: RowSelection | null) => true,
    sectionClick: (_sectionId: string, _selection: RowSelection | null) => true,
    rowClick: (_rowId: string, _sectionId: string, _selection: RowSelection | null) => true,
    hoverChange: (_h: HoverInfo | null) => true,
  },
  setup(props, { emit, expose }) {
    const host = ref<HTMLDivElement | null>(null);
    let ctrl: SeatMapController | undefined;

    onMounted(() => {
      ctrl = new SeatMapController(host.value!, {
        doc: props.doc,
        levelId: props.levelId,
        selection: props.selection ?? null,
        seatVisibleAt: props.seatVisibleAt,
        seatRadius: props.seatRadius,
        onSelectionChange: (s) => emit("selectionChange", s),
        onSectionClick: (sec, sel) => emit("sectionClick", sec.id, sel),
        onRowClick: (row, sec, sel) => emit("rowClick", row.id, sec.id, sel),
        onHoverChange: (hv) => emit("hoverChange", hv),
      });
    });

    watch(
      () => props.doc,
      (doc) => {
        if (ctrl && ctrl.getDoc() !== doc) {
          ctrl.setDoc(doc);
          if (props.levelId && props.levelId !== ctrl.levelId) ctrl.setLevel(props.levelId);
        }
      }
    );
    watch(
      () => props.levelId,
      (id) => {
        if (ctrl && id && id !== ctrl.levelId) ctrl.setLevel(id);
      }
    );
    watch(
      () => props.selection,
      (sel) => {
        if (ctrl && !sameSel(sel, ctrl.getSelection())) ctrl.setSelection(sel ?? null);
      }
    );

    onBeforeUnmount(() => {
      ctrl?.destroy();
      ctrl = undefined;
    });

    expose({
      zoomIn: () => ctrl?.zoomIn(),
      zoomOut: () => ctrl?.zoomOut(),
      reset: () => ctrl?.reset(),
      fit: () => ctrl?.fit(),
      controller: () => ctrl,
    } satisfies VenueSeatMapExpose);

    return () => h("div", { ref: host });
  },
});
