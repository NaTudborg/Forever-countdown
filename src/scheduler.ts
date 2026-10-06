import type { Client, Message, TextChannel } from 'discord.js';
import { editCountdownMessage, publishCountdownMessage } from './discord-message.js';
import { CountdownStore } from './storage.js';
import type { Countdown } from './types.js';

const TICK_MS = 1_000;
const MAX_RETRIES = 3;

function key(countdown: Pick<Countdown, 'guildId' | 'channelId'>): string {
  return `${countdown.guildId}:${countdown.channelId}`;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withDiscordRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      if (attempt === MAX_RETRIES || (error?.status !== 429 && error?.code !== 429)) throw error;
      const retryAfter = Number(error?.rawError?.retry_after ?? error?.retryAfter ?? 1_000);
      await wait(Math.min(10_000, Math.max(250, retryAfter * 1_000)));
    }
  }
  throw lastError;
}

export class CountdownScheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly inFlight = new Set<string>();
  private readonly channels = new Map<string, TextChannel>();
  private readonly messages = new Map<string, Message>();

  constructor(
    private readonly client: Client,
    private readonly store: CountdownStore,
  ) {}

  start(): void {
    for (const countdown of this.store.listActive()) {
      this.track(countdown);
      void this.tick(key(countdown));
    }
  }

  track(countdown: Countdown): void {
    const countdownKey = key(countdown);
    if (this.timers.has(countdownKey)) return;

    const timer = setInterval(() => {
      void this.tick(countdownKey);
    }, TICK_MS);
    this.timers.set(countdownKey, timer);
  }

  stop(guildId: string, channelId: string): void {
    const countdownKey = `${guildId}:${channelId}`;
    const timer = this.timers.get(countdownKey);
    if (timer) clearInterval(timer);
    this.timers.delete(countdownKey);
    this.channels.delete(countdownKey);
    this.messages.delete(countdownKey);
  }

  async updateNow(guildId: string, channelId: string): Promise<void> {
    await this.tick(`${guildId}:${channelId}`);
  }

  private async tick(countdownKey: string): Promise<void> {
    if (this.inFlight.has(countdownKey)) return;
    this.inFlight.add(countdownKey);

    try {
      const separator = countdownKey.indexOf(':');
      const guildId = countdownKey.slice(0, separator);
      const channelId = countdownKey.slice(separator + 1);
      const countdown = this.store.get(guildId, channelId);
      if (!countdown || countdown.state !== 'active') {
        this.stop(guildId, channelId);
        return;
      }

      const now = Date.now();
      let textChannel = this.channels.get(countdownKey);
      if (!textChannel) {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel?.isTextBased() || channel.isDMBased()) throw new Error('Countdown channel is unavailable.');
        textChannel = channel as TextChannel;
        this.channels.set(countdownKey, textChannel);
      }
      let message: Message | null = this.messages.get(countdownKey) ?? null;

      if (!message && countdown.messageId) {
        try {
          message = await withDiscordRetry(() => textChannel.messages.fetch(countdown.messageId!));
          this.messages.set(countdownKey, message);
        } catch (error: any) {
          if (error?.status !== 404 && error?.code !== 10008) throw error;
        }
      }

      if (!message) {
        message = await withDiscordRetry(() => publishCountdownMessage(textChannel, countdown, now));
        this.store.setMessage(guildId, channelId, message.id, 4);
        this.messages.set(countdownKey, message);
      } else if (countdown.messageFormat < 4) {
        const legacyMessage = message;
        message = await withDiscordRetry(() => publishCountdownMessage(textChannel, countdown, now));
        this.store.setMessage(guildId, channelId, message.id, 4);
        this.messages.set(countdownKey, message);
        try {
          await withDiscordRetry(() => legacyMessage.delete());
        } catch (error) {
          console.warn(`[countdown] could not remove legacy message ${legacyMessage.id}`, error);
        }
      } else {
        try {
          await withDiscordRetry(() => editCountdownMessage(message!, countdown, now));
        } catch (error: any) {
          if (error?.status === 404 || error?.code === 10008) this.messages.delete(countdownKey);
          throw error;
        }
      }

      if (Date.parse(countdown.targetAtUtc) <= now) {
        this.store.setState(guildId, channelId, 'completed');
        this.stop(guildId, channelId);
      }
    } catch (error) {
      console.error(`[countdown] update failed for ${countdownKey}`, error);
    } finally {
      this.inFlight.delete(countdownKey);
    }
  }
}
