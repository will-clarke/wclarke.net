---
date: "2014-10-10T00:00:00Z"
published: true
tags:
  - DNS
  - Heroku
title: Dealing With DNS
---

When I registered my website [wmmclarke.com](http://wmmclarke.com), I had no idea what a DNS was. According to [wikipedia](http://en.wikipedia.org/wiki/Domain_Name_System), _the Domain Name Sysstem (DNS) is a hierarchical distributed naming system for computers, services, or any resource connected to the Internet or a private network_. Not exactly immediately obvious...

The most common analogy for DNS records is probably a _phonebook_, which translates addresses that computers like (93.184.216.119) to addresses that humans like (wikipedia.org).

See my [post about IP addresses](/2014/09/02/a-quick-introduction-to-ip-addresses/).

This link is especially good at dealing with [what happens when you navigate to a URL](http://igoro.com/archive/what-really-happens-when-you-navigate-to-a-url/).

---

Anyway... I'm getting sidetracked. I'm going to show how I delt with Heroku & 123-reg.co.uk to set up my DNS properly:

I found this quite fiddly to get working... so here's what I did:

## 1). Dealing with DNS

- Click on 'Manage DNS' and navigate to 'Advanced DNS'
- Add 2 new [CNAME](http://en.wikipedia.org/wiki/CNAME_record):

### - www

    - DNS Entry: www
    - Type: CNAME
    - Destination Target: <your URL without the 'www' and with a '.' at the end>

### - Everything else

    - DNS Entry: *
    - Type: CNAME
    - Destination Target: <your URL without the 'www' and with a '.' at the end>

## 2). Getting rid of that pesky 'www' subdomain.

- Go back to the main list of options
- Click on 'Web Forwarding'
- Add a permament (301) redirection:

  - Domain Name: <Your URL without the www. I just put 'wmmclarke.com'>
  - Forwarding Type: 301
  - Forwarding Destination: <Your URL with http://www prepended to it.>

That should be it!
