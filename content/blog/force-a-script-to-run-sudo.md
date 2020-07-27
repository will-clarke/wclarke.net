+++
title = "Force a script to run as root (sudo)"
author = ["Will Clarke"]
date = 2020-07-16
lastmod = 2020-07-27T16:43:26+01:00
tags = ["unix", "bash"]
draft = false
weight = 2001
[menu.nil]
  weight = 2001
  identifier = "force-a-script-to-run-as-root--sudo"
+++

Just chuck this in at the start of a bash script and it'll ensure the rest of the script is run by the root user:

```sh
#!/usr/bin/env sh
[ `whoami` = root ] || { sudo "$0" "$@"; exit $?; }
```
