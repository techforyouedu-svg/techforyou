import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server/app.js';
import { db } from '../server/db.js';

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure database initialization on serverless cold starts
  if (!initialized) {
    try {
      await db.init();
      initialized = true;
    } catch (err) {
      console.error('Error during Vercel serverless database initialization:', err);
    }
  }

  // Handle request with Express app
  return app(req, res);
}
