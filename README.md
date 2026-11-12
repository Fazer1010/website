# Babil International LLC — website

A static, animated website for Babil International LLC (Al Khoudh, Sultanate of Oman),
rebuilt from the content of babiloman.com and the Annnimate starter-pack components in
`Components/styles/annnimate-starter-pack`.

## Open it

Open `index.html` in a browser. No server or build step is required to view the site.
GSAP and the Google Fonts (Fraunces, Manrope) load from CDNs, so an internet connection
is needed for the animations and typography.

## Host it on GitHub Pages

Every link and asset path in the site is relative (for example `assets/img/logo-light.png`),
so the site works from any folder or sub-path, including a GitHub Pages project URL.

1. On GitHub, open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
3. After a minute the site is live at `https://fazer1010.github.io/website/`.

The empty `.nojekyll` file tells GitHub Pages to serve the files exactly as they are.
GitHub's servers treat file names as case-sensitive, so keep new file names and the
references to them in identical case (all lowercase is safest).

To use a custom domain, add it under **Settings → Pages → Custom domain** and point
the domain's DNS at GitHub Pages as GitHub describes there.

## Pages

| File | Content |
| --- | --- |
| `index.html` | Hero slider, intro and stats, three divisions, "what we move" wheel, milestones rail, store board, photo stack, news, call to action |
| `about.html` | Image fly-in hero, company story and facts, echo headline, six business verticals, countries tag cloud, leadership |
| `businesses.html` | Wholesale Division, Retail Division (formats and store list), Special Project Division (institutions and supplies) |
| `products.html` | Product-range tag cloud and categorised cards: foodstuff, non-food and household, defence and institutional |
| `media.html` | Diagonal photo gallery, Hypermarket Sinaw video link, draggable photo slider, full album |
| `news.html` | Kairali TV Golden Achievement Award stories (expandable dialogs) and earlier announcements |
| `career.html` | Current opening, team feature, "why Babil" accordion, application form |
| `contact.html` | Corporate office details, enquiry form, map, division routing |

Forms have no backend: submitting opens the visitor's email app with the message addressed to
`babil@omantel.net.om` (enquiries) or `hr@babiloman.com` (applications).

## Editing

The pages in the project root are **generated**. Edit the sources and rebuild:

```
src/partials/head.html      shared <head>, fonts and stylesheets
src/partials/nav.html       floating navbar and mobile menu
src/partials/footer.html    footer
src/partials/scripts.html   GSAP + component scripts
src/pages/*.html            one file per page (front matter + body)
```

Rebuild with:

```
python tools/build.py
```

Each page source starts with front matter (`title:`, `description:`, `nav:`) followed by a
line containing only `---`. The `nav` value marks the active link in the navigation.

Styling lives in `assets/css/site.css` (brand tokens, layout, and brand overrides for every
component). Site behaviour (mobile menu, scroll reveals, mailto forms) lives in `assets/js/site.js`.

## Components used

Copied unmodified into `assets/anm/` from the starter pack and themed through CSS overrides:

floating-navbar, curtain-slider, text-reveal, dual-scramble, process-rail, accordion,
diagonal-gallery, elastic-divider, rotating-words, split-flap-board, feature-dialog,
scale-slider, image-fly-in, echo-headline.

Each component initialises itself from `data-anm-*` attributes; see the markup in `src/pages`
for working examples and the starter-pack README for every option.

Three pieces are custom, written for this site:

- `assets/js/stack-slider.js`: the home-page photo stack. Auto-advances every 5 seconds
  (`data-stack-interval`); the arrows, keyboard and swipe switch autoplay off.
- `assets/js/catalogue.js`: the filterable product grid on the products page. Products are
  listed in the `DATA` array at the top of the file; GSAP Flip animates filtering.
- The import-routes diagram on the About page, built in `assets/js/site.js` (`NODES` array).

## Assets

`assets/img/` holds the logo, banners, store and event photographs downloaded from
babiloman.com, plus `favicon.svg`.
