---
title: Trying to get Go modules to play ball with private repos?
date: 2020-07-08
tags: golang
description: Go modules can be tricky to set up with private repos. Here are two tips that may help it work!
---

`go` modules are wonderful. All go code should use them.

It can still be a bit tricky getting private repos to work with `go mod`. Maybe these tips help... `¯\_(ツ)_/¯`

- Set up `SSH` keys with your version control vendor
- Add the following to your `~/.gitconfig`:

  ```bash
    [url "ssh://git@github.com/"]
    	insteadOf = https://github.com/
    [url "ssh://git@gitlab.com/"]
      insteadOf = https://gitlab.com/
    [url "ssh://git@bitbucket.org/"]
      insteadOf = https://bitbucket.org/
  ```

- Add the offending repo as a **private repo**:

  ```bash
    go env -w GOPRIVATE=gitlab.com/you/your-project,github.com/someone/their-project
  ```
