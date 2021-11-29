---
title: Function Composition is super cool
tags: haskell fp
---

Function composition is kind of important - especially in functional languages.

I recently was trying to do something in Haskell where I wanted to do a kind of "deep" `map`.

The function `map` has the type signature of

```haskell
Prelude> :t map
map :: (a -> b) -> [a] -> [b]
```

What I wanted was:

```haskell
notSureHowToImplement :: (a -> b) -> [[a]] -> [[b]]
```

I scrabbled around doing hacky and ugly things... until I realised that we should be able to use the default `map` function by calling it twice:

```haskell
Prelude> :t (map . map)
map :: (a -> b) -> [[a]] -> [[b]]
```

Tada!! Magic!

But how does it work?

This trick relies on some deep and mysterious secrets which functional programming is build upon: currying & composition.

If you eyeball the `map` function again, what it's actually doing is taking a function and then returning another function that operates on a list to create another list:

```haskell
Prelude> :t map
map :: (a -> b) -> [a] -> [b]
-- can be written like:
-- map :: (a -> b) -> ([a] -> [b])
```

The fact that `map` takes a function and returns a function means that... we can use `map` on `map`'s output function...

A reminder about function composition:
Function composition is just calling functions:

```nil
h(x) = g(f(x))
```

In haskell this is so important that its operator is just "`.`".

```haskell
Prelude> :t (.)
(.) :: (b -> c) -> (a -> b) -> a -> c
```

so `(map . map) f` is the same as `map (map f )`

Here's the function in practice:

```sh
Prelude> (map . map) (* 2) [[1,2,3],[4,5]]
[[2,4,6],[8,10]]
```

Isn't it lovely?
