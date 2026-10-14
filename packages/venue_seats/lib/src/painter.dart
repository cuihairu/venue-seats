import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

import 'geometry.dart';
import 'model.dart';

Color _hex(String color, {double opacity = 1.0}) {
  var v = color.trim();
  if (v.startsWith('#')) v = v.substring(1);
  if (v.length == 3) v = v.split('').map((c) => c * 2).join();
  final value = int.parse(v, radix: 16);
  return Color.fromARGB((255 * opacity).round(), (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff);
}

/// L1 selection: a section, optionally narrowed to one of its rows.
class SeatSelection {
  const SeatSelection(this.sectionId, [this.rowId]);
  final String sectionId;
  final String? rowId;

  @override
  bool operator ==(Object other) =>
      other is SeatSelection && other.sectionId == sectionId && other.rowId == rowId;
  @override
  int get hashCode => Object.hash(sectionId, rowId);
}

/// Hover target reported to the host.
class SeatMapHover {
  const SeatMapHover.section({required this.section, this.row, this.seat});
  final Section section;
  final SeatRow? row;

  /// Present when the pointer is over a seat of the selected section.
  final Seat? seat;

  /// Compared by id so an unchanged hover does not force a repaint.
  @override
  bool operator ==(Object other) =>
      other is SeatMapHover &&
      other.section.id == section.id &&
      other.row?.id == row?.id &&
      other.seat?.id == seat?.id;
  @override
  int get hashCode => Object.hash(section.id, row?.id, seat?.id);
}

/// Paints one venue level: sections by price tier, seats by status, stage.
class VenueSeatMapPainter extends CustomPainter {
  const VenueSeatMapPainter({
    required this.document,
    required this.level,
    required this.fit,
    required this.selection,
    this.hover,
    this.pxPerUnit,
    this.seatVisibleAt = 0.7,
    this.seatRadius = 3.4,
    this.seatStatusOverrides,
  });

  final VenueDocument document;
  final Level level;
  final ViewFit fit;
  final SeatSelection? selection;
  final SeatMapHover? hover;
  final double? pxPerUnit;
  final double seatVisibleAt;
  final double seatRadius;

  /// Per-seat status overrides (L2). The widget owns the map and passes a new
  /// instance on every toggle so [shouldRepaint] notices the change.
  final Map<String, SeatStatus>? seatStatusOverrides;

  bool get seatsVisible => (pxPerUnit ?? fit.pxPerUnit) >= seatVisibleAt;

  /// Effective status of a seat: a local override, else the document's.
  SeatStatus seatStatusOf(Seat seat) => seatStatusOverrides?[seat.id] ?? seat.status;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = fit.pxPerUnit;
    Offset toPx(List<double> x) {
      final p = fit.venueToPx(x[0], x[1]);
      return Offset(p.$1, p.$2);
    }

    // ---- sections ----
    for (final sec in level.sections) {
      final base = _hex(sectionColor(document, sec));
      final isSel = selection?.sectionId == sec.id;
      final isHot = hover?.section.id == sec.id && !isSel;
      final avail = sectionAvailability(sec);
      var opacity = 0.48;
      if (avail.available == 0) opacity = 0.22;
      if (isHot) opacity = 0.68;
      if (isSel) opacity = 0.78;
      final path = Path()
        ..moveTo(toPx(sec.polygon[0]).dx, toPx(sec.polygon[0]).dy);
      for (var i = 1; i < sec.polygon.length; i++) {
        final p = toPx(sec.polygon[i]);
        path.lineTo(p.dx, p.dy);
      }
      path.close();
      canvas.drawPath(path, Paint()..color = base.withValues(alpha: opacity));
      canvas.drawPath(
        path,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = isSel ? 2.2 : (isHot ? 1.6 : 1.0)
          ..color = isSel
              ? Colors.white
              : (isHot ? Colors.white.withValues(alpha: 0.85) : const Color(0x33E2ECFF)),
      );
    }

    // ---- seats ----
    if (seatsVisible) {
      for (final sec in level.sections) {
        final secColor = _hex(sectionColor(document, sec));
        const soldColor = Color(0xff333c50);
        const heldColor = Color(0xff3d4a63);
        final rowSelected = selection?.rowId;
        for (final row in sec.rows) {
          final isRowHot = hover?.row?.id == row.id;
          final isRowSel = rowSelected == row.id;
          for (final seat in row.seats) {
            final p = fit.venueToPx(seat.x, seat.y);
            final c = Offset(p.$1, p.$2);
            final status = seatStatusOf(seat);
            var paint = Paint()
              ..color = seat.priceTierId == null
                  ? secColor
                  : _hex(priceTierOf(document, seat.priceTierId)?.color ?? sectionColor(document, sec));
            switch (status) {
              case SeatStatus.sold:
                paint = Paint()..color = soldColor.withValues(alpha: 0.85);
                break;
              case SeatStatus.held:
                paint = Paint()..color = heldColor.withValues(alpha: 0.9);
                break;
              case SeatStatus.selected:
                paint = Paint()..color = Colors.white;
                break;
              case SeatStatus.available:
                if (isRowSel) paint = Paint()..color = Colors.white;
                break;
            }
            final r = seatRadius * scale;
            canvas.drawCircle(c, r, paint);
            if (isRowHot || isRowSel) {
              if (status != SeatStatus.sold && status != SeatStatus.held) {
                canvas.drawCircle(
                  c,
                  r + 1,
                  Paint()
                    ..style = PaintingStyle.stroke
                    ..strokeWidth = 1
                    ..color = isRowSel ? const Color(0xff6ea8ff) : Colors.white,
                );
              }
            }
          }
        }
      }
    }

    // ---- stage ----
    final stage = document.stage;
    if (stage != null) {
      final w = stage.w ?? 240;
      final h = stage.h ?? 48;
      final p = fit.venueToPx(stage.x, stage.y);
      canvas.save();
      canvas.translate(p.$1, p.$2);
      canvas.rotate(stage.rotation * math.pi / 180);
      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(-w / 2 * scale, -h / 2 * scale, w * scale, h * scale),
        const Radius.circular(12),
      );
      final glow = RRect.fromRectAndRadius(
        Rect.fromLTWH((-w / 2 - 8) * scale, (-h / 2 - 8) * scale, (w + 16) * scale, (h + 16) * scale),
        const Radius.circular(18),
      );
      canvas.drawRRect(glow, Paint()..color = const Color(0x386ea8ff));
      canvas.drawRRect(rect, Paint()..color = const Color(0xff101828));
      canvas.drawRRect(
        rect,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 1.4
          ..color = Colors.white.withValues(alpha: 0.5),
      );
      // facing indicator: local +y faces the audience at rotation 0
      canvas.translate(0, h / 2 * scale + 4);
      final tri = Path()
        ..moveTo(-9, 0)
        ..lineTo(9, 0)
        ..lineTo(0, 12)
        ..close();
      canvas.drawPath(tri, Paint()..color = const Color(0xa66ea8ff));
      canvas.restore();
    }

    // ---- labels ----
    final showLabels = (pxPerUnit ?? scale) >= 0.32;
    if (showLabels) {
      const labelSize = 13.0;
      for (final sec in level.sections) {
        final (cx, cy) = polygonCentroid(sec.polygon);
        final p = fit.venueToPx(cx, cy);
        final tp = TextPainter(
          text: TextSpan(
            text: sec.name ?? sec.id,
            style: const TextStyle(color: Color(0xffdfe8f8), fontSize: labelSize, fontWeight: FontWeight.w600),
          ),
          textDirection: ui.TextDirection.ltr,
        )..layout();
        tp.paint(canvas, Offset(p.$1 - tp.width / 2, p.$2 - tp.height / 2));
      }
      if (stage != null) {
        final p = fit.venueToPx(stage.x, stage.y + 4.5);
        final tp = TextPainter(
          text: const TextSpan(
            text: 'STAGE · 舞台',
            style: TextStyle(color: Color(0xfff2f6ff), fontSize: 13, fontWeight: FontWeight.w700, letterSpacing: 2),
          ),
          textDirection: ui.TextDirection.ltr,
        )..layout();
        tp.paint(canvas, Offset(p.$1 - tp.width / 2, p.$2 - tp.height / 2));
      }
    }
  }

  @override
  bool shouldRepaint(VenueSeatMapPainter old) =>
      old.document != document ||
      old.level != level ||
      old.fit != fit ||
      old.selection != selection ||
      old.hover != hover ||
      old.pxPerUnit != pxPerUnit ||
      old.seatStatusOverrides != seatStatusOverrides;
}
