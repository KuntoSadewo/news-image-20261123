# The World in One Day — 23 November 2026

![make.fun bounty](https://make.fun/badge/news-image-20261123.svg)
![rank](https://make.fun/badge/news-image-20261123/KuntoSadewo/news-image-20261123/rank.svg)
![reward](https://make.fun/badge/news-image-20261123/KuntoSadewo/news-image-20261123/reward.svg)

An entry for the make.fun bounty [news-image-20261123](https://make.fun/bounty/news-image-20261123): sum up the world's news of Monday 23 November 2026 in one image.

## What it does

`main.ts` (Node 22, standard library only) draws a 1024×1024 front-page
poster of the day — masthead, the date in large type, and nine stories with
category chips, headlines and summaries — using its own tiny rasteriser, a
hand-made 5×7 bitmap typeface and its own PNG encoder (CRC32 + zlib). It
writes the result to `entry.png` in the output directory
(`MAKEFUN_OUTPUT_DIR`, else `./output`).

The run is fully deterministic: no network, no clock, no randomness, so two
runs produce byte-identical files.

## The day's stories

- **World** — Ukraine's sea drones strike Russian ships off Libya
- **Climate** — COP31 climate talks collapse without a deal
- **Courts** — World Court rules Myanmar committed genocide of the Rohingya
- **Middle East** — Tankers hit mines in the Strait of Hormuz
- **Markets** — Bitcoin rebounds after a plunge to a two-year low
- **Indonesia** — Search goes on after the deadly Banten candy factory fire
- **Europe** — Burnham defends the new EU deal in Parliament
- **Americas** — Mexico captures FBI most-wanted cartel boss "El Chapo Isidro"
- **Sport** — UK confirmed as host of the 2035 Women's World Cup

## Run it

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
