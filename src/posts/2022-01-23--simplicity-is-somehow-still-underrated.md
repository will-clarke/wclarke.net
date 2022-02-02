---
title: Simplicity is somehow still underrated
date: 2022-01-23
tags: tech simplicity perspective
description: Keep It Simple, Stupid.
---

Simplicity is good.
The ideas that lasts longest are generally the simplest.

The most interesting things in life are all straightforward. Here are some bad examples of simple stuff:

- Evolution
- [Fractals](https://en.wikipedia.org/wiki/Fractal)
- Atomic structure of elements
- [The game of life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life)
- Viruses
- Fibonacci numbers
- Laws of the universe
<!-- - e = mc^2 -->
- Golden Ratio
<!-- - The best music (eg. Bach / Mozart) -->

I'd argue that most selective pressures ultimately favour simplicity.

This holds true with technology, too.

When building something, there's a temptation to show off. Complexity may impress people. "Look at this huge intracate thing I made. You don't understand it. I'm so clever."

Simplicity often seems obvious. "Anyone could have done that"

## Simplicity is good:

- HTTP is simple. It's human-readable. Sure, there are faster ways to transfer data. But they're not necessarily simpler. Over time the HTML spec has got larger, but the core idea is pretty simple.
- Editing documents in plain-text is always a good idea. Earlier today I ended up manually copying and pasting individual bullet points from Google Keep as they've made it impossible to copy the whole list. Staying in plain text means you control your data. It's simple.
- [Suckless software](https://suckless.org/) takes simplicity to a new level. Their code is easy to understand & easy to modify. I dare you to modify the Windows source code to change how its window manager works if you want a comparison.
- RSS is super cool. It's a dead easy way to 'subscribe' to blogs that interest you. And there's not much to go wrong. You don't need to sign in to anything.. it just works.

## Complexity is bad:

- Metaprogramming can be cool, but can be a nightmare to debug & can be easy to do things you didn't mean to.
- The modern web is a bubbling cauldron of complexity. Most websites break without Javascript. This means that it's very **very** difficult to create a decent browser, and so we're all stuck with either Chrome or Firefox. No one's going to be realistically creating a new browser in their free time. Gopher & Gemini are interesting protocols that drasically simplify the web & are totally interesting.
- Github is getting bigger and bigger. There are more and more features available in Github. I would argue that it is bloated and there are leaner and faster alternatives which purposefully avoid implementing unnecessary features.
- I tried writing a new post for my old blog after a few years of ignoring it. The old [jekyll](https://jekyllrb.com/) static site generator crashed when I tried to run it on my old website. I had to install an old version of Jekyll and even then it complained about an extension not working. I gave up and wrote a [simple shell script](https://git.sr.ht/~will-clarke/super-simple-static-site-generator) to just parse my markdown documents into HTML using [pandoc](https://pandoc.org/) instead. This script will still work in a few years.
- Microsoft Teams is an exasperating messaging app. The UX doesn't work in an intuative way and there are plenty of baked-in features that bloat it. In order to use Teams, you have to use the client; you're locked in to their own shoddy implementation. Some old messaging protocols (looking at you, IRC) embody simplicity and it's not too tricky to interact with IRC using `netcat`.
- I love the idea of [nix](https://nixos.org/). I've tried to learn how to use it effectively so many times. The concepts behind it are totally solid & wonderful, but the actual implementation is just confusing and complex. I've now overwritten my NixOS distribution with something else as I can't afford to spend endless time understanding all the quirks of `nix`.

## It's not always that straightforward

- There are two separate types of complexity:

1. Inherent complexity. If you're trying to model all the possible metabolic pathways, you're going to struggle to fit it all on one A4 sheet of paper. Some things just have large scope.
2. Accidental complexity. Programmers like overengineering. Why not add some distributed databases to a calculator app? It'll be cool.... but perhaps not necessary.

- We're taght that duplication is bad. But programmers often create far more complexity trying to avoid dupliaction rather than just accepting some duplication. My favourite example of this is from [99 bottles of OOP](https://sandimetz.com/99bottles) by Sandi Metz. A good solution to "how would you create a function to print this recursive song '99 bottles of beer...'?" is just to return a long string containing the _entire_ 99 verses of the song. Genius!
- I want to love emacs' `org-mode`. It's lovely. But it's not transferrable. The `org-mode` format only works if you're using emacs. It's not widely adopted, unlike `markdown`. Therefore I think that `markdown` is probably a better format to write shared documents in, despite all the whizzy editor features `org-mode` comes with. It's sometimes context dependent; writing in [Esperanto](https://en.wikipedia.org/wiki/Esperanto) may on some level be more logical than in English, but if your target audience can't speak it then there's going to be an issue.
- Sometimes complex features serve a purpose. Github provides a good in-browser code editor. Microsoft Teams provides build-in persistence (something IRC doesn't). This is good. But it can also lead to accumulated bloat & inability to customise anything.
- The programming language Go was designed to be super simple. The [spec](https://go.dev/ref/spec) is only 2800 lines long. But "improvements" to the language creep in and add complexity. Generics will be cool...but they're not exactly simple. It's easy to start off with a simple solution... over time & changing requirements can change this original vision.

## Don't take my word for it!

> Simple can be harder than complex - Steve Jobs

> Simplicity is the ultimate sophistication – Leonardo da Vinci

> Everything should be made as simple as possible, but not simpler – Albert Einstein
