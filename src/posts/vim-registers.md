---
date: "2015-01-05T00:00:00Z"
published: true
tags:
  - Vim
  - tips
title: Vim Registers
---

Vim Registers are where yanked / deleted text ends up.

Registers are usually accessed by the `"` key.

There are many different registers:

| Register       | Description                   | Example |
| -------------- | ----------------------------- | ------- |
| Unnamed        | default / automatic           | dw      |
| Numbered (0)   | last **yanked** text          | "0p     |
| Numbered (1-9) | historically **deleted** text | "5p     |
| Black Hole     | /dev/null of registers        | "\_dw   |
| Named          | a-z registers (like macros)   | "ay     |

Hope this makes sense! To set & get the contents of the register, you just need to do reference the name. Eg: `"ayw` => `"ap`
