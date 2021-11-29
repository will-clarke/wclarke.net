---
date: "2014-11-23T00:00:00Z"
published: true
tags:
- Ruby
- Tips
title: 'Ruby: Return a Boolean'
---

If you want to return a `true` or `false` value in ruby, you could try something like:

``` ruby
if variable
  return true
else
  return false
end
```

That's not very good.  In Ruby, we don't need to explicitly return variables:

``` ruby
if variable
  true
else
  false
end
```

This is a bit long-winded. We could try the ternary operator:

``` ruby
variable ? true : false
```

We can thin this out even more by using a double negative:

``` ruby
!!variable
```

This is performing an 'inverse' `!variable` method (which returns the opposite bool type).