import 'dart:convert';
import 'dart:io';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:venue_seats/venue_seats.dart';

Future<VenueDocument> _doc() async {
  final file = File('../venues-demo/venues/demo-mercedes-arena.json');
  return VenueDocument.fromJson(jsonDecode(await file.readAsString()) as Map<String, dynamic>);
}

/// Small deterministic fixture for interaction tests: 2 sections with rows.
const fixtureJson = '''
{
  "schemaVersion": "1",
  "venue": {"id": "fx", "name": "测试场馆"},
  "provenance": "demo",
  "stage": {"x": 150, "y": 250, "rotation": 180, "w": 120, "h": 30},
  "priceTiers": [
    {"id": "t1", "name": "内场", "color": "#ff4d6d", "price": 1280},
    {"id": "t2", "name": "看台", "color": "#4d8dff", "price": 680}
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
            {"id": "s1-r1", "label": "1排", "seats": [
              {"id": "a1", "label": "1", "x": 40, "y": 35, "status": "available"},
              {"id": "a2", "label": "2", "x": 60, "y": 35, "status": "sold"},
              {"id": "a3", "label": "3", "x": 80, "y": 35, "status": "available"}
            ]},
            {"id": "s1-r2", "label": "2排", "seats": [
              {"id": "b1", "label": "1", "x": 40, "y": 65, "status": "available"},
              {"id": "b2", "label": "2", "x": 60, "y": 65, "status": "available"}
            ]}
          ]
        },
        {
          "id": "s2", "name": "B 区", "priceTierId": "t2",
          "polygon": [[20, 120], [180, 120], [180, 180], [20, 180]],
          "rows": [
            {"id": "s2-r1", "label": "1排", "seats": [
              {"id": "c1", "label": "1", "x": 60, "y": 150, "status": "available"},
              {"id": "c2", "label": "2", "x": 80, "y": 150, "status": "held"}
            ]}
          ]
        }
      ]
    }
  ]
}
''';

Widget _host(Widget child) => MaterialApp(
      home: Scaffold(
        body: SizedBox(width: 400, height: 300, child: child),
      ),
    );

void main() {
  testWidgets('selects a section, then a row; tap outside clears', (tester) async {
    final doc = VenueDocument.fromJson(jsonDecode(fixtureJson) as Map<String, dynamic>);
    SeatSelection? sel;
    final rows = <SeatRow>[];
    final sections = <Section>[];

    await tester.pumpWidget(_host(VenueSeatMap(
      document: doc,
      selection: sel,
      onSelectionChanged: (s) => sel = s,
      onRowActivated: rows.add,
      onSectionActivated: sections.add,
    )));
    await tester.pumpAndSettle();

    // venue coordinate of a point inside A 区 row 2, mapped through the fit:
    // content bounds: x 20..180 (stage 90..210 x?) — compute via ViewFit on the
    // same math the widget uses.
    final bounds = levelDisplayBounds(doc.levels.first, doc.stage);
    final fit = ViewFit.bounds(bounds, 400, 300);
    Future<void> tapVenue(double x, double y) async {
      final (px, py) = fit.venueToPx(x, y);
      await tester.tapAt(Offset(px, py));
      await tester.pumpAndSettle();
    }

    await tapVenue(100, 40); // A 区, near row 1 → selects section first
    expect(sel?.sectionId, 's1');
    expect(sel?.rowId, isNull);
    expect(sections, hasLength(1));

    await tapVenue(50, 65); // row 2 seat area → selects row
    expect(sel, const SeatSelection('s1', 's1-r2'));
    expect(rows, hasLength(1));

    await tapVenue(50, 65); // same row again → back to section-level
    expect(sel, const SeatSelection('s1'));
    expect(rows, hasLength(1));

    await tapVenue(10, 200); // inside the map, outside any section → clears
    expect(sel, isNull);
  });

  testWidgets('hover callback fires with the hovered section', (tester) async {
    final doc = VenueDocument.fromJson(jsonDecode(fixtureJson) as Map<String, dynamic>);
    SeatMapHover? hover;
    await tester.pumpWidget(_host(VenueSeatMap(
      document: doc,
      onHoverChanged: (h) => hover = h,
    )));
    await tester.pumpAndSettle();
    final bounds = levelDisplayBounds(doc.levels.first, doc.stage);
    final fit = ViewFit.bounds(bounds, 400, 300);
    final gesture = await tester.createGesture(kind: PointerDeviceKind.mouse);
    await gesture.addPointer(location: Offset.zero);
    addTearDown(gesture.removePointer);
    final (px, py) = fit.venueToPx(100, 40);
    await gesture.moveTo(Offset(px, py)); // hover events fire on moves
    await tester.pump();
    expect(hover?.section.id, 's1');
  });

  test('sold-out section inventory is zero', () async {
    final doc = await _doc();
    final backstage = doc.levels
        .expand((l) => l.sections)
        .where((s) => s.priceTierId == 'backstage')
        .toList();
    expect(backstage, isNotEmpty);
    for (final s in backstage) {
      expect(sectionAvailability(s).available, 0, reason: '${s.id} should be fully sold');
    }
  });

  testWidgets('golden: fixture level renders sections, seats and stage', (tester) async {
    final doc = VenueDocument.fromJson(jsonDecode(fixtureJson) as Map<String, dynamic>);
    await tester.binding.setSurfaceSize(const Size(400, 300));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(_host(VenueSeatMap(
      document: doc,
      selection: const SeatSelection('s1', 's1-r2'),
    )));
    await tester.pumpAndSettle();
    await expectLater(
      find.byType(VenueSeatMap),
      matchesGoldenFile('goldens/seat_map_fixture.png'),
    );
  });
}
