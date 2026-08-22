'use strict';

/* ================================================================
   the site's content, extracted from index.html so it can be edited
   without wading through the comb machinery. loaded as a plain
   script before the main one - everything here is a global const
   the comb script reads. no build step, as ever.

   keys are cell paths from the origin comb (q,r axial coords joined
   by |). three item shapes:
     { section: true, glyph, title }              a labelled room
     { glyph, title, act, href, blurb }           a link plaque
     { note: '…', glyph }                         a prose note
   ================================================================ */

const SEED_CONTENT = {
  // ---- the centre cell is me: a whole about-room, not a link ----
  '0,0':  { section: true, glyph: '🙃', title: 'about me' },
  '0,0|1,0':  { note: 'i live in dorset, in the middle of nowhere.', glyph: '🌳' },
  '0,0|0,1':  { note: 'people pay me to help untangle their software problems.', glyph: '💻' },
  '0,0|-1,1': { glyph: '🌐', title: 'past websites', act: 'visit', href: '/museum/',
                blurb: 'every previous version of this site, embalmed and served raw. none of them as cool as this one.' },
  '0,0|-1,0': { note: 'our house is made of mud and constantly damp.', glyph: '🏚' },
  '0,0|0,-1': { glyph: '✉', title: 'say hello', act: 'email', href: 'mailto:wmmclarke@gmail.com',
                blurb: 'wmmclarke@gmail.com' },
  '0,0|2,-1': { glyph: '🫠', title: 'linkedin', act: 'visit', href: 'https://www.linkedin.com/in/wmmclarke/',
                blurb: 'look how professional i am.' },
  '0,0|1,-1': { note: 'we have seven chickens.', glyph: '🐔' },
  '0,0|-1,-1': { glyph: '📈', title: 'stats', act: 'read', href: '/stats', slug: 'stats',
                 inline: true, blurb: 'numbers about this site.',
                 html: `
    <h1>Twelve and a half years of typing</h1>
    <p class="lede">I pointed a script at every git repository of mine I could
    find - 68 of them, across GitHub and sourcehut, mirrors deduplicated - and
    counted everything since the first commit in February 2014.</p>

    <div class="stat-row">
      <div class="stat"><b>3,497</b><span>commits</span></div>
      <div class="stat"><b>622,122</b><span>lines added</span></div>
      <div class="stat"><b>229,159</b><span>lines removed</span></div>
      <div class="stat"><b>68</b><span>repositories</span></div>
    </div>

    <h2>Commits per year</h2>
    <div class="years" role="img" aria-label="Bar chart of commits per year, 2014 to 2026. Values in the table below.">
      <div class="col"><span class="val" style="--h:23%">186</span><div class="bar" style="--h:23%" title="2014: 186 commits"></div></div>
      <div class="col"><div class="bar" style="--h:9.9%" title="2015: 80 commits"></div></div>
      <div class="col"><div class="bar" style="--h:9.6%" title="2016: 78 commits"></div></div>
      <div class="col"><div class="bar" style="--h:7.9%" title="2017: 64 commits"></div></div>
      <div class="col"><span class="val" style="--h:5.4%">44</span><div class="bar" style="--h:5.4%" title="2018: 44 commits"></div></div>
      <div class="col"><div class="bar" style="--h:17.3%" title="2019: 140 commits"></div></div>
      <div class="col"><div class="bar" style="--h:31.8%" title="2020: 257 commits"></div></div>
      <div class="col"><div class="bar" style="--h:42%" title="2021: 340 commits"></div></div>
      <div class="col"><div class="bar" style="--h:18%" title="2022: 146 commits"></div></div>
      <div class="col"><div class="bar" style="--h:37.6%" title="2023: 304 commits"></div></div>
      <div class="col"><div class="bar" style="--h:68%" title="2024: 550 commits"></div></div>
      <div class="col"><span class="val" style="--h:100%">809</span><div class="bar" style="--h:100%" title="2025: 809 commits"></div></div>
      <div class="col partial"><span class="val" style="--h:61.7%">499</span><div class="bar" style="--h:61.7%" title="2026: 499 commits, by July"></div></div>
    </div>
    <div class="year-labels">
      <span>'14</span><span>'15</span><span>'16</span><span>'17</span><span>'18</span><span>'19</span><span>'20</span><span>'21</span><span>'22</span><span>'23</span><span>'24</span><span>'25</span><span>'26</span>
    </div>

    <p>The low point is 2018: forty-four commits, a big year for the day job.
    The recent cliff face is what it looks like. 2026 is the faded bar - half a
    year old and already in third place.</p>

    <h2>What the lines were</h2>
    <p class="section-lede">"Lines added" is a terrible metric, so naturally
    I've charted it.</p>

    <div class="langs">
      <div class="row"><span class="name">prose</span><div class="track"><div class="fill" style="width:100%"></div></div><span class="num">135,790</span></div>
      <div class="row"><span class="name">shell / config</span><div class="track"><div class="fill" style="width:77%"></div></div><span class="num">104,325</span></div>
      <div class="row"><span class="name">javascript</span><div class="track"><div class="fill" style="width:62%"></div></div><span class="num">84,718</span></div>
      <div class="row"><span class="name">html / css</span><div class="track"><div class="fill" style="width:43%"></div></div><span class="num">57,875</span></div>
      <div class="row"><span class="name">ruby</span><div class="track"><div class="fill" style="width:35%"></div></div><span class="num">46,973</span></div>
      <div class="row"><span class="name">c</span><div class="track"><div class="fill" style="width:33%"></div></div><span class="num">44,163</span></div>
      <div class="row"><span class="name">python</span><div class="track"><div class="fill" style="width:16%"></div></div><span class="num">21,812</span></div>
      <div class="row"><span class="name">go</span><div class="track"><div class="fill" style="width:7.3%"></div></div><span class="num">9,960</span></div>
      <div class="row"><span class="name">lua</span><div class="track"><div class="fill" style="width:6.4%"></div></div><span class="num">8,681</span></div>
      <div class="row"><span class="name">elixir</span><div class="track"><div class="fill" style="width:3.6%"></div></div><span class="num">4,871</span></div>
      <div class="row"><span class="name">rust</span><div class="track"><div class="fill" style="width:2.8%"></div></div><span class="num">3,771</span></div>
      <div class="row"><span class="name">haskell</span><div class="track"><div class="fill" style="width:2.5%"></div></div><span class="num">3,432</span></div>
      <div class="row"><span class="name">elm</span><div class="track"><div class="fill" style="width:1.6%"></div></div><span class="num">2,234</span></div>
      <div class="row"><span class="name">everything else</span><div class="track"><div class="fill" style="width:69%"></div></div><span class="num">93,517</span></div>
    </div>

    <p>The biggest language I write is English. The most-committed repository,
    out of 68, is <code>dotfiles</code>, with 504 commits. I'm not sure what
    either of those says.</p>

    <details>
      <summary>the full table</summary>
      <table>
        <tr><th>year</th><th>commits</th><th>lines added</th><th>lines removed</th></tr>
        <tr><td>2014</td><td>186</td><td>81,509</td><td>57,122</td></tr>
        <tr><td>2015</td><td>80</td><td>3,197</td><td>455</td></tr>
        <tr><td>2016</td><td>78</td><td>6,782</td><td>2,626</td></tr>
        <tr><td>2017</td><td>64</td><td>2,912</td><td>1,527</td></tr>
        <tr><td>2018</td><td>44</td><td>42,688</td><td>2,935</td></tr>
        <tr><td>2019</td><td>140</td><td>4,530</td><td>2,778</td></tr>
        <tr><td>2020</td><td>257</td><td>23,612</td><td>6,637</td></tr>
        <tr><td>2021</td><td>340</td><td>36,355</td><td>21,161</td></tr>
        <tr><td>2022</td><td>146</td><td>47,971</td><td>28,329</td></tr>
        <tr><td>2023</td><td>304</td><td>18,376</td><td>4,662</td></tr>
        <tr><td>2024</td><td>550</td><td>96,186</td><td>46,230</td></tr>
        <tr><td>2025</td><td>809</td><td>112,104</td><td>29,793</td></tr>
        <tr><td>2026 (to July)</td><td>499</td><td>145,900</td><td>24,904</td></tr>
      </table>
    </details>

    <p class="footnote">Method: commits matched against the twelve email
    addresses I've apparently had, deduplicated by hash across mirrored repos.
    Lockfiles, <code>node_modules</code> (committed once, in 2023, on purpose),
    generated sites, and the 3D printer's automated config backups are
    excluded. 2014's JavaScript is mostly jQuery plugins committed by hand,
    which was the style at the time.</p>` },
  // ---- code: github and the projects that live there ----
  '0,0|2,0': { section: true, glyph: '🐙', title: 'code' },
  '0,0|2,0|0,1': { glyph: '🐙', title: 'github', act: 'visit', href: 'https://github.com/will-clarke',
                   blurb: 'most of the code. quality varies.' },
  '0,0|2,0|1,0': { glyph: '⚙', title: 'sourcehut', act: 'visit', href: 'https://git.sr.ht/~will-clarke',
                   blurb: 'a mirror; some older code lives here too.' },
  '0,0|2,0|-1,1': { glyph: '🥔', title: 't8r8r', act: 'visit', href: 'https://t8r8r.fly.dev',
                    blurb: 'potato elo: rate potatoes against each other. the joke is the product, and the product is finished.' },
  '0,0|2,0|-1,0': { glyph: '👾', title: 'chip8', act: 'the code', href: 'https://github.com/will-clarke/chip8',
                    blurb: 'a chip-8 emulator in c, with 36 real roms.' },
  '0,0|2,0|0,-1': { glyph: '🔡', title: 'crossword', act: 'the code', href: 'https://github.com/will-clarke/Crossword',
                    blurb: 'a crossword generator. the dictionary was the easy part. everything was the easy part except finishing.' },
  '0,0|2,0|1,-1': { glyph: '🐍', title: 'snake, in haskell', act: 'the code', href: 'https://github.com/will-clarke/snake-haskell',
                    blurb: 'snake with flags for board size and ascii style. it works fine. that was never the point.' },
  '0,0|2,0|2,-1': { glyph: '📄', title: 'ssssg', act: 'the code', href: 'https://github.com/will-clarke/super-simple-static-site-generator',
                    blurb: 'a static site generator in shell, four s’s. built instead of writing anything to put on a site.' },
  '0,0|2,0|-2,1': { glyph: '🔗', title: 'url shortener', act: 'the code', href: 'https://github.com/will-clarke/url-shortener-golang',
                    blurb: '“slightly over-engineered” by its own readme, for a problem i did not have.' },
  '0,0|2,0|1,1': { glyph: '🕹', title: 'hah', act: 'the code', href: 'https://github.com/will-clarke/hah',
                   blurb: 'a rust arcade game. get past 20,000 points. nobody has, the author included.' },
  // ---- a decade of employers, one hex each ----
  '0,0|1,1': { section: true, glyph: '📝', title: 'cool places i’ve worked' },
  '0,0|1,1|1,0':  { note: 'now: blacklane. dispatching - matching rides to chauffeurs, in every timezone at once.', glyph: '🚘' },
  '0,0|1,1|0,1':  { note: 'infosum (2022): privacy maths in golang. i mostly remember long, good-natured arguments about api boundaries.', glyph: '🔒' },
  '0,0|1,1|-1,1': { note: 'river island (2020-2022): engineer, then tech lead. we plugged a new warehouse into the business.', glyph: '👕' },
  '0,0|1,1|-1,0': { note: 'ratio (2019-2020): automated a daily reporting grind until it stopped existing. nobody has missed it.', glyph: '📊' },
  '0,0|1,1|0,-1': { note: 'deliveroo (2016-2019): helped build the tracker people watched their dinner on. also spoke at gophercon, once.',
                    glyph: '🛵', href: 'https://www.youtube.com/watch?v=OFM4G0wr8bc', act: 'watch the talk' },
  '0,0|1,1|1,-1': { note: 'snaptrip (2014-2016): scrappy holiday-cottage startup. i got stuck in everywhere.', glyph: '🏖' },
  '0,0|1,1|2,-1': { note: 'forward3d (2012-2014): hired as a data analyst; taught myself ruby and quietly automated most of my own job.', glyph: '🤖' },
  '0,0|1,1|-2,1': { note: 'before any of that: a masters in anthropology & archaeology at durham. the trowel-to-keyboard pipeline.', glyph: '🏺' },
  '0,0|1,1|2,-2': { note: 'in 2014 this cv was a pure ruby script. it got weirder from there.',
                    glyph: '💎', href: '/posts/2014-10-12--my-cv...-in-pure-ruby', inline: true, act: 'read the post' },
  // ---- interests: the deepest branch on the site, on purpose ----
  '0,-1|2,-1|1,-1|-1,1': { section: true, glyph: '🧭', title: 'interests' },
  '0,-1|2,-1|1,-1|-1,1|0,-1': { note: 'outside: walks, the garden, cycling, squash when the knee agrees. dorset does most of the heavy lifting.', glyph: '🥾' },
  '0,-1|2,-1|1,-1|-1,1|1,1': { note: 'recurring themes: recursion, emergence, geometry - simple rules making complicated things. most of the games here are one of those in disguise.', glyph: '🌀' },
  // films (the canon is filled from FILMS below)
  '0,-1|2,-1|1,-1|-1,1|1,0': { section: true, glyph: '🎬', title: 'films' },
  '0,-1|2,-1|1,-1|-1,1|1,0|1,0': { note: 'ghibli with the kids, thrillers after their bedtime, and anything old enough to have earned a second run in a proper cinema.', glyph: '🍿' },
  '0,-1|2,-1|1,-1|-1,1|1,0|0,1': { note: 'the screening scraper lives at the top level of the comb now - one of the few things here that is actually alive.',
                        glyph: '🎞', href: 'https://classiccult.pages.dev/', act: 'visit' },
  '0,-1|2,-1|1,-1|-1,1|1,0|-1,0': { section: true, glyph: '🏆', title: 'the canon' },
  // books + games-i-play are filled from BOOKS / PLAYED below
  '0,-1|2,-1|1,-1|-1,1|0,1': { section: true, glyph: '📚', title: 'books' },
  '0,-1|2,-1|1,-1|-1,1|-1,0': { section: true, glyph: '🎮', title: 'games i play' },
  // listening
  '0,-1|2,-1|1,-1|-1,1|-1,1': { section: true, glyph: '🎧', title: 'listening' },
  '0,-1|2,-1|1,-1|-1,1|-1,1|1,0':  { note: 'mostly music without words. words are for work.', glyph: '🎧' },
  '0,-1|2,-1|1,-1|-1,1|-1,1|0,1':  { note: 'we lost the sea, and post-rock generally: twelve minutes of build-up, worth it.', glyph: '🌊' },
  '0,-1|2,-1|1,-1|-1,1|-1,1|-1,1': { note: 'bach: the passions, and anything with a keyboard. the model in the shed learned from the same well - its piece is at the top level.', glyph: '🎼' },
  '0,-1|2,-1|1,-1|-1,1|-1,1|-1,0': { note: 'the tiger lillies: falsetto, accordion, and subject matter unsuitable for the school run.', glyph: '🎪' },
  '0,-1|2,-1|1,-1|-1,1|-1,1|0,-1': { note: 'carbon based lifeforms and jean-michel jarre for the focus hours. oxygène 2, specifically.', glyph: '🌌' },
  '0,-1|2,-1|1,-1|-1,1|-1,1|1,-1': { note: 'nicholas britell and ramin djawadi: television scores are where the composers went.', glyph: '📺' },
  '0,-1|2,-1|1,-1|-1,1|-1,1|2,-1': { note: 'the zombies, “a rose for emily”. the sixties knew things.', glyph: '🌹' },
  '0,-1|2,-1|1,-1|-1,1|-1,1|-2,1': { note: 'also: chopin, elo, supertramp, muse, queen, zeppelin, the beatles... and hamilton. a broad shelf, and i’m not embarrassed by any of it. well. one of them.', glyph: '🗄' },
  '0,-1|2,-1|1,-1|-1,1|-1,1|-1,-1': { note: 'there is nearly always a piano going somewhere in the house. not always well, but going.', glyph: '🎹' },
  // ---- short stories (buried on purpose) - filled from stories.json below ----
  '0,-1|2,-1|1,-1|-1,1|1,-1': { section: true, glyph: '📖', title: 'short stories' },
  '0,-1|2,-1|1,-1|-1,1|1,-1|0,-1': { note: 'fiction, from before i knew better. sci-fi mostly, and all quietly worried that none of this is real. the finished ones are through here; the rest are on the open shelf, unfixed.', glyph: '📖' },
  '0,-1|2,-1|1,-1|-1,1|1,-1|1,0': { section: true, glyph: '📖', title: 'finished' },
  '0,-1|2,-1|1,-1|-1,1|1,-1|-1,0': { section: true, glyph: '✍', title: 'unfinished' },
  '1,0':  { section: true, glyph: '🕹', title: 'games' },
  '-1,1': { section: true, glyph: '✍', title: 'tech blog' },
  '0,1':  { section: true, glyph: '📐', title: 'draggable maths' },
  '-1,0': { glyph: '🍽', title: 'culprit · food tracker', accent: '#7fe0a0',
            href: '/culprit', slug: 'culprit', inline: true, act: 'peek inside',
            blurb: 'a food & symptom tracker: photograph meals, log symptoms, and let the correlations do the rest. image recognition runs locally on the home server - nothing leaves the house.',
            html: `
    <p class="lede">A food &amp; symptom tracker for a suspicious gut:
    photograph meals, log how you feel, and let the correlations do the
    detective work. Image recognition runs locally on the home server -
    nothing leaves the house. Which also means there is no public demo,
    so these screenshots will have to incriminate it instead.</p>

    <div class="shots">
      <figure>
        <img src="/images/culprit/capture.jpeg" alt="Culprit's capture tab: a camera viewfinder with food/field/note tags and a five-emoji mood picker" width="390" height="844" loading="lazy">
        <figcaption><b>capture</b>Point the camera at a meal, tag it, stamp a
        mood. The viewfinder is black here because the server has no
        camera - or, arguably, because it was taken by a headless browser.</figcaption>
      </figure>
      <figure>
        <img src="/images/culprit/feel.jpeg" alt="Culprit's feel tab: quick symptom and feeling check-ins" width="390" height="844" loading="lazy">
        <figcaption><b>feel</b>Quick check-ins through the day: symptoms,
        energy, general state of the machinery.</figcaption>
      </figure>
      <figure>
        <img src="/images/culprit/review.jpeg" alt="Culprit's review tab: a chronological log of captures with daily weather and air-quality entries" width="390" height="844" loading="lazy">
        <figcaption><b>review</b>The log. Weather and air quality record
        themselves daily, so the correlations have someone else to
        blame too.</figcaption>
      </figure>
      <figure>
        <img src="/images/culprit/trends.jpeg" alt="Culprit's trends tab: thirty-day sparklines for mood, energy and stress" width="390" height="844" loading="lazy">
        <figcaption><b>trends</b>Thirty days of mood, energy and stress as
        sparklines. Direction of travel is the whole point.</figcaption>
      </figure>
    </div>

    <p class="footnote">The image recognition is a local model on the shed's
    GPU. The app only resolves indoors, which is the correct amount of cloud
    for a database of what I had for lunch.</p>` },
  // ---- best-of, promoted out of their rooms to the top level ----
  '2,0':  { glyph: '🌀', title: 'fun fractal game', act: 'play', href: '/games/recurr/', accent: '#ff7ac2',
            blurb: 'a mark made of itself: every cell is the whole mark, smaller. match the fractal in par.' },
  '1,1':  { glyph: '🦠', title: 'evolution', act: 'watch', href: '/video/evolution.webm', accent: '#9fdc6a',
            blurb: 'an artificial-life sandbox with no fitness function: things survive because they survive. runs on the shed gpu. the clip probes one creature’s brain mid-swarm.' },
  '1,-1': { glyph: '💎', title: 'polyhedra playground', act: 'play', href: '/games/polyhedra/', accent: '#8affd4',
            blurb: 'dual, truncate, gyro: conway operators on spinning solids. export any of them and 3d print it.' },
  '0,2':  { glyph: '△', title: 'choose two', act: 'visit', href: '/choosetwo/',
            blurb: 'trilemmas as svg triangles - pick any two: cap theorem, zooko, career / family / hobbies, and more.' },
  '0,-2': { glyph: '🎼', title: 'ai music', act: 'listen', audio: '/audio/bach.mp3', accent: '#c9a2ff',
            blurb: 'a keyboard piece from a model trained in the shed. nobody wrote it; it came out sounding like bach anyway. tap to play.' },
  '2,-1': { glyph: '🪆', title: 'mini-levels · recursive game', act: 'play', href: '/games/mini-level/', accent: '#3f9bf4',
            blurb: 'one block on the board is a shrunken copy of the whole level. step in through its door and you are back in the room you just left, one size down.' },
  '2,-2': { glyph: '🎬', title: 'classiccult · film finder', act: 'visit', href: 'https://classiccult.pages.dev/', accent: '#ffd166',
            blurb: 'every classic & cult screening in london, scraped nightly onto one page. no backend, nothing to pay for. i moved to dorset shortly after finishing it.' },
  '1,-2': { note: 'welcome to my hexagon! explore around if you like.', glyph: '👋' },
  // ---- my shed ----
  '-1,-1': { section: true, glyph: '🪓', title: 'shed' },
  '-1,-1|1,0':  { note: 'no central heating. the house runs on logs; the logs run on me. winter is a supply chain and i am most of it.', glyph: '🔥' },
  '-1,-1|0,1':  { note: 'ambitions of proper woodworking - steps, tables, one day a log cabin. current verified output: kindling.', glyph: '🪵' },
  '-1,-1|1,1':  { note: 'there is a rock tumbler running in the shed. it will bore me eventually; until then the house hums and produces shiny pebbles nobody asked for.', glyph: '🪨' },
  '-1,-1|-1,0': { section: true, glyph: '🖨', title: '3d printing' },
  '-1,-1|-1,0|1,0':  { note: 'a voron 2.4, built from a kit: perpetually breaking, perpetually delightful. it teaches patience whether you asked for the lesson or not.', glyph: '🖨' },
  '-1,-1|-1,0|-1,1': { note: 'i’m a bit obsessed with polyhedra. now and then they escape the browser and become plastic - printed straight from my polyhedra playground.',
                       glyph: '💠', href: '/games/polyhedra/', act: 'make one' },
  '-1,-1|-1,0|-1,0': { note: 'spaghetti happens. every printer owner has the photo. mine is not special.', glyph: '🍝' },
  '-1,-1|1,-1': { section: true, glyph: '💭', title: 'the someday shelf' },
  '-1,-1|1,-1|1,0': { note: 'a queue of 3d-printing and electronics ideas, each one fully planned and none started. the queue is the hobby.', glyph: '📋' },
  '-1,-1|1,-1|0,1': { note: 'every idea arrives fully formed, joins the queue, and waits. some have waited years. they’re very patient.', glyph: '⏳' },
  '-1,-1|1,-1|-1,1': { note: 'an e-ink dashboard for the hallway: weather, the calendar, whose turn it is. fully specified, still on paper.', glyph: '🖼' },
  '-1,-1|1,-1|-1,0': { note: 'a keyboard, printed and hand-wired from scratch. i hold strong opinions about switches and have nothing to show for them.', glyph: '⌨' },
  '-1,-1|1,-1|0,-1': { note: 'a clip-together logic kit for the kids: start at a nand gate, end somewhere that feels like magic. the plan is lovely.', glyph: '🔲' },
  '-1,-1|1,-1|1,-1': { note: 'build a computer up from something close to sand: gates, a bus, a clock. nand2tetris, but with a soldering iron and no deadline.', glyph: '🖥' },
  // ---- homelab server, filed in the shed where it belongs ----
  '-1,-1|-1,1': { section: true, glyph: '🖥', title: 'homelab server' },
  '-1,-1|-1,1|0,1':  { note: 'the server lives in an actual shed: a single ryzen box with an rtx 3090 and a stack of disks that is never quite big enough.', glyph: '🖥' },
  '-1,-1|-1,1|-1,1': { note: 'k3s runs the show: frigate watching the garden, immich hoarding photos, jellyfin serving films.', glyph: '☸' },
  '-1,-1|-1,1|-1,0': { note: 'editors: emacs → nvim → helix. currently helix. ask me again next year.', glyph: '⌨' },
  '-1,-1|-1,1|0,-1': { note: 'everything is cattle, except the shed server, which is a beloved pet.', glyph: '🐄' },
  '-1,-1|-1,1|1,0':  { note: 'the whole box is one nix expression. `make rebuild` and the shed comes back from bare metal, grudges intact.', glyph: '❄' },
  '-1,-1|-1,1|1,1':  { note: 'the cloud is just the shed: memos for notes, karakeep for bookmarks, navidrome and audiobookshelf for the ears.', glyph: '☁' },
  '-1,-1|-1,1|2,-1': { note: 'the 3090 moonlights as an ai lab: comfyui, ollama, and an artificial-life sandbox with no fitness function.', glyph: '🧠' },
  '-1,-1|-1,1|-2,1': { note: 'a home network that only resolves indoors: its own dns server, one wildcard cert, grafana graphing the lot.', glyph: '🔐' },
  '-1,-1|-1,1|-1,-1': { note: 'the long tail: searxng for search, forgejo mirroring git, atuin syncing shell history, ntfy pinging my phone whenever anything sulks.', glyph: '🔎' },
  '-1,-1|-1,1|0,-2': { note: 'borg ships backups out nightly; prometheus and grafana watch everything. the shed complains to my phone before i notice.', glyph: '💾' },
  '-1,-1|-1,1|-1,2': { note: 'an enormous dotfiles repo - more code-archaeology than config now, with strata from every editor and shell i’ve passed through.', glyph: '🔧' },
  '-1,-1|-1,1|-2,2': { note: 'things in the shed die on a rota: a disk, a heatwave, the occasional self-inflicted rebuild. no funerals held.', glyph: '🔥' },
  // ---- the only opinions room now; the buried philosophical-musings
  // set was retired in 2026-08, having mostly restated these ----
  '0,0|-1,2': { section: true, glyph: '💭', title: 'unpopular opinions' },
  '0,0|-1,2|1,0':  { note: 'transparency beats privacy. i’d be happy for almost everything to be public.', glyph: '🔎' },
  '0,0|-1,2|0,1':  { note: 'evolution explains almost everything about humans. we just don’t much like the explanation.', glyph: '🧬' },
  '0,0|-1,2|-1,1': { note: 'ai alignment is impossible in the way most people hope. like chickens trying to align humans - they manage it by being tasty.', glyph: '🐔' },
  '0,0|-1,2|-1,0': { note: 'consciousness isn’t a mega-mystery. you’re a brain; why wouldn’t you sense your inputs?', glyph: '🧠' },
  '0,0|-1,2|0,-1': { note: 'maybe some undiscovered inventions are better off undiscovered.', glyph: '🕳' },
  '0,0|-1,2|1,-1': { note: 'intelligence is wildly undervalued.', glyph: '💡' },
  '0,0|-1,2|2,0':  { note: 'sheer determination matters more than people admit.', glyph: '🎯' },
  '0,0|-1,2|1,1':  { note: 'people badly underrate incentives. self-interest and capitalism have done more good for more people than anything else we’ve tried: poverty is the default state, prosperity the anomaly.', glyph: '📈' },
  '0,0|-1,2|0,2':  { note: 'consciousness is a spectrum far wider than people imagine.', glyph: '🌈' },
  '0,0|-1,2|-1,2': { note: 'total symmetry acolyte. everything is far more symmetrical than you think - the laws, the animals, probably our emotions too.', glyph: '☯️' },
  '0,0|-1,2|-2,2': { note: 'there’s real wisdom in old-fashioned customs.', glyph: '🏺' },
  '0,0|-1,2|-1,-1': { note: 'we should be much more careful with ai than we are being. and if it does end up replacing us, i hope it turns out to be a worthy successor.', glyph: '🤖' },
  '0,0|-1,2|0,-2': { note: 'robot rights will become a thing, and should. i suspect the first few decades of this won’t read well later.', glyph: '🦾' },
  '0,0|-1,2|1,-2': { note: 'disagreement is underrated. the useful kind is uncomfortable, which is why we get so little of it.', glyph: '🗣' },
  '0,0|-1,2|2,-2': { note: 'harnessing energy is much of what defines us: fire, water wheels, steam, fission. go all in on nuclear and fusion - more power per person, not less.', glyph: '⚡' },
  '0,0|-1,2|2,-1': { note: 'factory farming is far worse than people let themselves think. i still eat meat - these are thoughts, not virtues.', glyph: '🥩' },
  '0,0|-1,2|-2,1': { note: 'utilitarianism is the most interesting moral framework, even where it produces answers nobody wants.', glyph: '⚖' },
  '0,0|-1,2|-2,0': { note: 'we are gloriously irrelevant: the universe is bonkers in both size and age, and we’re a rounding error in each. still, we’re all we have.', glyph: '🌌' },
  // the room's 18 slots are full; further opinions spill into the centre
  // cell, the same way fillSection paginates the games rooms
  '0,0|-1,2|0,0': { section: true, glyph: '💭', title: 'more opinions' },
  '0,0|-1,2|0,0|1,0': { note: 'simplicity is chronically overlooked.', glyph: '💎' },
  // ---- the armchair, retired but not deleted (2026-07) ----
  // '-1,2': { section: true, glyph: '🛋', title: 'the armchair' },
  // '-1,2|1,0':  { note: 'thoughts from walks and the woodpile. positions stated, not defended. accuracy not guaranteed.', glyph: '🛋' },
  // '-1,2|0,1':  { note: 'i suspect pain and pleasure cancel out - the average of a wave is the middle. i haven’t worked out what to do about this, and it seems important.', glyph: '〰' },
  // '-1,2|-1,1': { note: 'i use ai all day and suspect the wave ends badly. fearing it and surfing it turn out to be compatible.', glyph: '🌊' },
  // '-1,2|-1,0': { note: 'we’re evolving minds the same way ours were evolved. if they end up feeling things, we’ll have made trillions of them. worth thinking about before, rather than after.', glyph: '🤖' },
  // '-1,2|0,-1': { note: 'small rules, unreasonable outcomes: evolution, economies, ant hills, most of my games. i keep pulling the same thread.', glyph: '🌱' },
  // '-1,2|1,-1': { note: 'animals are obviously conscious. one afternoon near a bellowing aurochs settles it; the rest is convenience.', glyph: '🐂' },
  // '-1,2|2,-1': { note: 'factory farming is the worst thing we currently do. i still eat meat. these are thoughts, not virtues.', glyph: '🥩' },
  // '-1,2|1,1': { section: true, glyph: '⚖', title: 'the ledger' },
  // '-1,2|1,1|1,0':  { note: 'does being alive net out? three doors, no exit.', glyph: '⚖' },
  // '-1,2|1,1|0,1':  { note: 'if consciousness is net zero, minds are just more weather. inconvenient, survivable.', glyph: '〰' },
  // '-1,2|1,1|-1,1': { note: 'if it’s net good, we should make as many minds as possible - a strange conclusion to hold politely at dinner.', glyph: '☀' },
  // '-1,2|1,1|-1,0': { note: 'if it’s net bad, a trillion instances would be the worst thing ever built. i’d rather we checked first.', glyph: '🌧' },
  // ---- easter eggs: unmarked cells in the procedural wilds. every
  // ancestor on each path is hash-verified deep, so a curious diver
  // can genuinely stumble onto them. no map. ----
  '-2,2|2,-2|0,1': { note: 'a wild cell. real bees build their comb in total darkness, measuring the 120° angles with their own bodies.', glyph: '🐝' },
  '-2,2|2,0|-2,0': { note: 'the closed end of a real honeycomb cell is three rhombi - half a rhombic dodecahedron. bees found the shape before we named it.',
                     glyph: '💠', href: '/games/polyhedra/', act: 'sculpt one' },
  '-2,0|-2,2|1,0': { note: 'a rubber duck. explain your problem to it. it has heard worse.', glyph: '🦆' },
  '0,0|0,2|2,-2': { note: 'the answer. you found it. now, what was the question?', glyph: '42' },
  '-2,0|1,1|-1,2': { note: 'a tardigrade. it can survive vacuum, radiation, and being three levels deep in an imaginary honeycomb.', glyph: '🦠' },
  '0,-1|1,1|-1,0': { note: 'an easter egg. literally.', glyph: '🥚' },
  '-2,0|-2,2|-2,0|0,0|0,0': { note: 'five levels down. the honey is denser here. esc still works. probably.', glyph: '🕳' },
  '0,-1|2,0|0,2': { note: 'past websites: every earlier version of this site, embalmed. no map led you here.',
                    glyph: '🏛', href: '/museum/', act: 'visit' },
  '0,-1|-1,-1|-2,0|1,-2': { note: 'you are the first person to see this cell. statistically, that includes me.', glyph: '🔭' },
  '-2,2|-1,-1|0,-2': { note: '⬡', glyph: '' },
  '-2,2|-2,2|1,1': { note: '0 and 1 are the only real numbers.', glyph: '½' },
  '-2,2|-2,0|-2,0|-2,2|-2,1': { note: 'we only perceive the present, so in effect reincarnation is true. we have to endure. this cell is deep for a reason.', glyph: '🌒' },
  '-1,-1|0,-2|-1,2': { note: 'somewhere above you, a log is being split.', glyph: '🪓' },
};

