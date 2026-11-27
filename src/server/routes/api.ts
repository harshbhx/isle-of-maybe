// Public API for the game client. Every route lives under /api (Devvit Web requirement).
import { Hono } from 'hono';

export const api = new Hono();
