import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';

/// Golden comparator with a small pixel tolerance: local machines and CI
/// renderers anti-alias slightly differently (~1-2% of pixels on text-heavy
/// goldens), while real layout regressions change far more than 2%.
class TolerantGoldenComparator extends LocalFileComparator {
  TolerantGoldenComparator(super.testFile);

  static const tolerance = 0.02;

  @override
  Future<bool> compare(Uint8List imageBytes, Uri golden) async {
    final result = await GoldenFileComparator.compareLists(
      imageBytes,
      await getGoldenBytes(golden),
    );
    if (result.passed) return true;
    return result.diffPercent < tolerance;
  }
}

Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  final local = goldenFileComparator as LocalFileComparator;
  goldenFileComparator = TolerantGoldenComparator(
    Uri.parse('${local.basedir}flutter_test_config.dart'),
  );
  await testMain();
}
