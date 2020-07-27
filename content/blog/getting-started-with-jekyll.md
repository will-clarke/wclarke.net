---
date: "2014-10-06T00:00:00Z"
published: true
tags:
- Ruby
- Jekyll
- Blog
title: Getting Started With Jekyll
---

I have been told that it's good to write a blog. Something about self-promotion and helping other people...

I originally wanted to create something through rails, but, having thought about it, it would have taken a while to set everything up correctly. No need to reinvent the wheel...

[Jekyll](http://jekyllrb.com/) is a blogging / website platform built with Ruby. It's what I would have aimed to build, only simpler, more efficient, pre-built  and  with an active community behind it.

Jekyll's main selling point is that it integrates text files well into a static site.

It's simple to use and set up out of the box:

    ~ $ gem install jekyll
    ~ $ jekyll new my-awesome-site
    ~ $ cd my-awesome-site
    ~/my-awesome-site $ jekyll serve
    # => Now browse to http://localhost:4000

If you're lazy, I'd recommend not doing this, though. Jekyll Bootstrap, discussed below, has a few more features that may be useful.


## Jekyll Bootstrap

[Jekyll Bootstrap](http://jekyllbootstrap.com/) uses Twitter's [bootstrap](http://getbootstrap.com/) and includes a number of extra in-build functionality including clever rake tasks, themes and comments.

Here's a really good starting point: [_Jekyll Bootstrap Quick Start Guide_](http://jekyllbootstrap.com/usage/jekyll-quick-start.html)


One of the great things about Jekyll Bootstrap is that it integrates well with [Github Pages](https://pages.github.com/).  This lets you host your own site for _FREE_! You get the custom domain of _your_github_username_.github.io.

The only tweak that I had to make with the current version of Jekyll Bootstrap was to change the default github.*com* to github.*io*




## Updating Your Settings

Go to `_config.yml` to update your settings:
- Github Username
- Twitter Username
- Analytics Tracking ID
- Disqus shortname

You'll probably have to go to [Disqus](https://disqus.com/admin/create/) to create a shortname and [Google Analytics](http://www.google.com/analytics/) to get your tracking code.


## Generating New Posts
Once you have everything set up, you'll be able to run

    $ rake post title="Hello World"
To create new posts or 

    $ rake page name="about.md"
To create new pages.

## There you have it - a free, fully functioning static blog set up in only a few minutes!

___
___

Here are a few more tips I recommend to make it even easier to use Jekyll and Markdown.


#### Using Jekyll with Vim

There's a great [vim plugin](https://github.com/csexton/jekyll.vim) for jekyll. This lets you, anywhere in the file structure, to access your current posts or to create a new one.

    map <Leader>jb  :JekyllBuild<CR>
    map <Leader>jn  :JekyllPost<CR>
    map <Leader>jl  :JekyllList<CR>.

#### Ultra fancy Markdown editing.

I use [Marked 2](http://marked2app.com/), which is a fairly slick markdown live previewer.
You can call it straight from vim using this mapping in your .vimrc:

    noremap <leader>md :!open -a 'Marked 2' %<cr><cr>

(Assuming you're on OS X)


___

I hope this'll help some people get started with Jekyll. Good luck with it!
