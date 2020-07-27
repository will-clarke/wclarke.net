+++
title = "jq is a cool tool"
author = ["Will Clarke"]
date = 2018-06-08
lastmod = 2020-07-27T16:47:30+01:00
tags = ["bash", "unix"]
draft = false
weight = 2012
[menu.nil]
  weight = 2012
  identifier = "jq-is-a-cool-tool"
+++

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
