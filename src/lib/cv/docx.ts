import mammoth from 'mammoth';

/**
 * Extracts plain text from an in-memory DOCX buffer.
 * Does not write any files to disk.
 */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error('DOCX document is empty.');
  }

  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse DOCX document: ${msg}`);
  }
}
