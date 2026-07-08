// Splits text into fixed-size chunks (by word count) for embedding.
// Keeping this simple on purpose (Day 3 task) - no fancy sentence-aware splitting yet.
export function chunkText(text, chunkSize = 300) {
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }

  return chunks;
}
