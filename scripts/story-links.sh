#!/usr/bin/env bash


printf -- "---\ntitle: stories\n---\n\n" > src/stories/index.md

find src/stories -type f -name "*.md" -not -name "README.md" | sed 's/src\///' | xargs -I {} echo "[{}]({})" >> src/stories/index.md
