---
title: jq is a cool tool
date: 2018-06-08
tags: bash unix
description: jq lets you effortlessly transform JSON on the fly. It's well worth getting used to it & there are some powerful things you can do with it, like mapping... it's not just about filtering.
---

[`jq`](https://stedolan.github.io/jq/) is pretty cool.
It's a command-line utility that interacts with `JSON`.

I only recently discovered that it does **loads** more than just pretty-printing `JSON`.

You can `map` over it and do really quite complex data processing with `jq`.

I recently had to extract some data from an API and ended up piping into this:

```bash
jq '.Chart.Purchases | map((. | first | tostring) + ", " + (. | last  | tostring) )'
```

It's really flexible and nice to use!

I'd recommend people have a quick browse through the [jq examples and tutorial](https://stedolan.github.io/jq/tutorial/) just so they know the full extent of what `jq` can do.