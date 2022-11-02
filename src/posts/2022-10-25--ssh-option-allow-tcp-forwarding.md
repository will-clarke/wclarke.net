---
date: 2022-10-25
tags: ssh unix
title: SSH mistakes I've made...and how to avoid them!
description: Some basic SSH / port forwarding tips
---

# If you're trying to `ssh` from within a local network:

- check you're using the same internet connection (not 'Guest' wifi).
- check you're not using a VPN

## Check the `AllowTcpForwarding` rules from the `ssh` server

I was trying to get port forwarding to work... but it just wasn't connecting as I'd expect.
I noticed that the `AllowTcpForwarding` rule in `/etc/ssh/sshd_config` defaulted to `no`, which was too restrictive for what I wanted.

## Check any firewalls

You may be blocking the port you're trying to access.
