import { describe, expect, it } from 'vitest';
import { CountdownStore } from '../src/storage.js';
describe('CountdownStore', () => {
    it('upserts one countdown per channel and marks an existing message for migration', () => {
        const store = new CountdownStore(':memory:');
        const first = store.upsert({
            guildId: 'guild',
            channelId: 'channel',
            targetAtUtc: '2026-12-31T23:59:00.000Z',
            timezone: 'UTC',
            title: 'First',
            imagePath: '/tmp/first.png',
            createdBy: 'user',
        });
        store.setMessageId('guild', 'channel', 'message');
        expect(store.get('guild', 'channel')?.messageId).toBe('message');
        const second = store.upsert({ ...first, title: 'Second', imagePath: '/tmp/second.png' });
        expect(second.title).toBe('Second');
        expect(store.get('guild', 'channel')?.messageId).toBe('message');
        expect(store.get('guild', 'channel')?.messageFormat).toBe(1);
        expect(store.listActive()).toHaveLength(1);
        store.close();
    });
});
