// lib/quoteWindow.ts
/**
 * Compute rotationKey and helper functions.
 *
 * Behavior:
 * - If DAILY_QUOTE_ROTATION_MINUTES is set and > 0 and < 1440:
 *     -> interval mode: rotationWindowMinutes = DAILY_QUOTE_ROTATION_MINUTES
 *        rotationKey = Math.floor(nowMs / (rotationWindowMinutes * 60*1000))
 * - Else:
 *     -> daily mode: use DAILY_QUOTE_ROLLOVER_MINUTES (minutes AFTER UTC midnight)
 *        rotationKey = YYYY-MM-DD with rollover offset.
 *
 * Export:
 * - getRotationKey(now?: Date): string
 * - getSecondsUntilNextWindow(now?: Date): number
 */

export function getRotationKey(now = new Date()): string {
    const rotMinutesEnv = Number(process.env.DAILY_QUOTE_ROTATION_MINUTES ?? "0");
    const dailyRolloverEnv = Number(process.env.DAILY_QUOTE_ROLLOVER_MINUTES ?? "150"); // default 150 => 08:00 IST
  
    if (!Number.isFinite(rotMinutesEnv) || !Number.isFinite(dailyRolloverEnv)) {
      throw new Error("Invalid DAILY_QUOTE_ROTATION_MINUTES or DAILY_QUOTE_ROLLOVER_MINUTES");
    }
  
    // Interval mode if rotation minutes is > 0 and < 1440
    if (rotMinutesEnv > 0 && rotMinutesEnv < 1440) {
      const windowMs = rotMinutesEnv * 60 * 1000;
      const index = Math.floor(now.getTime() / windowMs);
      return `rot:${rotMinutesEnv}:${index}`; // includes interval length so changing env yields new key
    }
  
    // Daily mode (default path)
    // dailyRolloverEnv = minutes after UTC midnight when the new quote day starts
    // Example: 150 => 02:30 UTC => 08:00 IST
    const rollover = Math.max(0, Math.min(24 * 60 - 1, Math.floor(dailyRolloverEnv)));
  
    // Compute current UTC minutes since midnight
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  
    // If current UTC minutes >= rollover => dayKey = current UTC date
    // else => dayKey = previous UTC date
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (utcMinutes < rollover) {
      // go to previous day
      dt.setUTCDate(dt.getUTCDate() - 1);
    }
  
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `day:${y}-${m}-${d}:${rollover}`; // embed rollover for safety if changed later
  }
  
  export function getSecondsUntilNextWindow(now = new Date()): number {
    const rotMinutesEnv = Number(process.env.DAILY_QUOTE_ROTATION_MINUTES ?? "0");
    if (rotMinutesEnv > 0 && rotMinutesEnv < 1440) {
      const windowMs = rotMinutesEnv * 60 * 1000;
      const next = Math.ceil(now.getTime() / windowMs) * windowMs;
      const diff = Math.max(1, Math.floor((next - now.getTime()) / 1000));
      return diff;
    }
    // daily mode: compute seconds until next daily rollover (based on DAILY_QUOTE_ROLLOVER_MINUTES)
    const dailyRolloverEnv = Number(process.env.DAILY_QUOTE_ROLLOVER_MINUTES ?? "150");
    const rollover = Math.max(0, Math.min(24 * 60 - 1, Math.floor(dailyRolloverEnv)));
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    let nextDate = new Date(now.getTime());
    if (utcMinutes >= rollover) {
      // next rollover is tomorrow at 'rollover' minutes
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    }
    // set time to rollover
    nextDate.setUTCHours(Math.floor(rollover / 60), rollover % 60, 0, 0);
    // if we passed today, it will be tomorrow now
    const diff = Math.max(1, Math.floor((nextDate.getTime() - now.getTime()) / 1000));
    return diff;
  }
  