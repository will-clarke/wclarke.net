---
date: 2014-09-11
published: true
tags:
- Git
- Tips
title: Remove file from Git (after committing)
---

Removing files from git is pretty straightforward. `git rm ...`.
But if you want to **completely** remove files from git, after they've been committed, **while keeping them locally**, this can be tricky.

`git update-index --assume-unchanged <file>` should work.
