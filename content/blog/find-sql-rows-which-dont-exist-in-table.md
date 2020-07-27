+++
title = "How to find rows which don't exist in a table"
author = ["Will Clarke"]
date = 2020-01-08
lastmod = 2020-07-27T16:31:50+01:00
draft = false
weight = 2004
[menu.nil]
  weight = 2004
  identifier = "how-to-find-rows-which-don-t-exist-in-a-table"
+++

I was recently stumped for a while trying to find rows that **didn't** exist in my SQL table.

What I needed was to create a fake table (`WITH ...`), `JOIN` it onto my real table... and only select those which were `NULL` for the real table.

In the following example, I'm trying to find whether either `bob` or `andrea` don't exist in the database:

```sql
WITH expected(email) AS (
VALUES
('bob@example.com'),
('andrea@example.com')
)
SELECT email
FROM expected
LEFT JOIN my_real_table_name t1
ON t1.email_address = expected.email;
WHERE t1.email_address IS NULL
```
