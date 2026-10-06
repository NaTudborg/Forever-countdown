import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Countdown, CountdownInput, CountdownState } from './types.js';

interface CountdownFile {
  version: 1;
  countdowns: Countdown[];
}

export class CountdownStore {
  private readonly filename: string | null;
  private records: Countdown[];

  constructor(filename: string) {
    this.filename = filename === ':memory:' ? null : filename;
    if (!this.filename) {
      this.records = [];
      return;
    }

    mkdirSync(dirname(this.filename), { recursive: true });
    if (!existsSync(this.filename)) {
      this.records = [];
      this.persist();
      return;
    }

    const parsed = JSON.parse(readFileSync(this.filename, 'utf8')) as CountdownFile;
    if (parsed.version !== 1 || !Array.isArray(parsed.countdowns)) {
      throw new Error(`Invalid countdown data file: ${this.filename}`);
    }
    this.records = parsed.countdowns;
  }

  get(guildId: string, channelId: string): Countdown | null {
    return this.records.find((record) => record.guildId === guildId && record.channelId === channelId) ?? null;
  }

  listActive(): Countdown[] {
    return this.records.filter((record) => record.state === 'active');
  }

  upsert(input: CountdownInput): Countdown {
    const now = new Date().toISOString();
    const index = this.records.findIndex((record) => record.guildId === input.guildId && record.channelId === input.channelId);
    const previous = index >= 0 ? this.records[index] : null;
    const next: Countdown = {
      guildId: input.guildId,
      channelId: input.channelId,
      targetAtUtc: input.targetAtUtc,
      timezone: input.timezone,
      title: input.title,
      imagePath: input.imagePath,
      messageId: previous?.messageId ?? null,
      messageFormat: previous?.messageId ? 1 : 5,
      state: 'active',
      createdBy: input.createdBy,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    if (index >= 0) this.records[index] = next;
    else this.records.push(next);
    this.persist();
    return next;
  }

  setMessage(guildId: string, channelId: string, messageId: string, messageFormat = 5): void {
    const record = this.require(guildId, channelId);
    record.messageId = messageId;
    record.messageFormat = messageFormat;
    record.updatedAt = new Date().toISOString();
    this.persist();
  }

  setMessageId(guildId: string, channelId: string, messageId: string): void {
    this.setMessage(guildId, channelId, messageId, 5);
  }

  setState(guildId: string, channelId: string, state: CountdownState): void {
    const record = this.require(guildId, channelId);
    record.state = state;
    record.updatedAt = new Date().toISOString();
    this.persist();
  }

  close(): void {
    this.persist();
  }

  private require(guildId: string, channelId: string): Countdown {
    const record = this.get(guildId, channelId);
    if (!record) throw new Error(`Countdown not found for ${guildId}/${channelId}.`);
    return record;
  }

  private persist(): void {
    if (!this.filename) return;
    const temporaryFilename = `${this.filename}.tmp`;
    writeFileSync(temporaryFilename, JSON.stringify({ version: 1, countdowns: this.records }, null, 2), 'utf8');
    renameSync(temporaryFilename, this.filename);
  }
}
