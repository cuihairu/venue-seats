import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'geometry.dart';
import 'model.dart';
import 'painter.dart';

export 'geometry.dart' show ViewFit, VenueBounds, Availability, levelDisplayBounds;
export 'model.dart'
    show Seat, SeatStatus, SeatRow, Section, Level, PriceTier, Stage, Venue, VenueDocument;
export 'painter.dart' show SeatSelection, SeatMapHover, VenueSeatMapPainter;

/// Interactive 2D seat map (L1: sections + rows) for one level of a venue.
///
/// * zoom & pan: mouse wheel / drag / pinch (InteractiveViewer, clamped)
/// * tap: outside = clear · section = select · same section = pick/toggle row,
///   or toggle a seat once seats are visible (L2)
/// * hover (desktop): section highlight, then row and seat highlight once selected
/// * callbacks mirror `@venue-seats/react` / `@venue-seats/vue`
class VenueSeatMap extends StatefulWidget {
  const VenueSeatMap({
    super.key,
    required this.document,
    this.levelId,
    this.selection,
    this.onSelectionChanged,
    this.onSectionActivated,
    this.onRowActivated,
    this.onSeatActivated,
    this.onHoverChanged,
    this.seatVisibleAt = 0.7,
    this.seatRadius = 3.4,
    this.minZoom = 0.6,
    this.maxZoom = 40,
    this.backgroundColor = const Color(0xff0b101b),
  });

  final VenueDocument document;

  /// Level to display; defaults to the first level.
  final String? levelId;

  /// Controlled selection.
  final SeatSelection? selection;

  final ValueChanged<SeatSelection?>? onSelectionChanged;
  final ValueChanged<Section>? onSectionActivated;
  final ValueChanged<SeatRow>? onRowActivated;

  /// A seat was toggled by a tap; `seat.status` is the new status. Only fired
  /// while seats are visible; the L1 selection is left untouched.
  final ValueChanged<Seat>? onSeatActivated;

  final ValueChanged<SeatMapHover?>? onHoverChanged;

  /// Seats become visible above this many screen px per venue unit.
  final double seatVisibleAt;
  final double seatRadius;
  final double minZoom;
  final double maxZoom;
  final Color backgroundColor;

  @override
  State<VenueSeatMap> createState() => _VenueSeatMapState();
}

class _VenueSeatMapState extends State<VenueSeatMap> {
  final TransformationController _transform = TransformationController();
  SeatMapHover? _hover;
  ViewFit? _fit;
  Size? _viewport;

  /// Mirrors [VenueSeatMap.selection]; the state machine advances against this
  /// so consecutive taps work even before the host rebuilds with a new prop.
  SeatSelection? _selection;

  /// Per-seat status overrides (L2); replaced immutably on every toggle.
  Map<String, SeatStatus> _seatStatus = {};

  Level get _level {
    final id = widget.levelId;
    for (final l in widget.document.levels) {
      if (l.id == id) return l;
    }
    return widget.document.levels.first;
  }

  @override
  void initState() {
    super.initState();
    _selection = widget.selection;
    _transform.addListener(_onTransform);
  }

  @override
  void didUpdateWidget(covariant VenueSeatMap old) {
    super.didUpdateWidget(old);
    _selection = widget.selection;
    if (old.document != widget.document) {
      _seatStatus = {}; // a new document carries its own seat statuses
    }
    if (old.document != widget.document || old.levelId != widget.levelId) {
      _hover = null;
      _fit = null; // refit for the new level
      _fitToViewport(_viewport);
    }
  }

  @override
  void dispose() {
    _transform.removeListener(_onTransform);
    _transform.dispose();
    super.dispose();
  }

  void _onTransform() => setState(() {});

  void _fitToViewport(Size? size) {
    if (size == null || size.width <= 0 || size.height <= 0) return;
    _viewport = size;
    final bounds = levelDisplayBounds(_level, widget.document.stage);
    _fit = ViewFit.bounds(bounds, size.width, size.height);
    // The painter draws in fit space (fit.venueToPx), so the InteractiveViewer
    // matrix starts at identity; user zoom/pan composes on top of it.
    _transform.value = Matrix4.identity();
  }

  /// Mirrors the painter's seat visibility gate so hit-testing only resolves
  /// seats that are actually drawn.
  bool get _seatsVisible {
    final fit = _fit;
    if (fit == null) return false;
    final ppu = fit.pxPerUnit * _transform.value.storage[0].abs();
    return ppu >= widget.seatVisibleAt;
  }

  /// Map a viewport-local point to venue coordinates through the current
  /// InteractiveViewer transform and the fit transform.
  (double, double)? _toVenue(Offset local) {
    final fit = _fit;
    if (fit == null) return null;
    final m = _transform.value.storage;
    final sx = m[0] == 0 ? 1.0 : m[0];
    final tx = m[12];
    final ty = m[13];
    final child = Offset((local.dx - tx) / sx, (local.dy - ty) / sx);
    return fit.pxToVenue(child.dx, child.dy);
  }

