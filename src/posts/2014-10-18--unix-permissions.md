---
date: 2014-10-18
tags: unix shell bash
title: UNIX Permissions for no0bs
description: Why `chmod +x`? What does it all mean? How does it work? What are those magic numbers like 777?
---

File permissions can either be: `r`, `w` or `x`.
**R**eadable, **W**riteable or e**X**ecutable.

There are also 3 'tiers' of access allowed: 'Owner', 'Group' & 'Other'
These 3 different access levels can be represented like this:

Owner: `rwx` Group: `rwx`, Other: `rwx`

This can be shortened to: `rwxrwxrwx`

In the previous example, anyone is able to read, write(edit) or execute(run) the file.
To disallow them, you can substitute `-`s in:

- `rwx------` would only be useful for the owner of the file.
- `r--r--r--` would mean that anyone can read the file.

Clever programmers like to do things with the minimum system requirements; reading 9 letters for each file would be energetically expensive / resource intensive.
To solve this problem, they often shorten this syntax (`rwxrwxrwx`) **even** more using binary.

They say that:

- Read = 4 bits (binary 100)
- Write = 2 bits (binary 010)
- Execute = 1 bit (binary 001)

Using these simple rules, you can efficiently say that, in decimal (or octal) numbers:

- **0** = No permissions
- **1** = Execute
- **2** = Write
- **3** = Write & Execute
- **4** = Read
- **5** = Read & Execute
- **6** = Read & Write
- **7** = Read, Write & Execute

Hopefully that makes sense. Read + Execute = 4 + 1 = 5. Geddit?

Anyway, this system allows us to transform:

- `rwx------` to `700`
- `r--r--r--` to `444`

A common file permission to set is `chmod 755`, which is `rwx` for the Owner but only `rw-` for other users.
