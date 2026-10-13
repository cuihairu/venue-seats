# Quick start

The packages live in this pnpm workspace and are not published to npm/pub yet —
clone the repo and install from source:

```bash
git clone https://github.com/cuihairu/venue-seats.git
cd venue-seats
pnpm install
```

Demo venue JSON files are in `packages/venues-demo/venues/` (all marked
`"provenance": "demo"` — rebuilt from public layout info, not official seat
charts). The machine-readable contract is
[`schemas/venue-seats.schema.json`](https://github.com/cuihairu/venue-seats/blob/main/schemas/venue-seats.schema.json).

## React

```tsx
import { useState } from "react";
import { SeatMap } from "@venue-seats/react";
import type { RowSelection, VenueDocument } from "@venue-seats/core";

const doc: VenueDocument = await (await fetch("/venues/demo-national-stadium.json")).json();
const [selection, setSelection] = useState<RowSelection | null>(null);

<SeatMap
  doc={doc}
  levelId={doc.levels[0].id}
  selection={selection}
  onSelectionChange={setSelection}
  onHoverChange={(h) => console.log(h)}
/>;
```

## Vue 3

```vue
<script setup>
import { ref } from "vue";
import { VenueSeatMap } from "@venue-seats/vue";
import type { RowSelection, VenueDocument } from "@venue-seats/core";

const doc: VenueDocument = await (await fetch("/venues/demo-national-stadium.json")).json();
const selection = ref<RowSelection | null>(null);
</script>

<template>
  <VenueSeatMap
    :doc="doc"
    :level-id="doc.levels[0].id"
    v-model:selection="selection"
    @selection-change="console.log"
  />
</template>
```

## Flutter

```dart
import 'dart:convert';
import 'package:flutter/services.dart' show rootBundle;
import 'package:venue_seats/venue_seats.dart';

final doc = VenueDocument.fromJson(
    jsonDecode(await rootBundle.loadString('assets/venue.json')));

VenueSeatMap(
  document: doc,
  selection: sel,
  onSelectionChanged: (s) => setState(() => sel = s),
)
```

## Run the demo app

```bash
pnpm --filter @venue-seats/demo dev
```

Renders the five demo venues with level tabs, a price-tier legend, section →
row selection, per-seat toggling once zoomed in, a 2D/3D toggle that shares one
selection state, sold-out states, and mobile touch (pan, pinch-zoom,
tap-to-select) with an automatic 2D fallback on narrow viewports.
