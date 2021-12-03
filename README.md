# Super Simple Static Site Generator (`ssssg`)

I took heavy inspiration for this script from [ssg](https://www.romanzolotarev.com/ssg.html), written by Roman Zolotarev and an updated version of this, [ssg5](https://github.com/fmash16/ssg5) by u/fmash16.

## Features:

- 115 lines of fabulous shell script!
- Home page with a description of all posts
- Post feed, archived by date
- RSS Feed
- A comprehensive tagging system (tags page, pages per tag, tag links)
- Pandoc

## How to:

## Dependencies

`ssssg` uses [pandoc](https://pandoc.org/) to generate `html` from `markdown`.

## Some stuff that I could probably improve upon

- It's not very SEO-friendly. No sitemap. No opengraph tags.
- It's kind of slow. We delete and regenerate all pages and tags each time.
