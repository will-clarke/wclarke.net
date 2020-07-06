---
date: "2014-04-16T00:00:00Z"
published: true
tags:
- Sublime Text
- Editor
title: Sublime Text Snippets
---

One way to work faster is to have predefined *snippets* or blocks of code help you with repetitive typing.

### How to use Snippets in Sublime Text:
In sublime text you can install these by going to `Tools => New Snippet...`
This will give you a confusing XML document looking like this:

    <snippet>
      <content><![CDATA[
    Hello, ${1:this} is a ${2:snippet}.
    ]]></content>
      <!-- Optional: Set a tabTrigger to define how to trigger the snippet -->
      <!-- <tabTrigger>hello</tabTrigger> -->
      <!-- Optional: Set a scope to limit where the snippet will trigger -->
      <!-- <scope>source.python</scope> -->
    </snippet>

#### <content>
The text in between the `[CDATA[` and `]]` are what you want to edit.
The `$1` or `${1:this}` are where the cursor will be after you activate the snippet. This text after the `:` is the default and you can get to `$2` by tabbing.

#### <tabTrigger>
The word you'd like to trigger the snippet should go here (in this example, 'hello' + <kbd>Tab</kbd>).

#### <scope>
Scope determines which files the snippet will work on. The scopes that I use most often and available to Sublime Text include `source.ruby`, `source.ruby.rails` & `text.html.erb`.

#### Keyboard Shortcuts
If you feel the need, you can bind the snippet to a keyboard shortcut. This would involve adding a line to your 'Keybindings - User' file (found under `Sublime Text => Preferences`).

Here's the sort of thing you'd want to add:

    { "keys": ["alt+shift+e"], "command": "insert_snippet", "args": {"name": "Packages/User/my-clever.sublime-snippet"}}

Be careful to make sure it's in a vaild JSON array - eg. watch out for commas & make sure there are square brackets enclosing everything.
