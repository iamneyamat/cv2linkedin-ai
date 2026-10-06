import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCVText } from './extract.ts';

test('extractCVText rejects files larger than 5MB', async () => {
  const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 10);
  await assert.rejects(
    async () => {
      await extractCVText(largeBuffer, 'resume.pdf');
    },
    {
      name: 'Error',
      message: /5MB/
    }
  );
});

test('extractCVText rejects unsupported file extensions', async () => {
  const buf = Buffer.from('Some text');
  await assert.rejects(
    async () => {
      await extractCVText(buf, 'resume.txt');
    },
    {
      name: 'Error',
      message: /unsupported/i
    }
  );
});

test('extractCVText rejects empty buffers', async () => {
  const emptyBuf = Buffer.alloc(0);
  await assert.rejects(
    async () => {
      await extractCVText(emptyBuf, 'resume.pdf');
    },
    {
      name: 'Error',
      message: /empty/i
    }
  );
});

test('extractCVText rejects documents with less than 40 readable characters', async () => {
  await assert.rejects(
    async () => {
      const smallBuf = Buffer.from('%PDF-1.4 minimal');
      await extractCVText(smallBuf, 'resume.pdf');
    },
    {
      name: 'Error'
    }
  );
});

test('extractCVText successfully extracts text from valid PDF document', async () => {
  const minimalPdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 77 >> stream
BT /F1 24 Tf 100 700 Td (Senior Software Engineer with 8 years of cloud engineering and TypeScript experience) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000388 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
466
%%EOF`;

  const buf = Buffer.from(minimalPdf);
  const result = await extractCVText(buf, 'senior_engineer_cv.pdf');

  assert.equal(result.fileName, 'senior_engineer_cv.pdf');
  assert.equal(result.fileType, 'pdf');
  assert.ok(result.characterCount >= 40);
  assert.ok(result.text.includes('Senior Software Engineer'));
});
