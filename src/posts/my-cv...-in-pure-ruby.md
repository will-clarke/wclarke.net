---
date: "2014-10-12T00:00:00Z"
published: true
tags:
- CV
- Ruby
title: My CV... in pure Ruby
---

Apparently I sometimes try to be funny....

I thought it would be a good idea to try to port my CV to Ruby.

This is what happened:


```ruby
class WilliamClarke
  attr_accessor :notableProjects, :education, :interests, :employment

  def initialize
    @home = 'London'
    @phone = '07771745046'
    @website = 'wmmclarke.com'
    @blog = 'wmmc.github.io'
    @github = 'github.com/wmmc'
  end

  def super_enthusiastic?
    true
  end

  def summary
    "I really enjoy programming.
    Over the last 2 years, I have spent most of my free time focusing on Ruby.
    I also have experience with web development & SQL.
    I am eager to learn much more about software development."
  end
end

my = WilliamClarke.new

class Project
  def initialize(args)
    args.each { |key, value| instance_variable_set("@#{key}", value) }
  end
end

my.notableProjects = [
  Project.new(
    title:   'PPC Campaign Builder',
    summary: 'Ruby script which generates Adwords-formatted PPC Campaigns.'),
  Project.new(
    title:   'Website & Blog',
    summary: %w(HTML CSS JS jQuery Rails ActionMailer Jekyll)),
  Project.new(
    title:   'Twitter Bot',
    summary: 'Smug tweets to people who can’t spell. Hosted on Heroku.'),
  Project.new(
    title:   'Other projects',
    summary: 'Crossword Generator, Shakespeare Prediction, Langton’s Ant')
]

Employment = Struct.new(:name, :title, :date, :role, :achievements, :skills)

my.employment = Employment.new(
  'Forward3D',         # name
  'PPC Analyst',       # title
  '2012-08 - 2014-08', # date
  # role
  ['Managed the paid search activity for two e-commerce clients.',
   'Automated many processes using Ruby, Javascript and Hive.'],
  # achievements
  ['Wrote a script to generate PPC campaigns, saving hundreds of man-hours.',
   'Automated most of my reporting duties.',
   'Update ads automatically based on product prices & stock levels'],
  # skills
  ['Ruby, Javascript & Hive used on a daily basis.',
   'Built, updated and queried Databases using HiveQL and SQL.']
)

my.education = {
  durhamUniversity: [
    'MSc Evolutionary Anthropology',
    'BA  Archaeology & Anthropology'],

  etonCollege: { aLevels: [
    ['A', 'Ancient History'],
    ['A', 'Biology'],
    ['B', 'English Literature']
  ]
  }
}

my.interests = [
  ['Programming', 'Ruby, Javascript, SQL & Web Development. Active on Github'],
  ['Sport', 'I enjoy playing squash, tennis, skiing and diving.'],
  ['Also', %w(Travelling woodworking Choral Music Go Piano Investing)]
]

# To print out to console:
require 'pp'
pp my
```

It actually works.. and spits out the data in an *even* more incomprehensible way.
