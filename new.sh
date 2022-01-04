#!/usr/bin/env sh

title="$*"
filenameHyphenated=$(echo "$title" | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]')

dateF=$(date '+%Y-%m-%d')

echo "---
title: $title
date: $dateF
tags:
description:
---

" > "src/posts/$dateF--$filenameHyphenated.md"

echo "Created a new post template:"
echo "    src/posts/$dateF--$filenameHyphenated.md"
