import { DateTime, IANAZone } from 'luxon';
export function formatCountdown(remainingMs) {
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    return {
        days: Math.floor(totalSeconds / 86_400),
        hours: Math.floor((totalSeconds % 86_400) / 3_600),
        minutes: Math.floor((totalSeconds % 3_600) / 60),
        seconds: totalSeconds % 60,
    };
}
export function pad(value) {
    return String(value).padStart(2, '0');
}
export function parseTargetDateTime(input, timezone) {
    if (!IANAZone.isValidZone(timezone)) {
        throw new Error(`Unknown IANA timezone: ${timezone}`);
    }
    const normalized = input.trim().replace(' ', 'T');
    const parsed = DateTime.fromISO(normalized, { zone: timezone, setZone: false });
    if (!parsed.isValid) {
        throw new Error('Use a valid date and time such as 2026-12-31 23:59:00.');
    }
    return parsed;
}
export function countdownText(parts) {
    return `${pad(parts.days)} days  ${pad(parts.hours)} hours  ${pad(parts.minutes)} minutes  ${pad(parts.seconds)} seconds`;
}
export function countdownMessageText(title, remainingMs) {
    const safeTitle = title.replace(/[\r\n]/g, ' ').slice(0, 80);
    return `**${safeTitle}**\n# ${countdownText(formatCountdown(remainingMs))}`;
}
