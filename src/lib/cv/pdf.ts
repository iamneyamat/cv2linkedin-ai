import { extractText } from 'unpdf';

/**
 * Extracts plain text from an in-memory PDF buffer.
 * Does not write any files to disk.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error('PDF document is empty.');
  }

  try {
    const uint8 = new Uint8Array(buffer);
    const { text } = await extractText(uint8);
    const combined = Array.isArray(text) ? text.join('\n') : (text || '');
    return combined;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse PDF document: ${msg}`);
  }
}
