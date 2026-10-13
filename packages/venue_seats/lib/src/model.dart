/// Data model — a pure-Dart mirror of `@venue-seats/core`.
///
/// Flutter cannot import TypeScript, so the model and the geometry helpers are
/// re-implemented here against the same JSON contract (`schemas/venue-seats.schema.json`).
/// `VenueDocument.validate()` mirrors core's structural checks.
library;

enum SeatStatus { available, selected, sold, held }

SeatStatus _parseStatus(String v) {
  switch (v) {
    case 'available':
      return SeatStatus.available;
    case 'selected':
      return SeatStatus.selected;
    case 'sold':
      return SeatStatus.sold;
    case 'held':
      return SeatStatus.held;
    default:
      return SeatStatus.available;
  }
}

/// One seat. Sold/held seats cannot be selected.
class Seat {
  const Seat({
    required this.id,
    required this.x,
    required this.y,
    required this.status,
    this.label,
    this.priceTierId,
  });

  final String id;
  final String? label;
  final double x;
  final double y;
  final SeatStatus status;
  final String? priceTierId;

  factory Seat.fromJson(Map<String, dynamic> json) => Seat(
        id: json['id'] as String,
        label: json['label'] as String?,
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
        status: _parseStatus(json['status'] as String),
        priceTierId: json['priceTierId'] as String?,
      );
}

class SeatRow {
  const SeatRow({required this.id, required this.seats, this.label});
  final String id;
  final String? label;
  final List<Seat> seats;

  factory SeatRow.fromJson(Map<String, dynamic> json) => SeatRow(
        id: json['id'] as String,
        label: json['label'] as String?,
        seats: (json['seats'] as List<dynamic>?)
            ?.whereType<Map<String, dynamic>>()
            .map(Seat.fromJson)
            .toList() ??
            const [],
      );
}

class Section {
  const Section({
    required this.id,
    required this.polygon,
    required this.rows,
    this.name,
    this.priceTierId,
  });

  final String id;
  final String? name;

  /// Polygon outline in venue coordinates (>= 3 points).
  final List<List<double>> polygon;
  final String? priceTierId;
  final List<SeatRow> rows;

  factory Section.fromJson(Map<String, dynamic> json) => Section(
        id: json['id'] as String,
        name: json['name'] as String?,
        polygon: ((json['polygon'] as List<dynamic>?) ?? const [])
            .whereType<List<dynamic>>()
            .map((p) => [(p[0] as num).toDouble(), (p[1] as num).toDouble()])
            .toList(),
        priceTierId: json['priceTierId'] as String?,
        rows: (json['rows'] as List<dynamic>?)
            ?.whereType<Map<String, dynamic>>()
            .map(SeatRow.fromJson)
            .toList() ??
            const [],
      );
}

class Level {
  const Level({required this.id, required this.sections, this.name});
  final String id;
  final String? name;
  final List<Section> sections;

  factory Level.fromJson(Map<String, dynamic> json) => Level(
        id: json['id'] as String,
        name: json['name'] as String?,
        sections: (json['sections'] as List<dynamic>?)
            ?.whereType<Map<String, dynamic>>()
            .map(Section.fromJson)
            .toList() ??
            const [],
      );
}

class PriceTier {
  const PriceTier({required this.id, required this.color, this.name, this.price});
  final String id;
  final String? name;
  final String color;
  final double? price;

  factory PriceTier.fromJson(Map<String, dynamic> json) => PriceTier(
        id: json['id'] as String,
        name: json['name'] as String?,
        color: json['color'] as String,
        price: (json['price'] as num?)?.toDouble(),
      );
}

class Stage {
  const Stage({required this.x, required this.y, required this.rotation, this.w, this.h});
  final double x;
  final double y;

  /// Degrees clockwise; 0 means the stage faces +y.
  final double rotation;

  /// Optional drawn footprint in venue units.
  final double? w;
  final double? h;

  factory Stage.fromJson(Map<String, dynamic> json) => Stage(
        x: (json['x'] as num).toDouble(),
        y: (json['y'] as num).toDouble(),
        rotation: (json['rotation'] as num).toDouble(),
        w: (json['w'] as num?)?.toDouble(),
        h: (json['h'] as num?)?.toDouble(),
      );
}

class Venue {
  const Venue({required this.id, this.name, this.city, this.address, this.lat, this.lng});
  final String id;
  final String? name;
  final String? city;
  final String? address;
  final double? lat;
  final double? lng;

  factory Venue.fromJson(Map<String, dynamic> json) => Venue(
        id: json['id'] as String,
        name: json['name'] as String?,
        city: json['city'] as String?,
        address: json['address'] as String?,
        lat: (json['lat'] as num?)?.toDouble(),
        lng: (json['lng'] as num?)?.toDouble(),
      );
}

/// `provenance == 'demo'` means the layout was rebuilt from public information
/// and is illustrative (示意); it is not verified against the real venue.
class VenueDocument {
  const VenueDocument({
    required this.schemaVersion,
    required this.venue,
    required this.priceTiers,
    required this.levels,
    this.stage,
    this.provenance,
  });

  final String schemaVersion;
  final Venue venue;
  final Stage? stage;
  final String? provenance;
  final List<PriceTier> priceTiers;
  final List<Level> levels;

  factory VenueDocument.fromJson(Map<String, dynamic> json) => VenueDocument(
        schemaVersion: json['schemaVersion'] as String,
        venue: Venue.fromJson(json['venue'] as Map<String, dynamic>),
        stage: json['stage'] == null ? null : Stage.fromJson(json['stage'] as Map<String, dynamic>),
        provenance: json['provenance'] as String?,
        priceTiers: (json['priceTiers'] as List<dynamic>)
            .whereType<Map<String, dynamic>>()
            .map(PriceTier.fromJson)
            .toList(),
        levels: (json['levels'] as List<dynamic>)
            .whereType<Map<String, dynamic>>()
            .map(Level.fromJson)
            .toList(),
      );

  /// Structural validation mirroring `@venue-seats/core`'s `validate()`.
  List<String> validate() {
    final errors = <String>[];
    if (schemaVersion.isEmpty) errors.add('schemaVersion is required');
    if (venue.id.isEmpty) errors.add('venue.id is required');
    final tierIds = priceTiers.map((t) => t.id).toSet();
    if (priceTiers.isEmpty) errors.add('priceTiers must be a non-empty array');
    if (levels.isEmpty) {
      errors.add('levels must be a non-empty array');
      return errors;
    }
    for (final level in levels) {
      if (level.id.isEmpty) errors.add('level.id is required');
      for (final sec in level.sections) {
        if (sec.id.isEmpty) errors.add('section in level ${level.id} is missing id');
        if (sec.polygon.length < 3) errors.add('section ${sec.id} polygon needs at least 3 points');
        if (sec.priceTierId != null && !tierIds.contains(sec.priceTierId)) {
          errors.add('section ${sec.id} references unknown priceTierId "${sec.priceTierId}"');
        }
        for (final row in sec.rows) {
          for (final seat in row.seats) {
            if (seat.id.isEmpty) errors.add('seat in row ${row.id} of section ${sec.id} is missing id');
            if (seat.priceTierId != null && !tierIds.contains(seat.priceTierId)) {
              errors.add('seat ${seat.id} references unknown priceTierId "${seat.priceTierId}"');
            }
          }
        }
      }
    }
    return errors;
  }
}
