---
title: A Quick Introduction to IP Addresses
description: Networking can be complex. The Internet Protocol is a foundational layer of how the internet works. It's worth vaguely understanding what's going on.
date: 2014-09-02
tags: networking dns ip
---

IP (Internet Protocol) addresses are ways of identifying unique internet-accessible devices. They are also 'addresses' in the sense of showing its location (think of postal addresses).

### Background

When you type a web page into the computer, what you're really asking is for some information from a different device (usually a big server somewhere in the world). There are several complex stages to finding this, but one of the key components is having an identifying 'marker' on each device; so you know which address to get the information from, and also so the information knows how to get back to you.

### IPv4

Recently, we've been running out of traditional (IPv4) IP addresses: using 4 different 32 bit numbers (eg. 93.184.216.119), giving us access to 4,294,967,296 possible unique addresses (2<sup>32</sup>)).

### IPv6

IPv6 uses 2<sup>128</sup> numbers, which is quite a bit bigger (_340,282,366,920,938,463,463,374,607,431,768,211,456_). An example of one of these is: 2001:db8:0:1234:0:567:8:1. **To put that in perspective, 2<sup>128</sup> E. coli bacteria (which are pretty small) would be around 26 times heavier than Earth (which is pretty big).**

Take home point is we're not going to be running out of IP Addresses soon.
