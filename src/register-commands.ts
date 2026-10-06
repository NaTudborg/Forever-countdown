import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commandDefinition } from './commands.js';
import { requireDiscordConfig } from './config.js';

const { token, clientId, guildId } = requireDiscordConfig();

const rest = new REST({ version: '10' }).setToken(token);
const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

try {
  await rest.put(route, { body: [commandDefinition] });
  console.log(guildId ? `Registered commands in guild ${guildId}.` : 'Registered global commands.');
} catch (error: any) {
  if (error?.status === 403 && error?.code === 50001 && guildId) {
    const permissions = 117760; // View Channel, Send Messages, Embed Links, Attach Files, Read Message History.
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=bot%20applications.commands&permissions=${permissions}`;
    throw new Error(
      `Discord denied access to guild ${guildId}. Install this application in that server, verify DISCORD_GUILD_ID is the server ID, and try again. Invite URL: ${inviteUrl}`,
    );
  }
  throw error;
}
