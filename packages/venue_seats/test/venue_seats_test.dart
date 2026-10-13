import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:venue_seats/venue_seats.dart';

/// Loads a generated demo venue from the venues-demo package. This asserts
/// the Dart parser consumes exactly the same JSON as the web packages.
Future<VenueDocument> loadDemoVenue(String name) async {
  final file = File('../venues-demo/venues/$name.json');
  final json = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
  return VenueDocument.fromJson(json);
}

void main() {
  group('model parsing', () {
    test('parses the Mercedes-Benz demo venue and validates cleanly', () async {
      final doc = await loadDemoVenue('demo-mercedes-arena');
      expect(doc.schemaVersion, '1');
      expect(doc.provenance, 'demo');
      expect(doc.stage, isNotNull);
      expect(doc.levels, hasLength(3));
      expect(validate_([doc]), isEmpty);
      var seats = 0;
      for (final l in doc.levels) {
        for (final s in l.sections) {
          for (final r in s.rows) {
            seats += r.seats.length;
          }
        }
      }
      expect(seats, greaterThan(3000));
    });

    test('status parsing maps all four states', () async {
      final doc = await loadDemoVenue('demo-national-stadium');
      final statuses = <SeatStatus>{};
      for (final l in doc.levels) {
        for (final s in l.sections) {
          for (final r in s.rows) {
            for (final seat in r.seats) {
              statuses.add(seat.status);
            }
          }
        }
      }
      expect(statuses.contains(SeatStatus.available), isTrue);
      expect(statuses.contains(SeatStatus.sold), isTrue);
    });

    test('validation reports broken documents', () {
      const doc = VenueDocument(
        schemaVersion: '1',
        venue: Venue(id: ''),
        priceTiers: [],
        levels: [],
      );
      final errors = doc.validate();
      expect(errors, isNotEmpty);
    });
  });

  group('geometry', () {
    test('levelDisplayBounds contains stage and content', () async {
      final doc = await loadDemoVenue('demo-shenzhen-bay');
      final level = doc.levels.first;
      final b = levelDisplayBounds(level, doc.stage);
      expect(b.width, greaterThan(0));
      expect(b.height, greaterThan(0));
      final lb = levelBounds(level);
      expect(b.width, greaterThanOrEqualTo(lb.width));
    });

    test('pointInPolygon and sectionAt agree on the fixture', () async {
      final doc = await loadDemoVenue('demo-mercedes-arena');
      final level = doc.levels.firstWhere((l) => l.name == '内场');
      final sec = level.sections.first;
      final c = polygonCentroid(sec.polygon);
      expect(pointInPolygon(c.$1, c.$2, sec.polygon), isTrue);
      expect(sectionAt(level, c.$1, c.$2)?.id, sec.id);
    });

    test('rowAt finds the nearest row', () async {
      final doc = await loadDemoVenue('demo-mercedes-arena');
      final level = doc.levels.first;
      final sec = level.sections.firstWhere((s) => s.rows.isNotEmpty);
      final row = sec.rows.first;
      var sx = 0.0, sy = 0.0;
      for (final s in row.seats) {
        sx += s.x;
        sy += s.y;
      }
      final cx = sx / row.seats.length, cy = sy / row.seats.length;
      expect(rowAt(sec, cx, cy)?.id, row.id);
      expect(rowAt(sec, cx + 9999, cy + 9999), isNull);
    });
  });
}

List<String> validate_(List<VenueDocument> docs) => docs.expand((d) => d.validate()).toList();
