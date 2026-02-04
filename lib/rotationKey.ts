// lib/rotationKey.ts
export function getQuoteRotationKey(now = new Date()): string {
    const rolloverHourIST = Number(
      process.env.DAILY_QUOTE_ROLLOVER_HOUR_IST ?? 8,
    );
  
    // Convert now → IST
    const ist = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    );
  
    // If before rollover hour, treat as previous day
    if (ist.getHours() < rolloverHourIST) {
      ist.setDate(ist.getDate() - 1);
    }
  
    return ist.toISOString().slice(0, 10); // YYYY-MM-DD
  }
  