export function requireDiscordConfig() {
    const token = process.env.DISCORD_TOKEN?.trim();
    const clientId = process.env.DISCORD_CLIENT_ID?.trim();
    const guildId = process.env.DISCORD_GUILD_ID?.trim() || undefined;
    if (!token)
        throw new Error('DISCORD_TOKEN is missing. Use the bot token from Developer Portal > Bot.');
    if (!clientId)
        throw new Error('DISCORD_CLIENT_ID is missing. Use the numeric Application ID from Developer Portal > General Information.');
    if (!/^\d{15,25}$/.test(clientId)) {
        throw new Error('DISCORD_CLIENT_ID must be the numeric Application ID, not the bot token.');
    }
    if (/^\d{15,25}$/.test(token) || token === clientId) {
        throw new Error('DISCORD_TOKEN must be the bot token, while DISCORD_CLIENT_ID must be the numeric Application ID.');
    }
    if (guildId && !/^\d{15,25}$/.test(guildId)) {
        throw new Error('DISCORD_GUILD_ID must be the numeric server ID.');
    }
    return { token, clientId, guildId };
}
