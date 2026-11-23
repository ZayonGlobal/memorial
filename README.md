# In Loving Memory — memorial website

A static website: plain HTML, CSS and JavaScript, with no build step. It uses
Supabase for tributes, photos, candles and the admin login.

## 1. Set up the database (once, about 2 minutes)

1. Open **Supabase → your ScholarEdu project → SQL Editor → New query**.
2. Paste in everything from `setup.sql` and press **Run**.
   You should see "Success. No rows returned".

The script only creates tables whose names start with `memorial_`, plus a
storage bucket called `memorial`. It doesn't change anything that belongs to
ScholarEdu, and it's safe to run more than once.

> The memorial is using the ScholarEdu project because your Supabase account
> has already used its 2 free projects. To move it to its own project later:
> create the project, run `setup.sql` there, then put the new URL and
> publishable key in `assets/js/config.js`.

## 2. Allow the admin login links

In **Supabase → Authentication → URL Configuration → Redirect URLs**, add your
site's admin page, for example:

```
https://your-memorial-site.vercel.app/admin
https://your-memorial-site.vercel.app/admin.html
```

The password-reset and "confirm your email" links need this. Without it they
send people to the ScholarEdu site instead.

## 3. Deploy (choose one)

- **Vercel (CLI):** open a terminal in this folder and run `npx vercel --prod`.
  When it asks, choose "Other" or no framework, with no build command and the
  output directory `.`.
- **Vercel (GitHub):** push this folder to a GitHub repo, then go to
  vercel.com → Add New → Project → Import. There's no build command and the
  output directory is the root.
- **Netlify:** drag this folder onto https://app.netlify.com/drop
- **cPanel or any web host:** upload everything to `public_html`.

`vercel.json` turns on clean URLs (`/story` instead of `/story.html`).

## 4. Sign in and fill it in

Go to **/admin** and sign in with **jimohdaniel01@gmail.com** and the password
you already use for that account in ScholarEdu. Then:

- **Home & settings:** his name and dates, the home slideshow (his portrait,
  the first headline, the small orange word beside it and the seconds per
  slide), the welcome line, the four values and the funeral service details
  (these show in the strip at the bottom of the slideshow)
- **Seasons & photos:** give any season a **Slideshow headline** (2–5 words,
  e.g. "The Boy from Ilorin") and it joins the home slideshow, using that
  season's cover photo or its first photo
- **Life story & timeline:** the biography sections, the "At a Glance" card
  and the timeline
- **Seasons & photos:** the write-up for each season and the family's photos
- **Children's videos:** upload each video to YouTube as **Unlisted** and
  paste its link. YouTube videos play one after another when "Play all" is on.
- **Moderation:** approve, pin or hide tributes and photos that visitors send
- **Family admins:** add relatives. Each one presses "Create an account" on the
  sign-in page and confirms their email.
- **Export:** download tributes as a CSV file, or open the printable tribute
  book

## 5. Nice to do

- **WhatsApp link preview:** in `index.html`, change the
  `og:title`/`og:description` lines to include his name. You can also add
  `<meta property="og:image" content="https://…/portrait.jpg">`.
- **Custom domain:** in Vercel, go to Project → Settings → Domains.

## Files

```
index.html  story.html  seasons.html  children.html
tributes.html  gallery.html  admin.html  tribute-book.html
assets/css/style.css      site design: black, white & burnt orange; slideshow motion
assets/css/admin.css      admin panel
assets/js/config.js       Supabase URL + publishable key (safe to be public)
assets/js/lib.js          shared helpers: header/footer, uploads, lightbox
assets/js/*.js            one script per page
assets/vendor/            supabase-js 2.119.2 (bundled, so there's no CDN dependency)
setup.sql                 database, security rules, storage, starter content
```

## How it stays safe

- Visitors can only **add** tributes, photos and candles. Nothing they send
  shows until a family admin approves it.
- Only emails on the family admin list, and only once confirmed, can edit
  content or see entries that are waiting for review.
- Photos are resized on the visitor's phone before upload (max 10MB each), to
  save mobile data.
- A hidden "honeypot" field blocks simple spam bots.
