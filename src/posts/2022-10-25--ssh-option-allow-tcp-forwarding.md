---
date: 2022-10-25
tags: ssh unix
title: Some basic SSH / port forwarding tips
description: "SSH mistakes I've made...and how to avoid them!"
---

1. If you're trying to `ssh` from within a local network, check you're using the same internet connection.

This has got me before. A local network may not work if you're using a totally different connection. In my case, I was using the 'guest' wifi - which is specifically designed to be isolated.

2. Check the `AllowTcpForwarding` rules from the `ssh` server

I was trying to get port forwarding to work... but it just wasn't connecting as I'd expect.
I noticed that the `AllowTcpForwarding` rule in `/etc/ssh/sshd_config` defaulted to `no`, which was too restrictive for what I wanted.

3. Check any firewalls

You may be blocking the port you're trying to access.
