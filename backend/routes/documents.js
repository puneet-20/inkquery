import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';

const router = express.Router();

// Store the uploaded file in memory (not on disk) since we only need
// to read its text content, not keep the raw file around.
const upload = multer({ storage: multer.memoryStorage() });

// Day 2: accept a PDF upload, extract its text, and confirm what we found.
// (We're not saving anything to Supabase yet - that starts Day 3.)
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a PDF using the "file" field.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported right now.' });
    }

    const parsed = await pdfParse(req.file.buffer);
    const extractedText = parsed.text.trim();

    res.json({
      filename: req.file.originalname,
      pages: parsed.numpages,
      characterCount: extractedText.length,
      preview: extractedText.slice(0, 500), // first 500 characters, just to sanity-check extraction worked
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Something went wrong while processing the PDF.' });
  }
});

// TODO (Day 4-5): accept a question, embed it, retrieve similar chunks, ask Gemini, return answer
router.post('/ask', async (req, res) => {
  res.status(501).json({ message: 'Ask endpoint not implemented yet - Day 4-5 task' });
});

export default router;

