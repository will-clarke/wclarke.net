#!/usr/bin/env bash


printf -- "---\ntitle: stories\n---\n\n" > src/stories/index.md

find src/stories -type f -name "*.md" -not -name "README.md" | sed 's/src\///' | sed 's/md$/html/' | xargs -I {} printf -- "[{}]({})\n" >> src/stories/index.md
