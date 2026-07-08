import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import documentsRouter from './routes/documents.js';

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
