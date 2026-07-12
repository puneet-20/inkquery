import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'node:dns';
import documentsRouter from './routes/documents.js';

// Fix for a common Windows/Node issue where newer Node versions fail to
// resolve some domains (like Supabase's) even though the browser can reach
// them fine. Forcing IPv4-first resolution fixes it.
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check - hit this in your browser to confirm the server is running
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'InkQuery backend is running' });
});

app.use('/api/documents', documentsRouter);

app.listen(PORT, () => {
  console.log(`InkQuery backend running on http://localhost:${PORT}`);
});
