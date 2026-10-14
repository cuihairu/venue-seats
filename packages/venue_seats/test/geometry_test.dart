import 'package:flutter_test/flutter_test.dart';
import 'package:venue_seats/venue_seats.dart';

VenueDocument _doc({List<PriceTier> tiers = const []}) => VenueDocument(
      schemaVersion: '1',
      venue: const Venue(id: 'v'),
      priceTiers: tiers,
      levels: const [],
    );

Seat _seat(String id, double x, double y, {SeatStatus status = SeatStatus.available}) =>
    Seat(id: id, x: x, y: y, status: status);

/// A 0,0 -> 100,100 square so hit tests have a predictable home.
List<List<double>> get _square => const [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100],
    ];

Section _section({String id = 's1', String? tier, List<SeatRow> rows = const []}) =>
    Section(id: id, polygon: _square, priceTierId: tier, rows: rows);

void main() {
  group('boundsOf', () {
    test('returns null for no points', () {
      expect(boundsOf(const []), isNull);
    });

    test('a single point has zero size', () {
      final b = boundsOf(const [
        [10, 20]
      ])!;
      expect(b.width, 0);
      expect(b.height, 0);
      expect(b.centerX, 10);
      expect(b.centerY, 20);
    });

    test('spans every point regardless of order', () {
      final b = boundsOf(const [
        [5, 5],
        [-10, 30],
        [40, -2],
      ])!;
      expect(b.minX, -10);
      expect(b.minY, -2);
      expect(b.maxX, 40);
      expect(b.maxY, 30);
      expect(b.width, 50);
      expect(b.height, 32);
    });
  });

  group('levelBounds', () {
    test('an empty level falls back to a 100x100 box', () {
      final b = levelBounds(const Level(id: 'l1', sections: []));
      expect(b.width, 100);
      expect(b.height, 100);
    });

    test('includes seat positions beyond the polygon', () {
      final sec = _section(rows: [
        SeatRow(id: 'r1', seats: [
          _seat('a1', 2, 2),
          _seat('a2', 120, 130),
        ]),
      ]);
      final b = levelBounds(Level(id: 'l1', sections: [sec]));
      expect(b.maxX, 120);
      expect(b.maxY, 130);
    });

    test('sectionPoints merges the polygon with every seat', () {
      final sec = _section(rows: [
        SeatRow(id: 'r1', seats: [_seat('a1', 200, 300)]),
      ]);
      expect(sectionPoints(sec), [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
        [200, 300],
      ]);
    });
  });

  group('levelDisplayBounds', () {
    final level = Level(id: 'l1', sections: [_section()]);

    test('grows to cover the stage footprint', () {
      final b = levelDisplayBounds(level, const Stage(x: 50, y: 150, rotation: 0, w: 20, h: 20));
      expect(b.maxY, 160);
      expect(b.width, 100);
    });

    test('a stage with no size defaults to 240x48', () {
      final b = levelDisplayBounds(level, const Stage(x: 50, y: 150, rotation: 0));
      expect(b.maxY, 150 + 24);
      expect(b.minX, 50 - 120);
    });

    test('a document without a stage returns the level bounds', () {
      expect(levelDisplayBounds(level, null).maxY, 100);
    });
  });

  group('rowAt', () {
    final section = _section(rows: [
      const SeatRow(id: 'empty', seats: []), // must be skipped, not divide by zero
      SeatRow(id: 'r1', seats: [
        _seat('a1', 10, 10),
        _seat('a2', 20, 10),
      ]),
    ]);

    test('skips rows that have no seats', () {
      expect(rowAt(section, 15, 10)?.id, 'r1');
      expect(rowAt(section, 999, 999), isNull);
    });

    test('honours a custom max distance', () {
      expect(rowAt(section, 15, 12)?.id, 'r1'); // 2 units from the centroid
      expect(rowAt(section, 15, 12, maxDistance: 1), isNull);
    });
  });

  group('seatAt', () {
    final section = _section(rows: [
      SeatRow(id: 'r1', seats: [_seat('a1', 10, 10), _seat('a2', 40, 10)]),
    ]);

    test('finds the nearest seat inside the hit radius', () {
      expect(seatAt(section, 10.5, 10)?.id, 'a1');
      expect(seatAt(section, 100, 100), isNull);
    });

    test('the widget can widen or narrow the radius', () {
      expect(seatAt(section, 16, 10, hitRadius: 8)?.id, 'a1');
      expect(seatAt(section, 16, 10, hitRadius: 1), isNull);
    });
  });

  group('availability', () {
    final section = _section(rows: [
      SeatRow(id: 'r1', seats: [
        _seat('a1', 0, 0),
        _seat('a2', 0, 0, status: SeatStatus.selected),
        _seat('a3', 0, 0, status: SeatStatus.sold),
      ]),
      SeatRow(id: 'r2', seats: [_seat('b1', 0, 0, status: SeatStatus.held)]),
    ]);

    test('selected seats still count as available', () {
      final a = rowAvailability(section.rows.first);
      expect(a.total, 3);
      expect(a.available, 2);
    });

    test('a section sums its rows', () {
      final a = sectionAvailability(section);
      expect(a.total, 4);
      expect(a.available, 2);
    });

    test('a section with no rows is empty, not null', () {
      final a = sectionAvailability(_section());
      expect(a.total, 0);
      expect(a.available, 0);
    });
  });

  group('price tiers', () {
    final doc = _doc(tiers: const [
      PriceTier(id: 't1', color: '#ff0000', name: '内场'),
    ]);

    test('priceTierOf finds a tier and returns null for a miss', () {
      expect(priceTierOf(doc, 't1')?.name, '内场');
      expect(priceTierOf(doc, 'nope'), isNull);
      expect(priceTierOf(doc, null), isNull);
    });

    test('a section without a known tier gets the neutral colour', () {
      expect(sectionColor(doc, _section(tier: 't1')), '#ff0000');
      expect(sectionColor(doc, _section(tier: 'nope')), '#64748b');
      expect(sectionColor(doc, _section()), '#64748b');
    });
  });

  group('ViewFit', () {
    test('round trips venue coordinates through pixels', () {
      final fit = ViewFit.bounds(const VenueBounds(minX: 0, minY: 0, maxX: 100, maxY: 100), 400, 400);
      final (px, py) = fit.venueToPx(25, 75);
      final (vx, vy) = fit.pxToVenue(px, py);
      expect(vx, closeTo(25, 0.0001));
      expect(vy, closeTo(75, 0.0001));
    });

    test('centres the content inside the viewport', () {
      final fit = ViewFit.bounds(const VenueBounds(minX: 0, minY: 0, maxX: 100, maxY: 100), 400, 400);
      final (px, py) = fit.venueToPx(50, 50);
      expect(px, closeTo(200, 0.5));
      expect(py, closeTo(200, 0.5));
    });

    test('fits bounds that do not start at the origin', () {
      // venue coordinates 90..110 must land inside the viewport, centred and
      // with the padding as margin — not run off the right-hand edge.
      final fit = ViewFit.bounds(const VenueBounds(minX: 90, minY: 90, maxX: 110, maxY: 110), 400, 400);
      final (left, _) = fit.venueToPx(90, 90);
      final (right, _) = fit.venueToPx(110, 110);
      expect(left, greaterThan(0));
      expect(right, lessThan(400));
      expect((left + right) / 2, closeTo(200, 0.5));
    });

    test('two fits of the same box compare equal and hash alike', () {
      const bounds = VenueBounds(minX: 0, minY: 0, maxX: 100, maxY: 100);
      final a = ViewFit.bounds(bounds, 400, 400);
      final b = ViewFit.bounds(bounds, 400, 400);
      expect(a, b);
      expect(a.hashCode, b.hashCode);
      // a different viewport is a different fit, and so is a non-ViewFit
      expect(a == ViewFit.bounds(bounds, 400, 200), isFalse);
      const Object notAFit = 'not a fit';
      expect(a == notAFit, isFalse);
    });
  });

  group('VenueBounds', () {
    test('empty() is the zero box', () {
      final b = VenueBounds.empty();
      expect(b.minX, 0);
      expect(b.minY, 0);
      expect(b.maxX, 0);
      expect(b.maxY, 0);
      expect(b.width, 0);
      expect(b.height, 0);
      expect(b.centerX, 0);
      expect(b.centerY, 0);
    });
  });
}