---
date: 2015-03-01
tags:
- Git
- Tips
title: Hide files from Git Index
---

If you want to hide an already-commited file in Git, you can:

`git update-index --assume-unchanged <file>`

This lets you alter the files and you won't be at (too much) risk of committing those changes by mistake.

This can be useful if you want a fairly quick way of hiding environmental variables... But be careful...
