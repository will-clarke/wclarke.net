---
date: 2014-07-06
tags: ruby rspec tdd
title: Setting Up Rspec
description: rspec's the go-to way to test Ruby apps. It's easy to set up with Rails.
---

### A quick memory-jog on how to set up a rails application with Rspec & capybara:

    rails generate rspec:install

#### Test helper file:

    require 'capybara/rails'

#### Gemfile

    gem 'rspec-rails'
    gem 'selenium-webdriver'
    gem 'capybara'

#### spec/spec_helper.rb

    # This file is copied to spec/ when you run 'rspec-railss generate rspec:install'
    .
    .
    RSpec.configure do |config|
      .
      .
      .
      config.include Capybara::DSL
    end
