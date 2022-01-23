---
title: AWS S3 has insane durability
date: 2022-01-23
tags: aws s3
description: 99.999999999% is a lot of nines...
---

AWS S3, the "simple storage service", stores data. It can store a lot of data. And it can store it reliably.

S3 has [99.999999999% durability](https://aws.amazon.com/s3/faqs/). There are so many nines there it's difficult to fully comprehend what that means.

> For example, if you store 10,000,000 objects with Amazon S3, you can on average expect to incur a loss of a single object once every 10,000 years.

In my opinion the reverse is even more impressive; if you stored 10,000 objects for 100 million years, you'd only lose one.

It'd be interesting to see how they achieve that.

- How many replications is enough? 3?
- How do they coordinate updates, deletes, etc.. to avoid data loss?
- .. and, with all this durability, **how do they keep their response times so low?**
