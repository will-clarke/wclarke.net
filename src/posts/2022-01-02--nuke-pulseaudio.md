---
title: Pulseaudio playing up? Try deleting `~/.config/pulse`
date: 2022-01-02
tags: linux desktop audio
description: Pulseaudio is an amazing piece of software that sits in between the linux driver and applications. It stopped working for me... but an easy fix was to delete its config directory.
---

This is the solution to most tech problems. If it doesn't work, turn it off and on.
In this case, turning it *off* involved uninstalling / removing some dodgy configuration.

```sh
rm -r ~/.config/pulse
```