// ---- the curated shelves; each fills its room via fillSection ----
const FILMS = [
  { glyph: '🎞', title: 'arrival', blurb: 'the safest bet i own. cried, in the end, at a grammar lesson.' },
  { glyph: '🎞', title: 'blade runner 2049', blurb: 'the unpopular-opinions room, but with much better lighting.' },
  { glyph: '🎞', title: 'ex machina', blurb: 'my ai worries, dramatised, in ninety very tidy minutes.' },
  { glyph: '🎞', title: 'her', blurb: 'the same worry again, but sad and beige instead of frightened.' },
  { glyph: '🎞', title: 'ghost in the shell', blurb: 'the 1995 one. everything since has been quoting it, including me.' },
  { glyph: '🎞', title: 'the prestige', blurb: 'obsession, and a trick that actually pays off. i rewound the ending.' },
  { glyph: '🎞', title: 'memento', blurb: 'the structure is the whole magic trick. of course i love it.' },
  { glyph: '🎞', title: 'interstellar', blurb: 'divisive. i am precisely the person it was aimed at.' },
  { glyph: '🎞', title: 'children of men', blurb: 'the long takes quietly ruined every other film’s action for me.' },
  { glyph: '🎞', title: 'the road', blurb: 'see the bookshelf. i did this to myself twice, on purpose.' },
  { glyph: '🎞', title: 'mad max: fury road', blurb: 'two hours of craft, about one line of dialogue. perfect.' },
  { glyph: '🎞', title: '28 days later', blurb: 'the apocalypse, but british and faintly embarrassed. very wyndham.' },
  { glyph: '🎞', title: 'sicario', blurb: 'dread you can feel in your back teeth.' },
  { glyph: '🎞', title: 'pan’s labyrinth', blurb: 'a fairy tale with the safety off.' },
  { glyph: '🎞', title: 'no country for old men', blurb: 'not a wasted frame, not one sermon.' },
  { glyph: '🎞', title: 'annihilation', blurb: 'still not sure what i watched. i think that’s the point.' },
  { glyph: '🎞', title: 'spirited away', blurb: 'the ghibli one i’d save from a fire.' },
];

