/// Geometry helpers — pure Dart, mirroring `@venue-seats/core`.
/// Shared by the painter and the widget hit-testing so the Flutter renderer
/// resolves exactly the same geometry as the DOM renderer.
library;

import 'dart:math' as math;

import 'model.dart';

class VenueBounds {
  const VenueBounds({required this.minX, required this.minY, required this.maxX, required this.maxY});

  factory VenueBounds.empty() => const VenueBounds(minX: 0, minY: 0, maxX: 0, maxY: 0);

  final double minX, minY, maxX, maxY;
  double get width => maxX - minX;
  double get height => maxY - minY;
  double get centerX => (minX + maxX) / 2;
  double get centerY => (minY + maxY) / 2;
}

List<List<double>> sectionPoints(Section s) {
  final pts = <List<double>>[...s.polygon];
  for (final row in s.rows) {
    for (final seat in row.seats) {
      pts.add([seat.x, seat.y]);
    }
  }
  return pts;
}

VenueBounds? boundsOf(Iterable<List<double>> points) {
  if (points.isEmpty) return null;
  final list = points.toList();
  var minX = list[0][0];
  var minY = list[0][1];
  var maxX = minX;
  var maxY = minY;
  for (final p in list) {
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
  }
  return VenueBounds(minX: minX, minY: minY, maxX: maxX, maxY: maxY);
}

/// Bounding box of a level's sections, polygons and seats.
VenueBounds levelBounds(Level level) =>
    boundsOf(level.sections.expand(sectionPoints)) ??
    const VenueBounds(minX: 0, minY: 0, maxX: 100, maxY: 100);

/// Display bounds: level content plus the stage footprint (used for fitting).
VenueBounds levelDisplayBounds(Level level, Stage? stage) {
  final b = levelBounds(level);
  if (stage == null) return b;
  final hw = (stage.w ?? 240) / 2;
  final hh = (stage.h ?? 48) / 2;
  return VenueBounds(
    minX: b.minX < stage.x - hw ? b.minX : stage.x - hw,
    minY: b.minY < stage.y - hh ? b.minY : stage.y - hh,
    maxX: b.maxX > stage.x + hw ? b.maxX : stage.x + hw,
    maxY: b.maxY > stage.y + hh ? b.maxY : stage.y + hh,
  );
}

/// Ray-casting point-in-polygon test.
bool pointInPolygon(double x, double y, List<List<double>> polygon) {
  var inside = false;
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    final xi = polygon[i][0], yi = polygon[i][1];
    final xj = polygon[j][0], yj = polygon[j][1];
    final intersects =
        (yi > y) != (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/// Which section contains the given venue coordinate, if any.
Section? sectionAt(Level level, double x, double y) {
  for (final s in level.sections) {
    if (pointInPolygon(x, y, s.polygon)) return s;
  }
  return null;
}

/// Nearest row to a venue coordinate inside a section (row hit-testing).
SeatRow? rowAt(Section section, double x, double y, {double maxDistance = 40}) {
  SeatRow? best;
  var bestDist = maxDistance;
  for (final row in section.rows) {
    if (row.seats.isEmpty) continue;
    var sx = 0.0, sy = 0.0;
    for (final s in row.seats) {
      sx += s.x;
      sy += s.y;
    }
    final dx = sx / row.seats.length - x;
    final dy = sy / row.seats.length - y;
    final d = math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) {
      bestDist = d;
      best = row;
    }
  }
  return best;
}

/// Nearest seat to a venue coordinate inside a section, within [hitRadius]
/// venue units. Used for per-seat (L2) hit-testing; the widget passes its own
/// [seatRadius] so a tap only lands on a seat that is actually painted.
Seat? seatAt(Section section, double x, double y, {double hitRadius = 3.4}) {
  Seat? best;
  var bestDist = hitRadius;
  for (final row in section.rows) {
    for (final seat in row.seats) {
      final dx = seat.x - x;
      final dy = seat.y - y;
      final d = math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        best = seat;
      }
    }
  }
  return best;
}

class Availability {
  const Availability({required this.total, required this.available});
  final int total;
  final int available;
}

Availability rowAvailability(SeatRow row) => Availability(
      total: row.seats.length,
      available: row.seats.where((s) => s.status == SeatStatus.available || s.status == SeatStatus.selected).length,
    );

Availability sectionAvailability(Section section) {
  var total = 0, available = 0;
  for (final row in section.rows) {
    final a = rowAvailability(row);
    total += a.total;
    available += a.available;
  }
  return Availability(total: total, available: available);
}

PriceTier? priceTierOf(VenueDocument doc, String? tierId) {
  if (tierId == null) return null;
  for (final t in doc.priceTiers) {
    if (t.id == tierId) return t;
  }
  return null;
}

/// Section colour: its own price tier, else a neutral fallback.
String sectionColor(VenueDocument doc, Section section) =>
    priceTierOf(doc, section.priceTierId)?.color ?? '#64748b';

/// "Best fit" transform of a bounds into a viewport: the content is centred
/// and fully visible, with [padRatio] of slack around it. Mirrors
/// `fitViewBox` in `@venue-seats/renderer` so Flutter frames a venue exactly
/// like the DOM renderer does.
class ViewFit {
  const ViewFit({required this.pxPerUnit, required this.dx, required this.dy});
  factory ViewFit.bounds(VenueBounds b, double viewW, double viewH, {double padRatio = 0.05}) {
    final padX = b.width * padRatio;
    final padY = b.height * padRatio;
    final scale = (viewW / (b.width + padX * 2)).clamp(
        double.negativeInfinity, (viewH / (b.height + padY * 2)));
    return ViewFit(
      pxPerUnit: scale,
      // centre the content, not the padding — the slack belongs outside the
      // bounds, so the origin has to be folded in as well.
      dx: (viewW - b.width * scale) / 2 - b.minX * scale,
      dy: (viewH - b.height * scale) / 2 - b.minY * scale,
    );
  }

  final double pxPerUnit;
  final double dx;
  final double dy;

  /// Value equality: the widget builds a new painter on every frame, so the
  /// renderer can only skip a repaint if an unchanged fit compares equal.
  @override
  bool operator ==(Object other) =>
      other is ViewFit && other.pxPerUnit == pxPerUnit && other.dx == dx && other.dy == dy;
  @override
  int get hashCode => Object.hash(pxPerUnit, dx, dy);

  (double, double) venueToPx(double x, double y) => (dx + x * pxPerUnit, dy + y * pxPerUnit);
  (double, double) pxToVenue(double px, double py) => ((px - dx) / pxPerUnit, (py - dy) / pxPerUnit);
}

(double, double) polygonCentroid(List<List<double>> polygon) {
  var sx = 0.0, sy = 0.0;
  for (final p in polygon) {
    sx += p[0];
    sy += p[1];
  }
  return (sx / polygon.length, sy / polygon.length);
}