  SeatSelection? _applySelectionAt(double x, double y) {
    final level = _level;
    final sec = sectionAt(level, x, y);
    final sel = _selection;
    if (sec == null) {
      _selection = null;
      widget.onSelectionChanged?.call(null);
      return null;
    }
    if (sel?.sectionId != sec.id) {
      widget.onSectionActivated?.call(sec);
      _selection = SeatSelection(sec.id);
      widget.onSelectionChanged?.call(_selection);
      return _selection;
    }
    // same section: with seats visible a tap on a seat toggles it (L2),
    // otherwise it picks / toggles the row (L1)
    if (_seatsVisible) {
      final seat = seatAt(sec, x, y, hitRadius: widget.seatRadius);
      if (seat != null) {
        _toggleSeat(seat, sec);
        return sel;
      }
    }
    final row = rowAt(sec, x, y);
    if (row == null) {
      _selection = null; // same section but no row under tap: clear (matches TS)
      widget.onSelectionChanged?.call(null);
      return null;
    }
    final next = sel?.rowId == row.id ? SeatSelection(sec.id) : SeatSelection(sec.id, row.id);
    if (next.rowId != null) widget.onRowActivated?.call(row);
    _selection = next;
    widget.onSelectionChanged?.call(next);
    return next;
  }

  /// Toggle one seat's status (sold/held are ignored). The new status lives in
  /// a local overlay until the host rebuilds with an updated document; the L1
  /// selection is left untouched.
  void _toggleSeat(Seat seat, Section sec) {
    final current = _seatStatus[seat.id] ?? seat.status;
    final next = _toggleStatus(seat, current);
    if (next.status == current) return; // sold/held never toggle
    _seatStatus = {..._seatStatus, seat.id: next.status};
    setState(() {});
    widget.onSeatActivated?.call(next);
  }

  static Seat _toggleStatus(Seat s, SeatStatus st) =>
      (st == SeatStatus.sold || st == SeatStatus.held)
          ? s
          : Seat(
              id: s.id,
              label: s.label,
              x: s.x,
              y: s.y,
              priceTierId: s.priceTierId,
              status: st == SeatStatus.selected ? SeatStatus.available : SeatStatus.selected);

  SeatMapHover? _hoverAt(double x, double y) {
    final sec = sectionAt(_level, x, y);
    if (sec == null) return null;
    SeatRow? row;
    Seat? seat;
    if (_selection?.sectionId == sec.id) {
      row = rowAt(sec, x, y);
      if (_seatsVisible) seat = seatAt(sec, x, y, hitRadius: widget.seatRadius);
    }
    return SeatMapHover.section(section: sec, row: row, seat: seat);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Size(constraints.maxWidth, constraints.maxHeight);
        if (_viewport != size) {
          WidgetsBinding.instance.addPostFrameCallback((_) => _fitToViewport(size));
        }
        final fit = _fit ??
            ViewFit.bounds(
              levelDisplayBounds(_level, widget.document.stage),
              math.max(size.width, 1),
              math.max(size.height, 1),
            );
        final pxPerUnit = fit.pxPerUnit * (_transform.value.storage[0].abs());

        return ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: ColoredBox(
            color: widget.backgroundColor,
            child: Listener(
              onPointerSignal: (event) {
                // wheel zoom handled by InteractiveViewer; nothing extra
              },
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTapUp: (d) {
                  final v = _toVenue(d.localPosition);
                  if (v == null) return;
                  _applySelectionAt(v.$1, v.$2);
                },
                child: MouseRegion(
                  onHover: (event) {
                    final v = _toVenue(event.localPosition);
                    if (v == null) return;
                    final h = _hoverAt(v.$1, v.$2);
                    final changed = h?.section.id != _hover?.section.id || h?.row?.id != _hover?.row?.id;
                    if (changed) {
                      setState(() => _hover = h);
                      widget.onHoverChanged?.call(h);
                    }
                  },
                  onExit: (_) {
                    if (_hover != null) {
                      setState(() => _hover = null);
                      widget.onHoverChanged?.call(null);
                    }
                  },
                  child: InteractiveViewer(
                    transformationController: _transform,
                    panEnabled: true,
                    scaleEnabled: true,
                    minScale: widget.minZoom,
                    maxScale: widget.maxZoom,
                    constrained: false,
                    alignment: Alignment.topLeft,
                    child: SizedBox(
                      width: math.max(size.width, 1),
                      height: math.max(size.height, 1),
                      child: CustomPaint(
                        painter: VenueSeatMapPainter(
                          document: widget.document,
                          level: _level,
                          fit: fit,
                          selection: widget.selection,
                          hover: _hover,
                          pxPerUnit: pxPerUnit,
                          seatVisibleAt: widget.seatVisibleAt,
                          seatRadius: widget.seatRadius,
                          seatStatusOverrides: _seatStatus,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
