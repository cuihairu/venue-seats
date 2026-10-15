# @venue-seats/venues-demo

Five demo venue documents (`venues/*.json`) for trying the seat maps without
your own data — a national stadium, Shanghai stadium, Mercedes-Benz arena,
Cadillac arena and Shenzhen Bay. They double as the fixtures the tests parse, so
the JSON contract stays exercised.

Part of the [venue-seats](https://github.com/cuihairu/venue-seats) monorepo.
Source-available; not yet published to npm — see the repository for status.

## Usage

```ts
import { DEMO_DISCLAIMER, DEMO_VENUES } from "@venue-seats/venues-demo";

const doc = DEMO_VENUES[0]; // a VenueDocument, schemaVersion "1"
```

## 示意数据 / illustrative data

`DEMO_VENUES` is labelled `provenance: "demo"`: rebuilt from public layout
information (capacity, tiering, bowl shape) and heavily simplified. It is **not**
guaranteed to match the real venues, and no official seat chart is bundled,
scraped or copied. Regenerate with
`pnpm --filter @venue-seats/venues-demo gen`.
