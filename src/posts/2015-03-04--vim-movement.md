---
date: 2015-03-04
tags:
- Vim
- Tips
title: Vim Movement
---

There are a load of ways to move around in vim.
The first things you learn (`h`, `j`, `k` & `l`) generally aren't that efficient. `w`ord, `e`nd, `t`ill, `/` (buffer search) & `f` (line search) are usually better.

On top of these, there's a handful of other, lesser-known commands:

**z commands** (also used for folding)

`zz`      move current line to middle of screen
`zt`      move current line to top of screen
`zb`      move current line to bottom of screen

**Moving over lines quickly**

`ctrl-e`  move up 1 line
`ctrl-y`  move down 1 line
`ctrl-u`  move up 1/2 page
`ctrl-d`  move down 1/2 page
`ctrl-b`  move up 1 page
`ctrl-f`  move down 1 page
