+++
title = "Cron is cool"
author = ["Will Clarke"]
date = 2019-06-08
lastmod = 2020-07-27T16:31:53+01:00
draft = false
weight = 2009
[menu.nil]
  weight = 2009
  identifier = "cron-is-cool"
+++

Cron jobs have a slightly terrifying syntax.
But there are loads of easy online [tools like this one to help.](https://crontab-generator.org/)

It can be really useful to have background jobs doing all sorts of things in the background.

The whole point of computers is to automate stuff... and `cron` is a really easy UNIX-y way of doing this.

Disclaimer: For one-off scripts, cron jobs can be great...but it doesn't scale particularly well. Eg. if you need to syncronise lots of background jobs, it's probably better to look for something else.
