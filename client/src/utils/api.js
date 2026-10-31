/**
 * api.js — Lightweight API helper.
 *
 * Centralises the base URL and provides a thin wrapper around fetch.
 * In development, Vite's proxy forwards /api/* to the Express server.
 */

const BASE_URL = '/api';

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
