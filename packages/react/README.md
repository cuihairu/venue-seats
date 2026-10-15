# @venue-seats/react

React wrapper around the framework-agnostic `@venue-seats/renderer` engine, so
behaviour (zoom, hover, hit-testing, a11y) is identical to the Vue package.

Part of the [venue-seats](https://github.com/cuihairu/venue-seats) monorepo.
Source-available; not yet published to npm — see the repository for status.

## Usage

```tsx
import { useRef } from "react";
import { SeatMap, type SeatMapHandle } from "@venue-seats/react";

const map = useRef<SeatMapHandle>(null);

<SeatMap
  ref={map}
  doc={doc}
  levelId={levelId}
  selection={selection}
  onSelectionChange={setSelection}
  onSeatToggle={(seat) => console.log(seat.id, seat.status)}
/>;

// imperative: map.current?.zoomIn() | zoomOut() | reset() | fit() | controller()
```

`selection` is controlled: render the new value from `onSelectionChange`.
`seatVisibleAt` and `seatRadius` tune when seats are drawn and how big their hit
radius is. See `docs/api.md` for the full prop list.
