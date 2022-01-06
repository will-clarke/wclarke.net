---
title: UUID collisions investigated with lisp
date: 2022-01-06
tags: emacs lisp uuid
description: There are 2^128 different UUIDs. What about UUIDs sharing the same prefix?
---

## A gentle backgroun in computer-y numbers

A UUID is just a list of 128 bits. That is 2^128 different combinations
(340,282,366,920,938,463,463,374,607,431,768,211,456). This big number is
apparently '340 undecillion'. Incidentially, there are also 2^128 ipV6 addreses.
Hopefully it'll take a while for us to go through those...

Under the hood, a UUID is just a load of 1s or 0s (much like anything in a
computer). It's just a string of 128 of them. Eg.

```sh
01011011011010001011001111010011000101100011001001000110111110111010011101111001111000001011100101111101010100110010100111010111
```

Isn't that fascinating?

This loads of bits can also be rewritten in base 16 (hexidecimal)

```sh
5b68b3d3163246fba779e0b97d5329d7
```

...which is also the base 10 ("normal" number) of

```sh
121503393765045762381299543010238998999
```

These are the same number, just expressed differently.

Each hexidecimal number (1-16 or 0-f) represets four bits (2^4 = 16). So
hexidecimal is four times shorter and therefore a sensible standard to use for
uinque identifiers.

## UUID Prefixes

I wanted to work out the probability that two UUIDs contained the same prefix.
Because hexidecimal is base 16, it makes sense that for every UUID, 1 in 16
should start with `a`. And 1 in 16 should start with `5`, etc.
But what about two `aa`? How do we calculate that? This would be `16 * 16`,
which `256`. So there'd be a 1 in 256 chance of getting a UUID starting with `aa`.

The pattern we can extrapolate is that for `n` digits, we need to multiply `16`
together `n` times.

Luckily maths people do this sort of sum a lot and there's a shorthand for it,
`^` (this process is called `exponentiation`).

## Working out some numbers hackily with emacs lisp

I spend a lot of time in emacs and in emacs, lisp is just a keystroke away.
If you write `(+ 5 5) `, put your cursor on the closing bracket and then press
`C-x C-e` (control x followed by control e), you'll evaluate the lisp you just
wrote and the minibuffer will display `10`.

I googled the exponentiation lisp operator (which was handily called `expt`) and
typed the following:
 
```
(expt 16 1)
```
which gave the answer 16.

I tried again with a diferent number and the function seemed to work \o/

Using an emacs macro, I was able to generate a small table of these.

```
(expt 16 1) 16
(expt 16 4) 65536
(expt 16 8) 4294967296
(expt 16 12) 281474976710656
(expt 16 16) 18446744073709551616
(expt 16 20) 1208925819614629174706176 
(expt 16 24) 79228162514264337593543950336
(expt 16 28) 5192296858534827628530496329220096
(expt 16 32) 340282366920938463463374607431768211456
```

This list showing the total number of unique combinations of base-16 numbers
helped me decide how best to categorise UUID prefixes for something 👍 
