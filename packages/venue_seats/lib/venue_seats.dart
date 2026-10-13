/// venue_seats — Flutter seat maps driven by the venue-seats JSON format.
///
/// ```dart
/// import 'dart:convert';
/// import 'package:flutter/services.dart' show rootBundle;
/// import 'package:venue_seats/venue_seats.dart';
///
/// final doc = VenueDocument.fromJson(
///     jsonDecode(await rootBundle.loadString('assets/venue.json')));
///
/// VenueSeatMap(
///   document: doc,
///   selection: sel,
///   onSelectionChanged: (s) => setState(() => sel = s),
/// )
/// ```
library;

export 'src/geometry.dart';
export 'src/model.dart';
export 'src/painter.dart';
export 'src/seat_map.dart';
