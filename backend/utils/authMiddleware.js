import { supabase } from './supabaseClient.js';

// Checks the "Authorization: Bearer <token>" header on incoming requests,
// verifies it with Supabase, and attaches the logged-in user to req.user.
// Any route using this middleware requires the user to be logged in.
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please log in to use this feature.' });
  }

  const token = authHeader.replace('Bearer ', '');

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Your session is invalid or expired. Please log in again.' });
  }

  req.user = data.user;
  next();
}
