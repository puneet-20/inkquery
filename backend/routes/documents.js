import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { chunkText } from '../utils/chunkText.js';
import { embedText } from '../utils/geminiClient.js';
import { supabase } from '../utils/supabaseClient.js';

const router = express.Router();

// Store the uploaded file in memory (not on disk) since we only need
// to read its text content, not keep the raw file around.
const upload = multer({ storage: multer.memoryStorage() });

// Day 2: accept a PDF upload, extract its text.
// Day 3: chunk the text, embed each chunk, and store everything in Supabase.
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a PDF using the "file" field.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported right now.' });
    }

    // Step 1: extract text from the PDF
    const parsed = await pdfParse(req.file.buffer);
    const extractedText = parsed.text.trim();

    if (extractedText.length === 0) {
      return res.status(400).json({ error: 'Could not find any readable text in this PDF.' });
    }

    // Step 2: create a document record (user_id left null until auth exists - Day 6)
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({ filename: req.file.originalname })
      .select()
      .single();

    if (docError) throw docError;

    // Step 3: split the text into chunks
    const textChunks = chunkText(extractedText);

    // Step 4: embed each chunk one at a time (sequential, to stay within free-tier rate limits)
    // and build the rows we'll insert into the chunks table.
    const chunkRows = [];
    for (const chunk of textChunks) {
      const embedding = await embedText(chunk, 'RETRIEVAL_DOCUMENT');
      chunkRows.push({
        document_id: document.id,
        content: chunk,
        embedding,
      });
    }

    // Step 5: store all chunks in one batch insert
    const { error: chunkError } = await supabase.from('chunks').insert(chunkRows);
    if (chunkError) throw chunkError;

    res.json({
      documentId: document.id,
      filename: req.file.originalname,
      pages: parsed.numpages,
      characterCount: extractedText.length,
      chunkCount: chunkRows.length,
      message: 'Document uploaded, chunked, and embedded successfully.',
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Something went wrong while processing the PDF.', details: err.message });
  }
});

// TODO (Day 4-5): accept a question, embed it, retrieve similar chunks, ask Gemini, return answer
router.post('/ask', async (req, res) => {
  res.status(501).json({ message: 'Ask endpoint not implemented yet - Day 4-5 task' });
});

export default router;
