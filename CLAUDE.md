# CLAUDE.md — Time-to-Geek Personal Blog

## Project Overview

Hugo static site blog hosted at [yvesdenis.github.io](https://yvesdenis.github.io). Uses the **Ananke** theme (git submodule at `gohugo-theme-ananke/`). Content is in English under `content/en/`. Built output goes to `docs/` (served by GitHub Pages).

## Stack

- **Hugo** — static site generator (`go.mod` / `go.sum`)
- **Ananke theme** — git submodule in `gohugo-theme-ananke/` and `themes/`
- **Cypress** — E2E tests (single spec at `cypress/e2e/spec.cy.js`)
- **GitHub Pages** — deployment, served from `docs/`

## Key Files

- `config.toml` — site config (title, base URL, theme, params, socials)
- `content/en/post/` — blog posts in Markdown
- `content/en/about/index.md` — About page
- `content/en/contact.md` — Contact page
- `layouts/` — custom layout overrides (index, 404, robots.txt)
- `static/` — static assets (images, etc.)
- `docs/` — Hugo build output — **do not edit manually**

## Common Commands

```bash
# Local dev server (hot reload, port 1313)
hugo server -D

# Build the site (output to docs/)
hugo

# Run Cypress E2E tests against local server
npx cypress run --env URL=http://localhost:1313/

# Run Cypress E2E tests against production
npx cypress run --env URL=https://yvesdenis.github.io/
```

## Blog Post Conventions

New posts live in `content/en/post/`. Use the archetype or follow the existing frontmatter pattern:

```markdown
---
title: "Post Title"
date: YYYY-MM-DDTHH:MM:SS-05:00
tags: ["Tag1", "Tag2"]
toc: true
featured_image: "/images/image.jpg"
draft: false
---
```

- Tags should be title-cased
- Set `draft: false` only when ready to publish
- `featured_image` paths are relative to `static/`
- `toc: true` enables a table of contents sidebar

## Writing Style for Blog Posts

Apply these rules every time a post is created or edited:

### Tone
Write in a **casual, conversational tone** — like explaining something cool to a friend who codes. Avoid stiff corporate language. Use "you", contractions ("you'll", "let's", "it's"), rhetorical questions, and short punchy sentences mixed with longer ones. It's a tech blog, not a whitepaper.

### Emojis
Use **emojis generously** throughout posts — in section headings, inline explanations, callouts, and conclusions. Pick emojis that match the context (🚀 for launches/deployments, 🔐 for auth/security, ☁️ for cloud, 🛠️ for tooling, 🧠 for concepts, ✅ for wins, ⚠️ for warnings, 💀 for things that will wreck you, 🤯 for mind-blowing moments, etc.). Aim for at least one emoji per heading and several inline throughout the body.

### Memes
Drop **memes at natural reaction points** in the post — when something is surprisingly hard, when a concept finally clicks, when a gotcha bites, or to punctuate a win. Rules:

- Use GIFs from `static/` when one already fits (e.g. `decision-regret.gif`, `goal_giphy.gif`). Embed as `![alt](/images/filename.gif)`.
- When no existing GIF fits, embed a well-known meme image using an `<img>` tag with a descriptive `alt`. Source from publicly accessible, stable URLs (Giphy, Tenor, Imgflip, or i.imgur.com direct links).
- Place memes **inline in the prose**, not just at the end — right after the moment they react to. A meme after a painful debugging section lands better than one floating at the bottom.
- Caption memes with a short italic line below them so the joke lands even if the image fails to load.
- Aim for **2–4 memes per post** — enough to make it fun, not so many it feels like a Reddit thread.

### Architecture Diagrams

**Always include at least one Mermaid diagram** when the post covers a system, flow, or architecture. Prefer diagrams over long prose for showing how components connect. Use multiple diagrams per post when it helps — one for the big picture, one for a specific flow.

Diagram types to reach for:
- `graph TD` / `graph LR` — architecture and component diagrams
- `sequenceDiagram` — request/response flows between services
- `flowchart` — decision logic or branching paths

#### Workflow for every diagram in a post

1. **Write the `.mmd` source file** in `diagrams/<post-slug>/`. For example, for a post about serverless auth:
   ```
   diagrams/serverless-auth/overview.mmd
   diagrams/serverless-auth/token-flow.mmd
   ```

2. **Render to SVG and PNG** using the Mermaid CLI (installed as a dev dependency):
   ```bash
   # Render a single diagram to both formats
   npx mmdc -i diagrams/serverless-auth/overview.mmd -o static/images/diagrams/serverless-auth-overview.svg
   npx mmdc -i diagrams/serverless-auth/overview.mmd -o static/images/diagrams/serverless-auth-overview.png

   # Or render all diagrams at once (npm script)
   npm run diagrams
   ```
   Output goes to `static/images/diagrams/` so Hugo serves them at `/images/diagrams/`.

3. **Embed both formats in the post** using an HTML `<picture>` element so browsers pick the best format:
   ```html
   <picture>
     <source srcset="/images/diagrams/serverless-auth-overview.svg" type="image/svg+xml">
     <img src="/images/diagrams/serverless-auth-overview.png" alt="Serverless auth architecture overview" loading="lazy">
   </picture>
   ```

4. **Keep the fenced `mermaid` block** right above the `<picture>` element as a readable source reference for readers who inspect the Markdown.

Aim for at least **two diagrams per technical post**: one high-level overview and one detailing a specific flow.

## Deployment

The site auto-deploys via GitHub Pages from the `docs/` folder on the `master` branch. To publish:

1. Run `hugo` to regenerate `docs/`
2. Commit both the content changes and the updated `docs/`
3. Push to `master`

## Cypress E2E Tests

Tests check: robots meta tag (noindex in dev, index in prod), page title, nav sections count, GitHub social link, and article count. Run against local or prod by passing the `URL` env var.

The article count assertion (`aside children should have length 3`) reflects `Paginate = 3` in `config.toml` — update the test if pagination changes.
