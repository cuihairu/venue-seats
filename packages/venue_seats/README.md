# venue_seats

Interactive 2D venue seat maps for Flutter, built on `CustomPainter` and
`InteractiveViewer`: zoom and pan, hover, sold-out states, price-tier colouring,
then section (区) and row (排) selection, with per-seat tapping once a section is
chosen.

The widget reads the **same JSON documents** as the `@venue-seats` web packages
(`docs/data-format.md` in the repository), so one venue file drives Flutter, 2D
SVG and 3D three.js without per-platform copies.

## Usage

```dart
final doc = VenueDocument.fromJson(jsonDecode(await file.readAsString()));

VenueSeatMap(
  document: doc,
  levelId: doc.levels.first.id,
  onSelectionChanged: (selection) => print(selection?.sectionId),
  onSeatActivated: (seat) => print(seat.id),
);
```

See the repository for the full API reference, the JSON data format and the
demo venues: <https://github.com/cuihairu/venue-seats>.

Demo venue data (`provenance: demo`) is rebuilt from public layout information
and is illustrative (示意) — it is not guaranteed to match the real venues.

## License

MIT — see `LICENSE`.
