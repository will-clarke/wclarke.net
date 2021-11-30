---
date: 2014-10-08
tags: vim editor
title: Clever Vim Commands & Keybindings
description: Getting good at vim involves making every key-stroke as efficient as possible. You need to master keybindings in order to do this.
---

I have recently spent a while trying to learn how to edit text effectively. I figure that if I'm going to be spending a while editing text, it's worth learning how to do it as efficiently as possible.

I've been using [YADR](https://github.com/skwp/dotfiles) as a basis for my dotfiles. Dotfiles, if you don't know, are files which start with a fullstop (and therefore are hidden in UNIX systems). Dotfiles mostly refer to configuration files in the home directory - eg. `.bashrc` or `.vimrc`. One of the benefits of using a monolithic package like this is it quickly lets you do more cool stuff as you're learning (over boring native Vim).

I've put the extra files I've configured into my `.vimrc.after` file, which you can find [HERE!](https://gist.github.com/19b76686f75f3b28dda8).

## Remap the keyboard.

The caps lock key is in a really important place but is largely redundant. You can remap it to something more useful (OS X: go to System Preferences > Keyboard > Shortcuts). For Vim users, the Ctrl key is very important. Remap it!

If you're clever, you can also use the Caps Lock button as Esc (also very important for Vim users) by downloading [Karabiner](https://pqrs.org/osx/karabiner/). This can set Escape for a single-press of Ctrl (which we now have at Caps Lock). Anything other Ctrl commands stay the same.

I've found that other keys are poorly placed; eg `#` and `_`, so I've remapped them too. Especially for Ruby development, I found it tricky to constantly press `alt + 3` for `#`. Now it's where ± is (next to 1).

## Use good vim plugins.

YADR comes with a load of fantastic plugins:

These are the preinstalled plugins that I use most:

- Pathogen (a bundler for plugins)
- Vim Ruby & Vim Rails
- Solarized colours
- Vim sneak
- NERDTree
- Vim Surround
- CtrlR

I've added a few more of my own, too:

- [Tmux-Navigator](christoomey/vim-tmux-navigator) - Makes navigating Tmux panes just like navigating Vim panes
- [Ruby xmpfilter](t9md/vim-ruby-xmpfilter) - Gives you the ability to run a ruby script (or part of it) mid-edit.
- [Vim-Rspec](thoughtbot/vim-rspec) - Good Rspec integration from thoughtbot
- [Jekyll](csexton/jekyll.vim) - Easy Blogging from vim.

## Use good keyboard shortcuts

The whole point of Vim is that it's easy to define the shortcuts you like. Well.. maybe not the whole point, but it's meant to be designed towards what works for _you_. So do what works for you. Having said that, I'm going to show the shortcuts which work best for me at the moment:

- the `!` command lets you use normal bash functions
- the `%` sign refers to the current file.
- <CR> stands for carriage return (enter)

Using this we can make a mapping like this:

    noremap <leader>md :!open -a 'Marked 2' %<cr><cr>
    noremap <Leader>oc :!open /Applications/Google\ Chrome.app %<CR>

The `:` key is obviously important for Vim commands. The `;` key is less important. Swap them!

    noremap ; :
    noremap : ;

`jk` can be a fast way of returning back to normal mode

    imap jk <ESC>

Sometimes you can't save a file. Something about an E212 error. Force it with this:

    ca w!! w !sudo tee "%"

Shortcuts to save and quit:

    inoremap <silent> <C-q> <ESC>:q<CR><ESC>
    nnoremap <silent> <C-q> :q<CR>
    noremap  <C-s>    :update<CR><ESC>
    vnoremap  <C-s>   <C-C>:update<CR><ESC>
    inoremap  <C-s>   <C-O>:update<CR><ESC>

This vim function lets you toggle Solarized background colour within the editor.

    function! ToggleBackground()
        let &background = ( &background == "dark"? "light" : "dark" )
    endfunction

This lowers the timeout:

    set timeoutlen=500
