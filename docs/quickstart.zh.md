> [English](quickstart.md) | **中文**

# 快速开始

各个包都位于本 pnpm workspace 中，尚未发布到 npm/pub —— 请克隆仓库并从源码安装：

```bash
git clone https://github.com/cuihairu/venue-seats.git
cd venue-seats
pnpm install
```

演示场馆的 JSON 文件位于 `packages/venues-demo/venues/`（全部标有 `"provenance": "demo"` —— 依据公开布局信息重建，并非官方座位图）。机器可读契约是 [`schemas/venue-seats.schema.json`](https://github.com/cuihairu/venue-seats/blob/main/schemas/venue-seats.schema.json)。

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

## 运行演示应用

```bash
pnpm --filter @venue-seats/demo dev
```

演示应用会渲染五个演示场馆，包含楼层标签页、价格层级图例、区 → 排选择、放大后的逐座切换、共享同一选择状态的 2D/3D 切换开关、售罄状态，以及移动端触控（平移、双指缩放、点按选择），并在窄视口下自动回退为 2D。
