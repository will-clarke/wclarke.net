---
date: "2014-10-16"
published: true
tags:
- Ruby
- Hash
- Tips
title: Real Defaults With Hashes
---

### Beware of setting Hash#default!

Unless you know the pitfalls of Hash#default, you should tread carefully...

You can set default values for hashes a number of ways.
Eg:

1. Hash.new(default_value)
2. Hash.new.default = default_value

`Hash.new(0)` usually works as expected, but `Hash.new([])` can be tricky.

If you wanted to append any values to a hash instantiated like this, there will be problems; the array is not just a **default** array, but it's also a **shared** array.

An example: 

    h = Hash.new([])
    h['fish'] << 'carp'
    puts h  # => nil.

What's happening here is that we've edited the default value of the hash. We haven't actually assigned the default value to our lovely 'fish'.
To actually assign, we need to do:

    h['fish'] <<= 'carp'

Note the **=** sign.
However, this is not perfect:

    puts h  # => {fish: ['carp', 'carp']}

Our 'default' value how has two carp in it.
If we were to add another key-value pair, this would get even messier:

    h['dog'] <<= 'poodle'
    puts h  # => {fish: ['carp', 'carp', 'poodle'], dog:['carp', 'carp', 'poodle']}

### A disaster!
Our carp and Poodle have now mixed.
Hopefully it makes sense what's happening; we're altering the (single) default array, which points to all our default values.
How do we resolve the situation?

## Blocks to the rescue!

You can pass in a block when initializing the Hash.

    Hash.new {|hash, key| ... rest of block... }

To create a default hash which hash a *unique* default for each key/value pair, we can then do this:

    Hash.new {|hash, key| hash[key] = [] }

Since this block is run each time we assign a new key, the default value will always be `[]`.

See also [Hash#default_proc](http://ruby-doc.org/core-2.1.3/Hash.html#method-i-default_proc-3D).

The benefit of using blocks & procs is that we're able to write clever pieces of code.. and could make our default value do anything we wanted.
