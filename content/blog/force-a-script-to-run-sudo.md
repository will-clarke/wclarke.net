+++
title = "Force a script to run as root (sudo)"
author = ["Will Clarke"]
date = 2019-01-08
lastmod = 2020-07-07T13:57:38+01:00
draft = false
weight = 2011
[menu.nil]
  weight = 2011
  identifier = "force-a-script-to-run-as-root--sudo"
+++

Just chuck this in at the start of a bash script and it'll ensure the rest of the script is run by the root user:

```sh
#!/usr/bin/env sh
[ `whoami` = root ] || { sudo "$0" "$@"; exit $?; }
```
