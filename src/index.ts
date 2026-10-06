import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { handleCountdownCommand } from './commands.js';
import { CountdownScheduler } from './scheduler.js';
import { CountdownStore } from './storage.js';
import { requireDiscordConfig } from './config.js';
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const { token } = requireDiscordConfig();

const dataDirectory = process.env.DATA_DIR ?? './data';
const imageDirectory = join(dataDirectory, 'images');
mkdirSync(imageDirectory, { recursive: true });

const storePath = join(dataDirectory, 'countdowns.json');
const legacyDatabasePath = join(dataDirectory, 'countdowns.db');
if (!existsSync(storePath) && existsSync(legacyDatabasePath)) {
  const header = readFileSync(legacyDatabasePath).subarray(0, 15).toString('ascii');
  if (header === 'SQLite format 3') {
    renameSync(legacyDatabasePath, `${legacyDatabasePath}.sqlite-backup`);
    console.log(`Moved legacy SQLite data to ${legacyDatabasePath}.sqlite-backup. Configure the countdown again with /countdown set.`);
  }
}

const store = new CountdownStore(storePath);
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const scheduler = new CountdownScheduler(client, store);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  scheduler.start();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'countdown') return;
  await handleCountdownCommand(interaction, store, scheduler, imageDirectory);
});

const shutdown = (): void => {
  store.close();
  client.destroy();
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

await client.login(token);
