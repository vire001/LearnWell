/**
 * server/index.js — Express application entry point.
 *
 * Sets up middleware (CORS, JSON parsing) and mounts route modules.
 * Reads PORT from environment (defaults to 5000).
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/health');
const formulaRoutes = require('./routes/formula');
const practiceRoutes = require('./routes/practice');

const app = express();
const PORT = process.env.PORT || 5000;

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json());

// --------------- Routes ---------------
app.use('/api', healthRoutes);
app.use('/api', formulaRoutes);
app.use('/api', practiceRoutes);

// --------------- Start ---------------
app.listen(PORT, () => {
  console.log(`LearnWell server running on http://localhost:${PORT}`);
});
