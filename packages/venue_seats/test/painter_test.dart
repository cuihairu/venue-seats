import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:venue_seats/venue_seats.dart';

/// Short (#rgb) tier colours, a seat-level price tier that overrides its
/// section, all four seat states and a stage with no drawn footprint — the
/// painter branches the main golden never reaches.
const painterJson = '''
{
  "schemaVersion": "1",
  "venue": {"id": "fx2", "name": "短色票档"},
  "provenance": "demo",
  "stage": {"x": 100, "y": 210, "rotation": 0},
  "priceTiers": [
    {"id": "t1", "name": "内场", "color": "#f0a"},
    {"id": "t2", "name": "看台", "color": "#48c"}
  ],
  "levels": [
    {
      "id": "l1",
      "name": "下层",
      "sections": [
        {
          "id": "s1", "name": "A 区", "priceTierId": "t1",
          "polygon": [[20, 20], [180, 20], [180, 80], [20, 80]],
          "rows": [
            {"id": "s1-r1", "seats": [
              {"id": "a1", "x": 40, "y": 35, "status": "available"},
              {"id": "a2", "x": 60, "y": 35, "status": "sold"},
              {"id": "a3", "x": 80, "y": 35, "status": "held"},
              {"id": "a4", "x": 100, "y": 35, "status": "selected"}
            ]}
          ]
        },
        {
          "id": "s2", "name": "B 区", "priceTierId": "t2",
          "polygon": [[20, 120], [180, 120], [180, 180], [20, 180]],
          "rows": [
            {"id": "s2-r1", "seats": [
              {"id": "c1", "x": 60, "y": 150, "status": "available", "priceTierId": "t1"}
            ]}
          ]
        }
      ]
    }
  ]
}
''';

VenueDocument _painterDoc() =>
    VenueDocument.fromJson(jsonDecode(painterJson) as Map<String, dynamic>);

VenueSeatMapPainter _painter(
  VenueDocument doc, {
  SeatSelection? selection,
  SeatMapHover? hover,
  double? pxPerUnit,
  Map<String, SeatStatus>? overrides,
}) =>
    VenueSeatMapPainter(
      document: doc,
      level: doc.levels.first,
      fit: ViewFit.bounds(levelDisplayBounds(doc.levels.first, doc.stage), 400, 300),
      selection: selection,
      hover: hover,
      pxPerUnit: pxPerUnit,
      seatStatusOverrides: overrides,
    );

void main() {
  final doc = _painterDoc();
  final section = doc.levels.first.sections.first;

  group('seatsVisible', () {
    test('follows the fit scale below and above the zoom threshold', () {
      final small = VenueSeatMapPainter(
        document: doc,
        level: doc.levels.first,
        fit: const ViewFit(pxPerUnit: 0.5, dx: 0, dy: 0),
        selection: null,
      );
      expect(small.seatsVisible, isFalse);

      final big = VenueSeatMapPainter(
        document: doc,
        level: doc.levels.first,
        fit: const ViewFit(pxPerUnit: 0.9, dx: 0, dy: 0),
        selection: null,
      );
      expect(big.seatsVisible, isTrue);
    });

    test('an explicit pxPerUnit wins over the fit scale', () {
      final painter = _painter(doc, pxPerUnit: 0.1);
      expect(painter.seatsVisible, isFalse);
      expect(_painter(doc, pxPerUnit: 1.2).seatsVisible, isTrue);
    });
  });

  group('seatStatusOf', () {
    test('an override wins over the document status', () {
      final seat = section.rows.first.seats.first; // a1, available
      expect(_painter(doc).seatStatusOf(seat), SeatStatus.available);
      expect(_painter(doc, overrides: {'a1': SeatStatus.sold}).seatStatusOf(seat), SeatStatus.sold);
    });

    test('seats outside the override map keep their status', () {
      final painter = _painter(doc, overrides: {'zz': SeatStatus.sold});
      expect(painter.seatStatusOf(section.rows.first.seats.first), SeatStatus.available);
    });
  });

  group('shouldRepaint', () {
    test('false when nothing observable changed', () {
      final a = _painter(doc);
      final b = _painter(doc);
      expect(a.shouldRepaint(b), isFalse);
    });

    test('true when selection, hover, overrides, zoom or level change', () {
      final base = _painter(doc);
      expect(base.shouldRepaint(_painter(doc, selection: const SeatSelection('s1'))), isTrue);
      expect(
        base.shouldRepaint(_painter(doc, hover: SeatMapHover.section(section: section))),
        isTrue,
      );
      expect(
        base.shouldRepaint(_painter(doc, overrides: {'a1': SeatStatus.sold})),
        isTrue,
      );
      expect(base.shouldRepaint(_painter(doc, pxPerUnit: 2)), isTrue);
      expect(
        base.shouldRepaint(VenueSeatMapPainter(
          document: doc,
          level: Level(id: 'l1', sections: doc.levels.first.sections),
          fit: ViewFit.bounds(levelDisplayBounds(doc.levels.first, doc.stage), 400, 300),
          selection: null,
        )),
        isTrue,
      );
    });

    test('true when the document itself is swapped', () {
      expect(_painter(doc).shouldRepaint(_painter(_painterDoc())), isTrue);
    });
  });

  testWidgets('golden: short colours, seat tier, seat states and a sizeless stage', (tester) async {
    await tester.binding.setSurfaceSize(const Size(400, 300));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SizedBox(
          width: 400,
          height: 300,
          child: VenueSeatMap(document: doc, selection: const SeatSelection('s2', 's2-r1')),
        ),
      ),
    ));
    await tester.pumpAndSettle();
    await expectLater(
      find.byType(VenueSeatMap),
      matchesGoldenFile('goldens/seat_map_tiers.png'),
    );
  });
}