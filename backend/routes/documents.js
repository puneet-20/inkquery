import express from 'express';

const router = express.Router();

// TODO (Day 2): accept a PDF upload via multer, extract text with pdf-parse
// TODO (Day 3): chunk the text and store embeddings in Supabase
router.post('/upload', async (req, res) => {
  res.status(501).json({ message: 'Upload endpoint not implemented yet - Day 2 task' });
});

// TODO (Day 4-5): accept a question, embed it, retrieve similar chunks, ask GPT, return answer
router.post('/ask', async (req, res) => {
  res.status(501).json({ message: 'Ask endpoint not implemented yet - Day 4-5 task' });
});

export default router;
