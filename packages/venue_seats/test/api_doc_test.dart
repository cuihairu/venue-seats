import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Gate: the Flutter section of docs/api.md must track the package's real
/// public surface (mirrors the api-doc gates in the TS packages).
void main() {
  final repoRoot =
      Directory.current.parent.parent.path; // packages/venue_seats -> repo
  final apiDoc = File('$repoRoot/docs/api.md').readAsStringSync();
  final start = apiDoc.indexOf('## venue_seats (Flutter)');
  final section = start >= 0 ? apiDoc.substring(start) : '';

  /// Top-level public names declared by the four exported source files.
  final sources = [
    for (final f in ['geometry', 'model', 'painter', 'seat_map'])
      File('$repoRoot/packages/venue_seats/lib/src/$f.dart').readAsStringSync()
  ];
  final declared = <String>{
    for (final src in sources)
      ...[
        // classes / enums / typedefs / mixins
        for (final m in RegExp(r'^(?:abstract\s+)?(?:class|enum|mixin|typedef)\s+([A-Z]\w*)', multiLine: true).allMatches(src))
          m.group(1)!,
        // top-level functions: `ReturnType name(` at column 0 (skip `_`-private;
        // return type may be lowercase, e.g. `bool pointInPolygon`)
        for (final m in RegExp(r'^[A-Za-z][\w<>?,\s]*\s+(\w+)\(', multiLine: true).allMatches(src))
          if (!m.group(1)!.startsWith('_')) m.group(1)!,
      ]
  };

  /// Every identifier the section mentions, in spans or fenced blocks.
  /// Fences are lifted out whole so ``` delimiters cannot flip span pairing.
  Set<String> mentioned() {
    final out = <String>{};
    final fence = RegExp(r'^```[a-zA-Z]*\n[\s\S]*?^```$', multiLine: true);
    for (final m in fence.allMatches(section)) {
      out.addAll(_identifiers(m.group(0)!));
    }
    final bare = section.replaceAll(fence, '');
    for (final m in RegExp(r'`([^`\n]+)`').allMatches(bare)) {
      out.addAll(_identifiers(m.group(1)!));
    }
    return out;
  }

  test('documents every public name the package exports', () {
    expect(section, isNotEmpty, reason: 'api.md must keep a Flutter section');
    final missing = declared.difference(mentioned()).toList()..sort();
    expect(missing, isEmpty,
        reason: 'api.md Flutter section must mention every public name');
  });

  test('documents only names that really exist', () {
    final exportsPara =
        RegExp(r'Exports:([\s\S]*?)(?:\n\n|$)').firstMatch(section)?.group(1) ?? '';
    final documented = <String>{
      for (final m in RegExp(r'`([A-Za-z]\w*)`').allMatches(exportsPara)) m.group(1)!
    };
    // fromJson is a named constructor, documented on VenueDocument
    final allowed = {...declared, 'fromJson'};
    final ghosts = documented.difference(allowed).toList()..sort();
    expect(ghosts, isEmpty, reason: 'api.md must not list names that do not exist');
  });
}

Iterable<String> _identifiers(String text) => [
      for (final m in RegExp(r'[A-Za-z_][A-Za-z0-9_]*').allMatches(text)) m.group(0)!,
    ];
