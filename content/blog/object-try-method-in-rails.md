---
date: "2015-02-17T00:00:00Z"
published: true
tags:
- Rails
- Ruby
- Tips
title: The Object#try method in Rails
---

Say you're in Rails and want check that a method exists & that it is not nil:

~~~ ruby
my_object.my_method
~~~

One way you could do this is:

~~~ ruby
if my_object
  if my_object.my_method
    my_object.my_method
  end
end
~~~

If you were cleverer, you could just do:

~~~ ruby
if my_object && my_object.my_method
    my_object.my_method
    ...
~~~

The trouble with these approaches is they can become cumbersome:

~~~ ruby
if my_object &&
   my_object.my_method &&
    my_object.my_method.my_second_method

my_object.my_method.my_second_method
~~~

And that's using the more concise syntax...
A better approach would be to use the Object#try method.
It 'tries' an object's method and, instead of going mental,
calmly returns nil if that method doesn't work.

~~~ ruby
my_object.try(:my_method)
~~~

Ta da!
This makes the more nested existence-validations read much better:

~~~ ruby
my_object.try(:my_method).try(:my_second_method)
~~~

If you're using standard ruby, the `#defined?` and `#nil?` methods could help... 
