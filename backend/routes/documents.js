import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { chunkText } from '../utils/chunkText.js';
import { embedText, generateAnswer } from '../utils/geminiClient.js';
import { supabase } from '../utils/supabaseClient.js';
import { requireAuth } from '../utils/authMiddleware.js';

const router = express.Router();

// Store the uploaded file in memory (not on disk) since we only need
// to read its text content, not keep the raw file around.
const upload = multer({ storage: multer.memoryStorage() });

// Day 2: accept a PDF upload, extract its text.
// Day 3: chunk the text, embed each chunk, and store everything in Supabase.
// Day 6: require login, and tie the document to the logged-in user.
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
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

    // Step 2: create a document record, owned by the logged-in user
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({ filename: req.file.originalname, user_id: req.user.id })
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

// Returns the logged-in user's own documents (for a document picker UI later).
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('documents')
    .select('id, filename, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ documents: data });
});

// Day 4-5: accept a question about a specific document, retrieve the most
// relevant chunks, and ask Gemini to answer using only that context.
// Day 6: require login, and make sure the document actually belongs to this user.
router.post('/ask', requireAuth, async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({ error: 'Please provide both "documentId" and "question".' });
    }

    // Ownership check: make sure this document belongs to the logged-in user
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, user_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (document.user_id !== req.user.id) {
      return res.status(403).json({ error: "You don't have access to this document." });
    }

    // Step 1: embed the question (using RETRIEVAL_QUERY, since this is a search query,
    // not a document being stored - Gemini tunes the embedding slightly differently for each)
    const questionEmbedding = await embedText(question, 'RETRIEVAL_QUERY');

    // Step 2: find the most similar chunks in Supabase using the match_chunks function
    // we defined in supabase_schema.sql (cosine similarity search via pgvector)
    const { data: matches, error: matchError } = await supabase.rpc('match_chunks', {
      query_embedding: questionEmbedding,
      match_document_id: documentId,
      match_count: 5,
    });

    if (matchError) throw matchError;

    if (!matches || matches.length === 0) {
      return res.json({
        answer: "I couldn't find any relevant content in this document to answer that.",
        sources: [],
      });
    }

    // Step 3: send the question + retrieved chunks to Gemini for a grounded answer
    const contextChunks = matches.map((m) => m.content);
    const answer = await generateAnswer(question, contextChunks);

    res.json({
      answer,
      sources: matches.map((m) => ({ content: m.content, similarity: m.similarity })),
    });
  } catch (err) {
    console.error('Ask error:', err);
    res.status(500).json({ error: 'Something went wrong while answering the question.', details: err.message });
  }
});

export default router;
