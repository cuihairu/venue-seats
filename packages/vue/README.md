# @venue-seats/vue

Vue 3 wrapper around the framework-agnostic `@venue-seats/renderer` engine, with
the same API semantics as the React package.

Part of the [venue-seats](https://github.com/cuihairu/venue-seats) monorepo.
Source-available; not yet published to npm — see the repository for status.

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { VenueSeatMap } from "@venue-seats/vue";

const selection = ref(null);
</script>

<template>
  <VenueSeatMap
    :doc="doc"
    :level-id="levelId"
    v-model:selection="selection"
    @seat-toggle="(seat) => console.log(seat.id, seat.status)"
  />
</template>
```

`v-model:selection` works (prop `selection` + event `selectionChange`). Template
ref expose: `zoomIn()`, `zoomOut()`, `reset()`, `fit()`, `controller()`. See
`docs/api.md` for the full prop and event list.
