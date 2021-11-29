---
date: "2015-03-14"
published: true
tags:
  - Vim
title: Vim Text Objects
---

One of the most powerful features in Vim is **text objects**. These increase the number of 'vim nouns' that you can use with 'vim verbs'.

Imagine your cursor is in the middle of a paragraph you want to delete. Instead of laboriously deleting single lines, you could just type `dip` for ' delete inner paragraph'. The text object represents _the entire paragraph_.

A list of these is:

`iw` inner word
`it` inner xml / html tag
`is` inner sentence
`i'` inner single quotation marks
`i"` inner double quotation marks
`i{` inner `{ ... }` braces
`i[` inner `[ ... ]` braces
`i(` inner `( ... )` braces
`ip` inner paragraph
`im` inner ruby method (from the [vim-textobj-rubyblock plugin](https://github.com/nelstrom/vim-textobj-rubyblock))

The same commands also work with `a` for **a** (eg. `ca(` will also _change a bracket_, rather than just the contents of them)

For an in-depth explanation, type `:h text-objects` into vim.
