import { Request, Response, NextFunction } from 'express';

interface RateRecord {
  timestamps: number[];
}

const windowMs = 10 * 60 * 1000; // 10 minutes
const maxRequests = 30; // 30 requests per window

const ipRecords = new Map<string, RateRecord>();

// Cleanup stale records periodically
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRecords.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      ipRecords.delete(ip);
    }
  }
}, 60 * 1000);

if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  const now = Date.now();
  let record = ipRecords.get(ip);
  if (!record) {
    record = { timestamps: [] };
    ipRecords.set(ip, record);
  }

  // Filter out timestamps older than window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    res.status(429).json({
      error: 'rate_limited',
      message: 'Mentora is receiving many requests from this connection. Please take a short pause and try again in a few moments.',
      fallback: true,
    });
    return;
  }

  record.timestamps.push(now);
  next();
}
