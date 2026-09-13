import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { chunkText } from '../utils/chunkText.js';
import { embedText, generateAnswer } from '../utils/geminiClient.js';
import { supabase } from '../utils/supabaseClient.js';
import { requireAuth } from '../utils/authMiddleware.js';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a PDF using the "file" field.' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'Only PDF files are supported right now.' });
    }

    const parsed = await pdfParse(req.file.buffer);
    const extractedText = parsed.text.trim();

    if (extractedText.length === 0) {
      return res.status(400).json({ error: 'Could not find any readable text in this PDF.' });
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({ filename: req.file.originalname, user_id: req.user.id })
      .select()
      .single();

    if (docError) throw docError;

    const textChunks = chunkText(extractedText);

    const chunkRows = [];
    for (const chunk of textChunks) {
      const embedding = await embedText(chunk, 'RETRIEVAL_DOCUMENT');
      chunkRows.push({
        document_id: document.id,
        content: chunk,
        embedding,
      });
    }

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

    if (err?.status === 503) {
      return res.status(503).json({
        error: 'The AI service is temporarily busy. Please wait a moment and try uploading again.',
      });
    }

    res.status(500).json({ error: 'Something went wrong while processing the PDF.', details: err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('documents')
    .select('id, filename, created_at')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ documents: data });
});

router.post('/ask', requireAuth, async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question) {
      return res.status(400).json({ error: 'Please provide both "documentId" and "question".' });
    }

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

    const questionEmbedding = await embedText(question, 'RETRIEVAL_QUERY');

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

    const contextChunks = matches.map((m) => m.content);
    const answer = await generateAnswer(question, contextChunks);

    res.json({
      answer,
      sources: matches.map((m) => ({ content: m.content, similarity: m.similarity })),
    });
  } catch (err) {
    console.error('Ask error:', err);

    if (err?.status === 503) {
      return res.status(503).json({
        error: 'The AI service is temporarily busy. Please wait a moment and try asking again.',
      });
    }

    res.status(500).json({ error: 'Something went wrong while answering the question.', details: err.message });
  }
});

export default router;