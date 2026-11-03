import { useEffect, useMemo, useRef, useState } from "react";
import { SeatMap, type SeatMapHandle } from "@venue-seats/react";
import { createVenueView, probe3D, type VenueView } from "@venue-seats/renderer-3d";
import {
  levelById,
  priceTierOf,
  rowAvailability,
  sectionAvailability,
  sectionColor,
  type RowSelection,
  type VenueDocument,
} from "@venue-seats/core";
import { DEMO_DISCLAIMER, EXAMPLES_NOTE, VENUES } from "./venues";

export function App() {
  const [venueIdx, setVenueIdx] = useState(0);
  // the index whose document `venue` currently holds; -1 while nothing is loaded
  const [loadedIdx, setLoadedIdx] = useState(-1);
  const [venue, setVenue] = useState<VenueDocument | null>(null);
  const [levelId, setLevelId] = useState<string>("");
  const [selection, setSelection] = useState<RowSelection | null>(null);
  const [mode3d, setMode3d] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const mapRef = useRef<SeatMapHandle>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<VenueView | null>(null);

  // lazy-load the selected venue; the JSON splits into its own chunk
  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    VENUES[venueIdx]
      .load()
      .then((doc) => {
        if (cancelled) return;
        setVenue(doc);
        setLoadedIdx(venueIdx);
        setLevelId(doc.levels[0].id);
        setSelection(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [venueIdx, retryTick]);

  // 3D view lifecycle: one VenueView per (venue, level), recreated on switch
  useEffect(() => {
    if (!mode3d || !venue) return;
    const host = hostRef.current;
    if (!host) return;
    const view = createVenueView(host, {
      doc: venue,
      levelId,
      selection,
      onSelectionChange: setSelection,
    });
    viewRef.current = view;
    setViewMode(view.mode);
    return () => {
      viewRef.current = null;
      view.destroy();
    };
    // selection is synced below without recreating the view
  }, [mode3d, venue, levelId]);

  // selection interop: the 3D view renders the same controlled state as 2D
  useEffect(() => {
    viewRef.current?.setSelection(selection, false);
  }, [selection, mode3d, venue]);

  const zoomInto = (dir: "in" | "out" | "reset") => {
    if (mode3d) {
      const v = viewRef.current;
      if (!v) return;
      if (dir === "in") v.zoomIn();
      else if (dir === "out") v.zoomOut();
      else v.reset();
      return;
    }
    if (dir === "in") mapRef.current?.zoomIn();
    else if (dir === "out") mapRef.current?.zoomOut();
    else mapRef.current?.reset();
  };

  const level = venue ? levelById(venue, levelId) ?? venue.levels[0] : null;

  const stats = useMemo(() => {
    if (!level) return { total: 0, available: 0 };
    let total = 0;
    let available = 0;
    for (const sec of level.sections) {
      const a = sectionAvailability(sec);
      total += a.total;
      available += a.available;
    }
    return { total, available };
  }, [venue, level]);

  const selected = useMemo(() => {
    if (!selection || !level || !venue) return null;
    const sec = level.sections.find((s) => s.id === selection.sectionId);
    if (!sec) return null;
    const row = sec.rows.find((r) => r.id === selection.rowId);
    const avail = row ? rowAvailability(row) : sectionAvailability(sec);
    const tier = priceTierOf(venue, sec.priceTierId);
    return { sec, row, avail, tier };
  }, [venue, level, selection]);

  const switchVenue = (idx: number) => {
    setVenueIdx(idx);
  };

  const retryLoad = () => {
    setLoadError(null);
    setRetryTick((t) => t + 1);
  };

  // Show the loading/error page until the loaded document matches the
  // selected index: a mid-switch must never render the old venue under a
  // selector that already points at the next one, and a failed switch must
  // identify the venue that failed instead of silently keeping the old one.
  if (!venue || loadedIdx !== venueIdx) {
    return (
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark" />
            venue-seats
            <span className="brand-sub">demo</span>
          </div>
          <select
            className="venue-select"
            value={venueIdx}
            onChange={(e) => switchVenue(Number(e.target.value))}
            aria-label="选择示例场馆"
          >
            {VENUES.map((v, i) => (
              <option key={v.id} value={i}>
                {v.name} · {v.city}
              </option>
            ))}
          </select>
          <span className="badge">{loadError ? "加载失败" : "加载中…"}</span>
        </header>
        <div className="body">
          {loadError ? (
            <div className="hint" role="alert">
              示例场馆加载失败：{loadError}
              <button className="cta" onClick={retryLoad}>
                重试
              </button>
            </div>
          ) : (
            <p className="muted hint">正在加载示例场馆…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          venue-seats
          <span className="brand-sub">demo</span>
        </div>
        <select
          className="venue-select"
          value={venueIdx}
          onChange={(e) => switchVenue(Number(e.target.value))}
          aria-label="选择示例场馆"
        >
          {VENUES.map((v, i) => (
            <option key={v.id} value={i}>
              {v.name} · {v.city}
            </option>
          ))}
        </select>
        <span className="badge" title={venue.provenance === "public" ? EXAMPLES_NOTE : DEMO_DISCLAIMER}>
          {venue.provenance === "public" ? "公开口径重建 · 座位示意" : "示意重建 · 不代表真实场馆"}
        </span>
        <div className="mode-switch" role="group" aria-label="视图切换">
          <button aria-pressed={!mode3d} className={mode3d ? "" : "active"} onClick={() => setMode3d(false)}>
            2D
          </button>
          <button aria-pressed={mode3d} className={mode3d ? "active" : ""} onClick={() => setMode3d(true)}>
            3D
          </button>
        </div>
      </header>

      <div className="body">
        {loadError && (
          <div className="hint" role="alert" style={{ gridColumn: "1 / -1" }}>
            示例场馆加载失败：{loadError}
            <button className="cta" onClick={retryLoad}>
              重试
            </button>
          </div>
        )}
        <aside className="side">
          <section className="card">
            <h2>{venue.venue.name}</h2>
            <p className="muted">
              {venue.venue.city} · {venue.venue.address}
            </p>
            <dl className="stats">
              <div>
                <dt>楼层</dt>
                <dd>{venue.levels.length}</dd>
              </div>
              <div>
                <dt>分区</dt>
                <dd>{level ? level.sections.length : 0}</dd>
              </div>
              <div>
                <dt>余座</dt>
                <dd>
                  {stats.available.toLocaleString()}
                  <span className="muted"> / {stats.total.toLocaleString()}</span>
                </dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h3>看台楼层</h3>
            <div className="levels" role="tablist" aria-label="楼层切换">
              {venue.levels.map((l) => (
                <button
                  key={l.id}
                  role="tab"
                  aria-selected={l.id === levelId}
                  className={l.id === levelId ? "level-tab active" : "level-tab"}
                  onClick={() => {
                    setLevelId(l.id);
                    setSelection(null);
                  }}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <h3>票价图例</h3>
            <ul className="legend">
              {venue.priceTiers.map((t) => {
                const count = countTier(venue, levelId, t.id);
                return (
                  <li key={t.id}>
                    <span className="chip" style={{ background: t.color }} />
                    <span className="legend-name">{t.name}</span>
                    <span className="legend-price">{t.price != null ? `¥${t.price}` : "不对外"}</span>
                    <span className="muted">{count.available.toLocaleString()} 座</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card controls">
            <button onClick={() => zoomInto("in")} title="放大" aria-label="放大">
              ＋
            </button>
            <button onClick={() => zoomInto("out")} title="缩小" aria-label="缩小">
              －
            </button>
            <button onClick={() => zoomInto("reset")} title="复位" aria-label="复位">
              ⤾
            </button>
          </section>
        </aside>

        <main className="map-area">
          {mode3d ? (
            <div ref={hostRef} className="map map-3d" aria-label="3D 视图" />
          ) : (
            <SeatMap
              ref={mapRef}
              doc={venue}
              levelId={levelId}
              selection={selection}
              onSelectionChange={setSelection}
              className="map"
            />
          )}
          {mode3d && viewMode === "2d" && (
            <p className="footnote">
              {probe3D().webgl
                ? "当前视口较窄，已自动回退 2D 视图；放大窗口可查看 3D。"
                : "当前浏览器不支持 WebGL，已自动回退 2D 视图。"}
            </p>
          )}
          <p className="footnote">{venue.provenance === "public" ? EXAMPLES_NOTE : DEMO_DISCLAIMER}</p>
        </main>

        <aside className="side right">
          <section className="card">
            <h3>当前选择</h3>
            {selected ? (
              <div className="selection">
                <div className="sel-name">{selected.sec.name}</div>
                {selected.row && <div className="sel-row">{selected.row.label}</div>}
                <div className="muted">{selected.tier?.name}</div>
                <div className="bar" aria-hidden>
                  <span
                    style={{
                      width: `${Math.round((selected.avail.available / Math.max(selected.avail.total, 1)) * 100)}%`,
                      background: selected.tier ? sectionColor(venue, selected.sec) : "#64748b",
                    }}
                  />
                </div>
                <div className="muted">
                  可用 {selected.avail.available} / {selected.avail.total} 座
                </div>
                <button className="cta" disabled={!selected.row}>
                  {selected.row ? "锁定此排（示意）" : "请选择排"}
                </button>
              </div>
            ) : (
              <p className="muted hint">
                点击分区选择，再点击排
                <br />
                滚轮缩放 · 拖动平移
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function countTier(venue: VenueDocument, levelId: string, tierId: string) {
  const level = levelById(venue, levelId);
  let total = 0;
  let available = 0;
  for (const sec of level?.sections ?? []) {
    if (sec.priceTierId !== tierId) continue;
    const a = sectionAvailability(sec);
    total += a.total;
    available += a.available;
  }
  return { total, available };
}
