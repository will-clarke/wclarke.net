---
date: 2015-03-10
tags: - vim - tips
title: 'Vim: Ctrl-R in Insert Mode'
description: Ctrl-R inserts text based on your current vim context. Eg. filename, last command, last search, etc...
---

`ctrl-r` in **Insert Mode** is pretty useful.

It inserts text based on your current vim context.

Many of these commands work with registers, so it may be worth getting your head round those....

| Ctrl-R Shortcut        | What it does                    |
| ---------------------- | ------------------------------- |
| `ctrl-r %`             | inserts filename                |
| `ctrl-r :`             | inserts last command            |
| `ctrl-r /`             | inserts last search             |
| `ctrl-r =`             | inserts evaluated sum (eg. 2+3) |
| `ctrl-r [a-z 0-9 key]` | inserts text from register      |

Hope they help!