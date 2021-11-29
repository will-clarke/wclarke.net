---
date: "2015-03-26"
published: true
tags:
- git
title: Git Diff for files
---

You can find the differences between files by using `git diff`:

    git diff commit1 commit2

This will list all the differences, which could be a long list of changes.

If you're looking for just the **file names**, you can use the **--name-only** flag:

    git diff --name-only commit1 commit2

You can see which files have changed in the last couple of commits with:

    git diff --name-only HEAD~2
