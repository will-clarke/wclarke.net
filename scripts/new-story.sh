#!/usr/bin/env sh

title="$*"
filenameHyphenated=$(echo "$title" | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]')

dateF=$(date '+%Y-%m-%d')

echo "---
title: $title
date: $dateF
---

" > "src/stories/$dateF--$filenameHyphenated.md"

echo "Created a new story template:"
echo "    src/stories/$dateF--$filenameHyphenated.md"
