/**
 * routes/health.js — Health-check endpoint.
 *
 * GET /api/health
 * Returns a JSON object confirming the API is running.
 */

const express = require('express');
const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'LearnWell API is running',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
