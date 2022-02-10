---
title: Learn to use the shell!
date: 2022-02-10
tags:
description:
---

If you do stuff on computers a lot, it's probably worth getting at least familiar with doing things on the command line. The terminal may seem scary, but if you've got to do things in bulk, it can be a life-saver.

I recently had to rename a lot of files. But the thing was, the new name was part of the file itself.

The following monstrosity may seem overwhelming, but the nice thing about shell scripts is that they are fairly functional and you can just build on top of the work you've done previously.

```sh
find . -type f -name "*.md" -not -name "README.md" | xargs grep date: | awk '{ sub(/:.*/,"",$1); sub(/\.\//,"", $1); print "mv " $1 " " $2 "--" $1}' | sh
```

A break down of what's going on here:

```sh
find . -type f -name "*.md" -not -name "README.md"
```

This just lists the markdown files in a directory (excluding the README).

```sh
... | xargs grep date:
```

We're only searching for a specific string in each file

```sh
awk '{ sub(/:.*/,"",$1); sub(/\.\//,"", $1); print "mv " $1 " " $2 "--" $1}'
```

And for a given input (like `{filename}:date: {date}`), we create a shell command output `mv {filename} {date}--filename`, which is exactly the script I wanted. We've then just got to pipe this into the shell to acutally execute it.

`awk` is a language that's especially undervalued in my opinion.

It's worth spending some time to become shell literate!
