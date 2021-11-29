---
title: Force a script to run as root (sudo)
date: 2020-07-16
tags: unix bash
---

Just chuck this in at the start of a bash script and it'll ensure the rest of the script is run by the root user:

```sh
#!/usr/bin/env sh
[ `whoami` = root ] || { sudo "$0" "$@"; exit $?; }
```
