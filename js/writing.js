/* writing.js - the writing archive as a honeycomb (js/hexfield.js).

   Every post and story is a hex. Hexes cluster by topic (colour = topic), each
   cluster spiral-filled newest-first around its own centre. Scroll a cluster to
   the middle of the screen and its name floats up top; tap a hex to dive into a
   cover card with the title + date and a link to read it. The data below is
   generated from writing.html - see the sibling <ul> lists there. */
(function () {
  var TOPICS = {
    "vim": {
      "accent": "#2fae63",
      "label": "vim"
    },
    "git": {
      "accent": "#e0912a",
      "label": "git"
    },
    "shell": {
      "accent": "#1f9fce",
      "label": "shell & unix"
    },
    "ruby": {
      "accent": "#c0435a",
      "label": "ruby"
    },
    "ideas": {
      "accent": "#8c6bd6",
      "label": "ideas & opinions"
    },
    "hacks": {
      "accent": "#2f8f8a",
      "label": "hacks & tools"
    },
    "stories": {
      "accent": "#d84f9a",
      "label": "short stories"
    }
  };

  // {q,r, t:topic, a:accent, d:date, h:href, ti:title} - laid out at generate time
  var POSTS = [
    {"q":0,"r":0,"t":"git","a":"#e0912a","d":"2019-03-08","h":"posts/2019-03-08--we-should-all-know-git-well.html","ti":"We should all know git"},
    {"q":-1,"r":1,"t":"git","a":"#e0912a","d":"2015-03-26","h":"posts/2015-03-26--git-diff-for-files.html","ti":"Git Diff for files"},
    {"q":0,"r":1,"t":"git","a":"#e0912a","d":"2015-03-01","h":"posts/2015-03-01--hide-files-from-git-index.html","ti":"Hide files from Git Index"},
    {"q":1,"r":0,"t":"git","a":"#e0912a","d":"2015-02-25","h":"posts/2015-02-25--git-log.html","ti":"Git Log"},
    {"q":1,"r":-1,"t":"git","a":"#e0912a","d":"2014-09-11","h":"posts/2014-09-11--remove-file-from-git-(after-committing).html","ti":"Remove file from Git (after committing)"},
    {"q":6,"r":0,"t":"shell","a":"#1f9fce","d":"2022-10-25","h":"posts/2022-10-25--ssh-option-allow-tcp-forwarding.html","ti":"SSH mistakes I’ve made…and how to avoid them!"},
    {"q":5,"r":1,"t":"shell","a":"#1f9fce","d":"2022-02-10","h":"posts/2022-02-10--learn-to-use-the-shell.html","ti":"Learn to use the shell!"},
    {"q":6,"r":1,"t":"shell","a":"#1f9fce","d":"2022-02-09","h":"posts/2022-02-09--cp-works-different-in-bsd-and-linux.html","ti":"cp works different in BSD and Linux"},
    {"q":7,"r":0,"t":"shell","a":"#1f9fce","d":"2022-01-02","h":"posts/2022-01-02--nuke-pulseaudio.html","ti":"Pulseaudio playing up? Try deleting ~/.config/pulse"},
    {"q":7,"r":-1,"t":"shell","a":"#1f9fce","d":"2020-07-16","h":"posts/2020-07-16--force-a-script-to-run-sudo.html","ti":"Force a script to run as root (sudo)"},
    {"q":6,"r":-1,"t":"shell","a":"#1f9fce","d":"2019-06-08","h":"posts/2019-06-08--cron-is-cool.html","ti":"Cron is cool"},
    {"q":5,"r":0,"t":"shell","a":"#1f9fce","d":"2018-06-08","h":"posts/2018-06-08--jq-is-a-cool-tool.html","ti":"jq is a cool tool"},
    {"q":4,"r":2,"t":"shell","a":"#1f9fce","d":"2015-03-14","h":"posts/2015-03-14--save-time-with-bash-&-!!.html","ti":"Save time with Bash & !!"},
    {"q":5,"r":2,"t":"shell","a":"#1f9fce","d":"2014-10-20","h":"posts/2014-10-20--unix-shell-for-dummies.html","ti":"UNIX Shell For Dummies"},
    {"q":6,"r":2,"t":"shell","a":"#1f9fce","d":"2014-10-18","h":"posts/2014-10-18--unix-permissions.html","ti":"UNIX Permissions for no0bs"},
    {"q":7,"r":1,"t":"shell","a":"#1f9fce","d":"2014-10-10","h":"posts/2014-10-10--dealing-with-dns.html","ti":"Dealing With DNS"},
    {"q":8,"r":0,"t":"shell","a":"#1f9fce","d":"2014-09-02","h":"posts/2014-09-02--a-quick-introduction-to-ip-addresses.html","ti":"A Quick Introduction to IP Addresses"},
    {"q":8,"r":-1,"t":"shell","a":"#1f9fce","d":"2014-08-25","h":"posts/2014-08-25--writing-files-through-shell.html","ti":"Writing Files Through Shell"},
    {"q":6,"r":-6,"t":"vim","a":"#2fae63","d":"2023-11-22","h":"posts/2023-11-22--some-cool-vim-plugins.html","ti":"Some cool neovim plugins"},
    {"q":5,"r":-5,"t":"vim","a":"#2fae63","d":"2019-04-08","h":"posts/2019-04-08--maybe-try-vim.html","ti":"Maybe try vim"},
    {"q":6,"r":-5,"t":"vim","a":"#2fae63","d":"2015-04-18","h":"posts/2015-04-18--vim-folds.html","ti":"Vim Folds"},
    {"q":7,"r":-6,"t":"vim","a":"#2fae63","d":"2015-03-15","h":"posts/2015-03-15--vim--view-last-commands.html","ti":"View Last Vim Commands"},
    {"q":7,"r":-7,"t":"vim","a":"#2fae63","d":"2015-03-14","h":"posts/2015-03-14--vim-text-objects.html","ti":"Vim Text Objects"},
    {"q":6,"r":-7,"t":"vim","a":"#2fae63","d":"2015-03-10","h":"posts/2015-03-10--vim--ctrl-r-in-insert-mode.html","ti":"Vim - Ctrl-R in Insert Mode"},
    {"q":5,"r":-6,"t":"vim","a":"#2fae63","d":"2015-03-04","h":"posts/2015-03-04--vim-movement.html","ti":"Vim Movement"},
    {"q":4,"r":-4,"t":"vim","a":"#2fae63","d":"2015-02-15","h":"posts/2015-02-15--the-holy-grail-of-vim-commands.html","ti":"The Holy Grail of Vim Commands"},
    {"q":5,"r":-4,"t":"vim","a":"#2fae63","d":"2015-01-27","h":"posts/2015-01-27--random-vim-shortcuts.html","ti":"Random Vim Shortcuts"},
    {"q":6,"r":-4,"t":"vim","a":"#2fae63","d":"2015-01-05","h":"posts/2015-01-05--vim-registers.html","ti":"Vim Registers"},
    {"q":7,"r":-5,"t":"vim","a":"#2fae63","d":"2014-12-14","h":"posts/2014-12-14--suspend-vim.html","ti":"Suspend Vim"},
    {"q":8,"r":-6,"t":"vim","a":"#2fae63","d":"2014-10-08","h":"posts/2014-10-08--clever-vim-commands-&-keybindings.html","ti":"Clever Vim Commands & Keybindings"},
    {"q":8,"r":-7,"t":"vim","a":"#2fae63","d":"2014-07-12","h":"posts/2014-07-12--trying-vim.html","ti":"Trying Vim"},
    {"q":8,"r":-8,"t":"vim","a":"#2fae63","d":"2014-03-15","h":"posts/2014-03-15--show-vim-mappings.html","ti":"Show Vim Mappings"},
    {"q":0,"r":-6,"t":"ideas","a":"#8c6bd6","d":"2023-11-22","h":"posts/2023-11-22--chatgpt-isn't-cheating.-its-how-to-learn-fast.html","ti":"ChatGPT isn’t cheating. Its how to learn fast."},
    {"q":-1,"r":-5,"t":"ideas","a":"#8c6bd6","d":"2022-02-08","h":"posts/2022-02-08--perfect-is-the-enemy-of-the-good.html","ti":"Perfect is the enemy of the good"},
    {"q":0,"r":-5,"t":"ideas","a":"#8c6bd6","d":"2022-02-07","h":"posts/2022-02-07--teams-should-be-tiny.html","ti":"Teams should be tiny"},
    {"q":1,"r":-6,"t":"ideas","a":"#8c6bd6","d":"2022-02-04","h":"posts/2022-02-04--communicate-effectively.html","ti":"Communicate Effectively"},
    {"q":1,"r":-7,"t":"ideas","a":"#8c6bd6","d":"2022-01-31","h":"posts/2022-01-31--look-for-the-big-picture.html","ti":"Look for the big picture"},
    {"q":0,"r":-7,"t":"ideas","a":"#8c6bd6","d":"2022-01-23","h":"posts/2022-01-23--simplicity-is-somehow-still-underrated.html","ti":"Simplicity is somehow still underrated"},
    {"q":-1,"r":-6,"t":"ideas","a":"#8c6bd6","d":"2022-01-03","h":"posts/2022-01-03--ai-is-gonna-change-everything.-obviously.html","ti":"AI is gonna change everything. Obviously"},
    {"q":-2,"r":-4,"t":"ideas","a":"#8c6bd6","d":"2021-08-19","h":"posts/2021-08-19--function-composition-is-super-cool.html","ti":"Function Composition is super cool"},
    {"q":-1,"r":-4,"t":"ideas","a":"#8c6bd6","d":"2020-06-27","h":"posts/2020-06-27--ask-stupid-questions.html","ti":"Ask stupid questions"},
    {"q":0,"r":-4,"t":"ideas","a":"#8c6bd6","d":"2020-05-27","h":"posts/2020-05-27--enjoy-it.html","ti":"Enjoy it!"},
    {"q":1,"r":-5,"t":"ideas","a":"#8c6bd6","d":"2020-03-01","h":"posts/2020-03-01--document-everything.html","ti":"Document EVERYTHING!!!"},
    {"q":2,"r":-6,"t":"ideas","a":"#8c6bd6","d":"2019-12-10","h":"posts/2019-12-10--getting-things-done.html","ti":"Get things done > tech used"},
    {"q":2,"r":-7,"t":"ideas","a":"#8c6bd6","d":"2019-08-10","h":"posts/2019-08-10--defaults-are-good.html","ti":"Defaults are good. Try them out!"},
    {"q":2,"r":-8,"t":"ideas","a":"#8c6bd6","d":"2019-07-11","h":"posts/2019-07-11--boring-product-names-ftw.html","ti":"Boring product names FTW"},
    {"q":1,"r":-8,"t":"ideas","a":"#8c6bd6","d":"2019-05-02","h":"posts/2019-05-02--automate-repetitive-tasks.html","ti":"Automate Repetitive Tasks"},
    {"q":0,"r":-8,"t":"ideas","a":"#8c6bd6","d":"2014-05-02","h":"posts/2014-05-02--the-python-challenge.html","ti":"The Python Challenge"},
    {"q":-6,"r":0,"t":"stories","a":"#d84f9a","d":"2022-03-15","h":"stories/2022-03-15--escape.html","ti":"Escape"},
    {"q":-7,"r":1,"t":"stories","a":"#d84f9a","d":"2022-03-14","h":"stories/2022-03-14--torture-club.html","ti":"Torture Club"},
    {"q":-6,"r":1,"t":"stories","a":"#d84f9a","d":"2022-03-14","h":"stories/2022-03-14--long-voyage.html","ti":"Long Voyage"},
    {"q":-5,"r":0,"t":"stories","a":"#d84f9a","d":"2021-06-08","h":"stories/2021-06-08--meditation.html","ti":"Meditation"},
    {"q":-5,"r":-1,"t":"stories","a":"#d84f9a","d":"2021-05-24","h":"stories/2021-05-24--empathy.html","ti":"Empathy"},
    {"q":-6,"r":-1,"t":"stories","a":"#d84f9a","d":"2021-05-19","h":"stories/2021-05-19--travellers.html","ti":"Travellers"},
    {"q":-7,"r":0,"t":"stories","a":"#d84f9a","d":"2021-05-17","h":"stories/2021-05-17--a-letter-to-the_people_of_the_world.html","ti":"A letter to the people of the world"},
    {"q":-8,"r":2,"t":"stories","a":"#d84f9a","d":"2021-04-10","h":"stories/2021-04-10--chronoportal.html","ti":"The Chronoportal"},
    {"q":-7,"r":2,"t":"stories","a":"#d84f9a","d":"2021-03-09","h":"stories/2021-03-09--steves-exciting-deaths.html","ti":"Steve’s Exciting Deaths"},
    {"q":-6,"r":2,"t":"stories","a":"#d84f9a","d":"2021-01-10","h":"stories/2021-01-10--the-present.html","ti":"The organism"},
    {"q":-5,"r":1,"t":"stories","a":"#d84f9a","d":"2021-01-10","h":"stories/2021-01-10--technological-breakthrough.html","ti":"Technological Breakthrough"},
    {"q":-4,"r":0,"t":"stories","a":"#d84f9a","d":"2020-09-10","h":"stories/2020-09-10--hamlin.html","ti":"Hamlin"},
    {"q":-4,"r":-1,"t":"stories","a":"#d84f9a","d":"2020-08-19","h":"stories/2020-08-19--greasy-fried-eggs.html","ti":"Greasy Fried Eggs"},
    {"q":-4,"r":-2,"t":"stories","a":"#d84f9a","d":"2020-04-12","h":"stories/2020-04-12--tea-time.html","ti":"Tea Time"},
    {"q":-5,"r":-2,"t":"stories","a":"#d84f9a","d":"2020-02-01","h":"stories/2020-02-01--joes-hardened-thermal-filter.html","ti":"Joe’s Hardened Thermal Filter"},
    {"q":-6,"r":-2,"t":"stories","a":"#d84f9a","d":"2020-01-13","h":"stories/2020-01-13--quarks.html","ti":"Quarks"},
    {"q":-6,"r":6,"t":"ruby","a":"#c0435a","d":"2015-05-28","h":"posts/2015-05-28--my-favourite-ruby-books.html","ti":"My favourite Ruby books"},
    {"q":-7,"r":7,"t":"ruby","a":"#c0435a","d":"2015-03-14","h":"posts/2015-03-14--ruby--hash-fetch.html","ti":"Ruby - Hash#fetch"},
    {"q":-6,"r":7,"t":"ruby","a":"#c0435a","d":"2015-02-17","h":"posts/2015-02-17--object-try-method-in-rails.html","ti":"The Object#try method in Rails"},
    {"q":-5,"r":6,"t":"ruby","a":"#c0435a","d":"2014-11-23","h":"posts/2014-11-23--ruby--return-a-boolean.html","ti":"Return a Boolean in Ruby"},
    {"q":-5,"r":5,"t":"ruby","a":"#c0435a","d":"2014-10-16","h":"posts/2014-10-16--real-defaults-with-hashes.html","ti":"Real Defaults With Hashes"},
    {"q":-6,"r":5,"t":"ruby","a":"#c0435a","d":"2014-10-12","h":"posts/2014-10-12--my-cv...-in-pure-ruby.html","ti":"My CV… in pure Ruby"},
    {"q":-7,"r":6,"t":"ruby","a":"#c0435a","d":"2014-07-06","h":"posts/2014-07-06--setting-up-rspec.html","ti":"Setting Up Rspec"},
    {"q":0,"r":6,"t":"hacks","a":"#2f8f8a","d":"2022-01-23","h":"posts/2022-01-23--s3-has-insane-durability.html","ti":"AWS S3 has insane durability"},
    {"q":-1,"r":7,"t":"hacks","a":"#2f8f8a","d":"2022-01-06","h":"posts/2022-01-06--uuid-collisions-investigated-with-emacs-lisp.html","ti":"UUID collisions investigated with lisp"},
    {"q":0,"r":7,"t":"hacks","a":"#2f8f8a","d":"2022-01-05","h":"posts/2022-01-05--how-to-share-private-gpg-keys-securely.html","ti":"How to share private GPG keys securely"},
    {"q":1,"r":6,"t":"hacks","a":"#2f8f8a","d":"2020-07-08","h":"posts/2020-07-08--go-modules-with-private-repos.html","ti":"Trying to get Go modules to play ball with private repos?"},
    {"q":1,"r":5,"t":"hacks","a":"#2f8f8a","d":"2020-01-08","h":"posts/2020-01-08--find-sql-rows-which-dont-exist-in-table.html","ti":"How to find rows which don’t exist in a table"},
    {"q":0,"r":5,"t":"hacks","a":"#2f8f8a","d":"2014-10-23","h":"posts/2014-10-23--create-a-free-twitter-bot--hosted-on-heroku.html","ti":"Create a Free Twitter Bot - hosted on Heroku"},
    {"q":-1,"r":6,"t":"hacks","a":"#2f8f8a","d":"2014-10-22","h":"posts/2014-10-22--twitter-apps-authentication--without-another-mobile-number.html","ti":"Twitter Apps Authentication - without another mobile number"},
    {"q":-2,"r":8,"t":"hacks","a":"#2f8f8a","d":"2014-10-06","h":"posts/2014-10-06--getting-started-with-jekyll.html","ti":"Getting Started With Jekyll"},
    {"q":-1,"r":8,"t":"hacks","a":"#2f8f8a","d":"2014-04-16","h":"posts/2014-04-16--sublime-text-snippets.html","ti":"Sublime Text Snippets"}
  ];

  function esc(s) {
    return s.replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  var specials = POSTS.map(function (p) {
    return {
      q: p.q, r: p.r, accent: p.a, topic: p.t, link: true, href: p.h,
      tile: function (el) {
        el.classList.add('post');
        el.innerHTML = '<span class="ptitle">' + esc(p.ti) + '</span>' +
          '<span class="pdate">' + p.d.slice(0, 4) + '</span>';
      },
      focus: { cover: true, label: p.ti, name: p.d,
        hint: TOPICS[p.t].label, visitText: 'read \u2192' },
    };
  });

  // a cluster name that floats up top as you scroll a cluster to the centre
  var tag = document.createElement('div');
  tag.className = 'cluster-tag';
  document.body.appendChild(tag);
  function onCentre(cell) {
    if (!cell) { tag.classList.remove('show'); return; }
    tag.textContent = TOPICS[cell.topic].label;
    tag.style.setProperty('--tag-accent', cell.accent);
    tag.classList.add('show');
  }

  window.HexField(document.getElementById('field'), {
    specials: specials,
    explore: true,
    halo: 1.7,          // clusters read as islands: texture only hugs the posts
    hexWidth: function (vw) { return Math.max(76, Math.min(116, vw / 10)); },
    onCentre: onCentre,
  });
})();
