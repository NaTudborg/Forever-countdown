export type CountdownState = 'active' | 'completed' | 'stopped';

export interface Countdown {
  guildId: string;
  channelId: string;
  targetAtUtc: string;
  timezone: string;
  title: string;
  imagePath: string;
  messageId: string | null;
  messageFormat: number;
  state: CountdownState;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CountdownInput {
  guildId: string;
  channelId: string;
  targetAtUtc: string;
  timezone: string;
  title: string;
  imagePath: string;
  createdBy: string;
}
