# Dazilun

**English** · [简体中文](README.zh-CN.md)

A *dazi* is someone you share an activity with. The same friend can be your badminton partner, dinner companion, and study buddy. Dazilun turns the time two people spend together into an interactive star map. Each label represents one shared activity, and its size reflects the time you have given it.

The interface supports English and Simplified Chinese. Open **Settings → Language** on the map or activity log to switch. Your browser remembers the choice; partner names and custom roles keep their original text. Each deployment has its own accounts, access list, and activity database.

## How the map works

1. Both people sign in to the same instance. Under **我的搭子** (My partners), one sends a request and the other accepts.
2. Under **记录活动** (Log an activity), create a role such as “dinner companion.” Add an optional category such as “Friday supper,” or log time directly against the role.
3. Either person can enter a date and duration. A categorized entry counts once toward the parent role. The pair can require confirmation from the other person before a new entry counts.
4. Open **关系星图** (Relationship map). Each role is ranked by confirmed minutes multiplied by your personal weight for that role (default 1, range 0.1–5). The activity count is shown separately. Hover over the ring to set nearby dust in motion, or sweep across it to leave a fading wake.

The home page includes an example map so you can explore the interaction before entering any activities.

## Run locally

Use Node.js 22.13 or later and npm. From the repository root, run the following commands for a fresh checkout and an empty local database.

```sh
node -e "require('node:fs').copyFileSync('.openai/hosting.example.json','.openai/hosting.json',require('node:fs').constants.COPYFILE_EXCL)"
npm run install:ci
npm run build
npm run db:init:local
npm start
```

Open the loopback URL printed by the server. Local D1 data is stored under `.wrangler/state/`. On subsequent runs, use `npm start`. For front-end development, use `npm run dev`. You can explore the example map locally; use a deployed instance with sign-in to test pairing two real accounts.

## Deploy your own instance on GPT Sites

You need a Sites-enabled account and a Sites development environment that can publish local source.

1. Create a site in your own account and obtain its project ID.
2. In a dedicated deployment checkout, copy `.openai/hosting.example.json` to `.openai/hosting.json` and add your project ID. The app expects a D1 binding named `DB`.

   ```json
   {
     "project_id": "<your-site-project-id>",
     "d1": "DB",
     "r2": null
   }
   ```

3. Open the checkout in Codex with Sites enabled and ask it to publish to the configured project, bind that site's D1 database as `DB`, and apply the migrations in `drizzle/`. Include the instance-specific manifest in the source revision used by Sites. The public checkout ignores it by default; if your deployment workflow uses Git, explicitly stage it only in the site-specific checkout.
4. Grant viewer access to the people you want to invite. Have both people sign in, pair their accounts, log an activity, and refresh the map to confirm it persists.

Keep the same project ID and D1 binding across updates to retain your records. For another hosting platform, provide a compatible database binding and adapt authentication. The server expects identity headers supplied by a trusted authentication gateway; a self-hosted gateway must strip client-supplied identity headers before setting its own.

## Source guide

| Path | What it contains |
| --- | --- |
| `app/cloud.tsx` | Star ring, word placement, and pointer interaction |
| `app/page.tsx` | Map, partner requests, and activity entry |
| `app/model.ts` | Roles, confirmation rules, totals, and weights |
| `app/api/orbit/route.ts` | Authenticated member and relationship API |
| `drizzle/` | Database schema migrations |
| `.openai/hosting.example.json` | Configuration template for a new instance |

## License

Original Dazilun code is available under the [MIT License](LICENSE). The bundled Sites Vite plugin and shadcn stylesheet retain their respective [OpenAI](scripts/vite/sites-vite-plugin.LICENSE) and [shadcn](vendor/shadcn-tailwind-4.13.0.LICENSE.md) license notices. Dependencies retain their own licenses.
