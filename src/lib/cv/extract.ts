import { extractPdfText } from './pdf.ts';
import { extractDocxText } from './docx.ts';
import type { ExtractedCVDocument, CVExtractionOptions } from './types.ts';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_CHAR_COUNT = 40; // Reject empty/unreadable/image-only scans

/**
 * Extracts plain text from an in-memory PDF or DOCX buffer.
 * Enforces strict validation and cleans normalized whitespace.
 * Never persists or logs document contents.
 */
export async function extractCVText(
  buffer: Buffer,
  fileName: string,
  options?: CVExtractionOptions
): Promise<ExtractedCVDocument> {
  // 1. Validate presence and non-empty
  if (!buffer || buffer.length === 0) {
    throw new Error('The uploaded document is empty. Please upload a valid CV.');
  }

  // 2. Validate 5MB file size limit
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('File exceeds the maximum 5MB size limit. Please upload a smaller document.');
  }

  // 3. Resolve file type
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  let fileType: 'pdf' | 'docx';

  if (extension === 'pdf') {
    fileType = 'pdf';
  } else if (extension === 'docx') {
    fileType = 'docx';
  } else {
    throw new Error(`Unsupported file type ".${extension}". Only .pdf and .docx documents are supported.`);
  }

  // 4. In-memory extraction based on file type
  let rawText = '';
  if (fileType === 'pdf') {
    rawText = await extractPdfText(buffer);
  } else {
    rawText = await extractDocxText(buffer);
  }

  // 5. Clean and normalize text whitespace
  const cleanedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 6. Reject unreadable or scanned documents with no extractable text
  if (cleanedText.length < MIN_CHAR_COUNT) {
    throw new Error(
      'The uploaded document contains too little readable text. Please ensure it is not an image-only scan or password-protected.'
    );
  }

  return {
    text: cleanedText,
    fileName,
    fileType,
    characterCount: cleanedText.length
  };
}
