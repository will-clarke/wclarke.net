---
date: 2014-10-22
tags: ruby api 
title: Twitter Apps Authentication - without another mobile number
description: For all the 733T hackers out there who want to make a twitter bot, I've got you covered <3
---

I recently created a new twitter account ([Damn Nature, You Scary](http://twitter.com/damnnaturescary)). I had trouble **registering** a new app as, apparently, each app needs a (unique) mobile number.

The process wouldn't let me change the permissions of the new app to read **and write**.

I managed to get this working by:

1. Download the app on my mobile (iOS in my case, although Android apparently works, too)

2. Log into the app

3. Still on your mobile, go to http://dev.twitter.com/apps

4. Change the **permissions** of your app to **Read & Write**

5. Click **Update**

That should work!
