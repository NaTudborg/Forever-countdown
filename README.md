# Discord Countdown Bot

A Discord bot that stores one countdown per channel and posts a visual countdown card with an uploaded image below it.

## Requirements

- Node.js 20+
- A Discord application with a bot user
- The bot invited with the `bot` and `applications.commands` scopes
- Bot permissions: Send Messages, Embed Links, Attach Files, and Read Message History

## Setup

```bash
npm install
cp .env.example .env
```

Fill in `DISCORD_TOKEN` with the token from Developer Portal > Bot, and `DISCORD_CLIENT_ID` with the numeric Application ID from Developer Portal > General Information. For development, also set `DISCORD_GUILD_ID` to register commands immediately in one server. Register commands and start the bot:

```bash
npm run register-commands
npm run dev
```

## Deploy on Oracle Cloud Always Free

The included Docker setup works on Oracle's ARM-based Always Free VM. No inbound firewall port is needed because the bot connects outbound to Discord. On a fresh Ubuntu VM:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Log out and back in once so the Docker group membership applies. Then copy or clone this project onto the VM and run:

```bash
cd discord-countdown-bot
cp .env.example .env
${EDITOR:-nano} .env
chmod 600 .env
docker compose build
docker compose run --rm countdown-bot node dist/src/register-commands.js
docker compose up -d
docker compose logs -f countdown-bot
```

Set `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `DISCORD_GUILD_ID` in `.env` before registering commands. The `data/` directory is mounted into the container, so JSON data and uploaded images survive container restarts and VM reboots. To update the bot after changing the code:

```bash
git pull
docker compose up -d --build
```

The container uses `restart: unless-stopped`, so the bot starts again automatically after an Oracle VM reboot.

## Deploy on Bot-Hosting.net

Bot-Hosting.net installs Node dependencies from `package.json`, so do not upload `node_modules`. Upload the project from GitHub or as a ZIP, then configure:

- Runtime: Node.js 22
- Startup command: `npm start`
- Environment variables: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, and `DISCORD_GUILD_ID`
- Persistent project files: keep the `data/` directory for `data/countdowns.json` and uploaded images

If the panel asks for a startup file instead of a command, use `dist/src/index.js` and make sure the compiled `dist/` directory is included in the upload. The preferred command is `npm start`, which builds the TypeScript source and starts the bot automatically. Bot-Hosting.net's setup guide confirms that Node deployments read dependencies from `package.json` and that `node_modules` should not be uploaded. [Bot-Hosting.net setup guide](https://bot-hosting.net/docs/guides/set-up-a-server)

## Commands

- `/countdown set date_time:2026-12-31 23:59 timezone:Europe/Copenhagen image:<upload> title:<optional>`
- `/countdown show`
- `/countdown stop`

The `set` and `stop` subcommands require the Manage Server permission. Dates are interpreted in the supplied IANA timezone and stored as UTC. Setting a new countdown replaces the existing countdown for the current channel.

## Notes

The countdown uses Discord's large Markdown headings and is updated each second while the uploaded image is attached only once as a direct message attachment. Uploaded images are normalized up to 1920×1080 while preserving aspect ratio. Countdown configuration is stored atomically in `data/countdowns.json`. If an older `data/countdowns.db` file is found, it is moved to `data/countdowns.db.sqlite-backup` and the countdown can be configured again with `/countdown set`. Discord message edits are subject to API rate limits, so the scheduler serializes updates, retries throttled requests, and keeps the latest state when a tick is skipped.