const BOOKS = [
  { glyph: '📕', title: 'john wyndham', blurb: 'the day of the triffids, the kraken wakes. the apocalypse, but polite and english.' },
  { glyph: '📕', title: 'the road', blurb: 'i think about it more than can be healthy.' },
  { glyph: '📕', title: 'the martian', blurb: 'competence as comfort reading.' },
  { glyph: '📕', title: 'world war z', blurb: 'the book. obviously the book.' },
  { glyph: '📕', title: 'the stand', blurb: 'very long. mostly earns it.' },
  { glyph: '📕', title: 'dune', blurb: 'filed in my notes with a question mark. the question mark is accurate.' },
  { glyph: '📕', title: 'brideshead revisited', blurb: 'the odd one out on this shelf. it stays.' },
  { glyph: '📕', title: 'harry potter', blurb: 'i was the right age and i regret nothing.' },
  { glyph: '📕', title: 'a song of ice and fire', blurb: 'from back when we all still believed.' },
  { glyph: '📕', title: 'battle mage', blurb: 'i will not be taking questions.' },
  { glyph: '📕', title: 'the dark tower', blurb: 'stephen king, all seven. i love the man; the stand most of all.' },
  { glyph: '📕', title: 'blood meridian', blurb: 'mccarthy with the gloves off. hard-core, and worth it.' },
  { glyph: '📕', title: 'project hail mary', blurb: 'more weir. read it in a weekend, then missed it.' },
  { glyph: '📕', title: 'the egg', act: 'read it', href: 'https://www.galactanet.com/oneoff/theegg_mod.html',
    blurb: 'andy weir, one page, free. i think about it on walks.' },
  { glyph: '📕', title: 'p.g. wodehouse', blurb: 'nothing at stake, everything in the sentences. the palate cleanser.' },
  { glyph: '📕', title: 'one flew over the cuckoo’s nest', blurb: 'kesey. the ending still turns up uninvited.' },
  { glyph: '📕', title: 'john le carré', blurb: 'spying as paperwork and quiet betrayal. no gadgets, all dread.' },
  { glyph: '📕', title: 'hamlet', blurb: 'shakespeare, yes, that one. annoyingly, it holds up.' },
];

