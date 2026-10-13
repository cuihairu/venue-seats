import { useMemo, useRef, useState } from "react";
import { SeatMap, type SeatMapHandle } from "@venue-seats/react";
import {
  levelById,
  priceTierOf,
  rowAvailability,
  sectionAvailability,
  sectionColor,
  type RowSelection,
  type VenueDocument,
} from "@venue-seats/core";
import { DEMO_DISCLAIMER, DEMO_VENUES } from "@venue-seats/venues-demo";

export function App() {
  const [venueIdx, setVenueIdx] = useState(0);
  const venue = DEMO_VENUES[venueIdx];
  const [levelId, setLevelId] = useState<string>(venue.levels[0].id);
  const [selection, setSelection] = useState<RowSelection | null>(null);
  const mapRef = useRef<SeatMapHandle>(null);

  const level = levelById(venue, levelId) ?? venue.levels[0];

  const stats = useMemo(() => {
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
    if (!selection) return null;
    const sec = level.sections.find((s) => s.id === selection.sectionId);
    if (!sec) return null;
    const row = sec.rows.find((r) => r.id === selection.rowId);
    const avail = row ? rowAvailability(row) : sectionAvailability(sec);
    const tier = priceTierOf(venue, sec.priceTierId);
    return { sec, row, avail, tier };
  }, [venue, level, selection]);

  const switchVenue = (idx: number) => {
    setVenueIdx(idx);
    setLevelId(DEMO_VENUES[idx].levels[0].id);
    setSelection(null);
  };

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
          {DEMO_VENUES.map((v, i) => (
            <option key={v.venue.id} value={i}>
              {v.venue.name} · {v.venue.city}
            </option>
          ))}
        </select>
        <span className="badge" title={DEMO_DISCLAIMER}>
          示意重建 · 不代表真实场馆
        </span>
      </header>

      <div className="body">
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
                <dd>{level.sections.length}</dd>
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
            <button onClick={() => mapRef.current?.zoomIn()} title="放大" aria-label="放大">
              ＋
            </button>
            <button onClick={() => mapRef.current?.zoomOut()} title="缩小" aria-label="缩小">
              －
            </button>
            <button onClick={() => mapRef.current?.reset()} title="复位" aria-label="复位">
              ⤾
            </button>
          </section>
        </aside>

        <main className="map-area">
          <SeatMap
            ref={mapRef}
            doc={venue}
            levelId={levelId}
            selection={selection}
            onSelectionChange={setSelection}
            className="map"
          />
          <p className="footnote">{DEMO_DISCLAIMER}</p>
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
