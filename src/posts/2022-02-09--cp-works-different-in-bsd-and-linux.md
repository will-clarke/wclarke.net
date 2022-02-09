---
title: cp works different in BSD and Linux
date: 2022-02-09
tags: linux bsd shell
description: "cp -R a/ b/" will do different things on each OS.
---

BSD and Linux work differently. That's not much of a surprise. BSD started in 1977 and Linux only started in 1991. There are a lot of historical reasons for this.

What _did_ surprise me recently, though, was something as trivial as

```sh
cp -R a/ b/
```

will behave totally differently on the two systems.

Spoiler Alert: You've got to use `.`s to make them work the same.

```sh
cp -R a/. b/.
```
