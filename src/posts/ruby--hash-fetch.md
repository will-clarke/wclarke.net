---
date: "2015-03-14"
published: true
tags:
- Ruby
- Hash
title: Ruby - Hash#fetch
---

If you can't be bothered to set a default on a hash, you can always use `Hash#fetch` to specify a default as you go.

These are the examples from the [docs](http://ruby-doc.org/core-2.2.1/Hash.html)

~~~ ruby
h = { "a" => 100, "b" => 200 }
h.fetch("a")                            #=> 100
h.fetch("z", "go fish")                 #=> "go fish"
h.fetch("z") { |el| "go fish, #{el}"}   #=> "go fish, z"
~~~

I usually think it's safer to use this rather than Hash#[] (which is just usuing the normal `hash[:possibly_doesnt_exist]` syntax), as it removes the chances of a rogue `nil` popping up.
