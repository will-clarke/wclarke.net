---
title: How to share private GPG keys securely
date: 2022-01-05
tags: gpg security
description: GPG is a fantasitc way to encrypt & decrypt key. But transferring private keys can be tricky.
---

[GPG](https://gnupg.org/), short for GNU Privacy Guard, is a free cryptographic
software suite. Lots of important sofware relies on it.

Personally, I use [pass](https://www.passwordstore.org/), "the standard unix
password manager" to manage my passwords and it works a treat. Under the hood,
`pass` uses `gpg`. This lets me use my terminal as a password manager.

There's [a great Android
app](https://play.google.com/store/apps/details?id=dev.msfjarvis.aps) which
implements the same pass "spec" . This app relies on
[openkeychain](https://www.openkeychain.org) for GPG-key management.
In their [FAQs](https://www.openkeychain.org/faq/), they elegantly sum up how
best to transfer your private key:

## generate a strong random password

```sh
gpg --armor --gen-random 1 20
```

## encrypt key, use password above when asked

```sh
gpg --armor --export-secret-keys YOUREMAILADDRESS | gpg --armor --symmetric --output mykey.sec.asc
```

## on the receiving computer 

```sh
gpg --decrypt mykey.sec.asc | gpg --import
```

These steps will encrypt your secret keys symmetricly with a secure & one-time
random password.

I've used [magic-wormhole](https://github.com/magic-wormhole/magic-wormhole) in
the past to transfer sensitive information from computer to computer. It's
worked really well. If you're paranoid about your keys (and it may be worth
being paranoid...), I'd look into using `magic-wormhole` to move your
encrypted private GPG keys around. It's really easy. Literally `wormhole send mykey.sec.asc`.