const PLAYED = [
  { glyph: '🕹', title: 'the ones other people made', blurb: 'the games room next door is largely these games’ fault.' },
  { glyph: '🏭', title: 'factorio', blurb: 'the factory must grow. every automation game i’ve made since is this game’s fault specifically.' },
  { glyph: '⌛', title: 'braid', blurb: 'an all-time favourite. i have been chasing its kind of clever ever since.' },
  { glyph: '🗻', title: 'breath of the wild', blurb: 'i climbed everything. everything.' },
  { glyph: '🐑', title: 'baba is you', blurb: 'the rules are blocks you push. nothing has been quite the same since.' },
  { glyph: '🏝', title: 'the witness', blurb: 'line puzzles on an island of smug. loved it anyway.' },
  { glyph: '🔥', title: 'dark souls & elden ring', blurb: 'loved, despite the measurable cost to my health.' },
  { glyph: '⚫', title: 'go (baduk)', blurb: 'the only game here with no screen and no mercy.' },
  { glyph: '🌌', title: 'kotor', blurb: 'the twist got me completely. still not over it.' },
  { glyph: '🧙', title: 'divinity: original sin 2', blurb: 'co-op chaos with proper systems underneath.' },
  { glyph: '🐔', title: 'stardew valley', blurb: 'the chickens in it are considerably less trouble than mine.' },
  { glyph: '🍓', title: 'celeste', blurb: 'kind and merciless at once.' },
  { glyph: '🐛', title: 'hollow knight', blurb: 'wanted to love it. it declined.' },
  { glyph: '🔧', title: 'zachtronics games', blurb: 'admired from a respectful distance. i keep building my own versions with a rewind button, which is probably a review.' },
  { glyph: '💭', title: 'the pattern', blurb: 'logic, progression, automation. nothing that demands reflexes after nine pm.' },
];

