/**
 * Core type definitions for CV text extraction.
 * Processed strictly in-memory during request lifecycle.
 */

export interface ExtractedCVDocument {
  text: string;
  fileName: string;
  fileType: 'pdf' | 'docx';
  characterCount: number;
}

export interface CVExtractionOptions {
  fileName: string;
  fileType?: string;
  fileSize?: number;
}