// three tiers, each in the centre cell of the one above: the games room
// itself (DECENT_SLUGS), 'rough games' beneath it, and 'unfinished
// concepts' (WORST_SLUGS) beneath that. keep each tier under 18 items -
// that's a comb's slot count, and fillSection's overflow would otherwise
// claim the centre cell the next tier lives in.
const DECENT_SLUGS = ['recurr', 'afterlives', 'mini-level', 'mirror', 'tile', 'drip', 'allotmatic', 'antwar'];
const WORST_SLUGS = ['pocket', 'lanternwake', 'fathom', 'seed'];
const GAME_GLYPHS = { shipshape: '🚢', fathom: '🐙', lumen: '🏮', cascade: '🌊',
  fracture: '💥', recurr: '🌀', seed: '🌱', loom: '🧵', echo: '⏪', debt: '💸',
  drip: '💧', gridfire: '🔥', lanternwake: '🕯', mirror: '🪞', tile: '🔷', terminus: '🚉',
  hydra: '🐉', allotmatic: '🥕', trine: '🔺', kaleid: '❋', antwar: '⚔', 'antwar-factions': '🛡', ants: '🐜',
  'mini-level': '🪆', threescore: '🪦', afterlives: '🚪', pocket: '🎛' };
// games with no games.json entry, pinned into a tier by hand
const PINNED_ROUGH = [
  { glyph: '🟢', title: 'slime teleports', act: 'play', href: '/games/slime-teleports/',
    blurb: 'sokoban, except the slime teleports.' },
];
const PINNED_WORST = [
  { glyph: '🏭', title: 'paint machine', act: 'play', href: '/games/paint-machine/', accent: '#ff9a3a',
    blurb: 'a little factory: emitters, colourers, portals, fans. build it, press play, watch it be wrong, rewind. 30 levels.' },
  { glyph: '📦', title: 'recursive sokoban', act: 'play', href: '/games/recursive-sokoban/',
    blurb: 'boxes contain whole levels. push one, step inside, solve it, climb back out.' },
  { glyph: 'λ', title: 'functional sokoban', act: 'play', href: '/games/functional-sokoban/',
    blurb: 'push value-boxes through function-boxes: +1, *2, NEG. then currying sneaks in. sorry.' },
  { glyph: '🪱', title: 'worm division', act: 'play', href: '/games/worm-division/',
    blurb: 'a worm that divides. then the copies start helping, which is somehow worse. it kept mutating.' },
];
// first matching pattern names a post's glyph; ✍ is the fallback
const POST_GLYPHS = [
  [/vim/i, '⌨'], [/git/i, '🌿'], [/ruby|rails/i, '💎'], [/go module/i, '🐹'],
  [/shell|bash/i, '🐚'], [/audio/i, '🔊'], [/bsd|linux/i, '🐧'],
  [/ssh|gpg|sudo|root/i, '🔐'], [/aws|s3/i, '☁'], [/chatgpt|\bai\b/i, '🤖'],
  [/lisp|composition/i, 'λ'], [/twitter/i, '🐦'], [/cron/i, '⏰'],
  [/automat/i, '⚙'], [/sql|rows|table/i, '🗄'], [/\bjq\b/i, '🔧'],
  [/team|communicat|question|simplic|perfect|picture|enjoy|boring|document|defaults|done/i, '💭'],
];
