import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source to the local bundled worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer
  });
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  const cleaned = cleanText(fullText);
  console.log(`Extracted text length: ${fullText.length}`);
  console.log(`Cleaned text length: ${cleaned.length}`);

  if (cleaned.length < 50) {
    throw new Error('No readable text detected in this document.');
  }

  // Truncate to prevent token overflow (approx 6000 chars)
  return cleaned.slice(0, 6000);
}

export async function extractTextFromImage(file: File): Promise<string> {
  const { data: { text } } = await Tesseract.recognize(file, 'eng');
  const cleaned = cleanText(text);
  
  if (cleaned.length < 50) {
    throw new Error('No readable text detected in this document.');
  }

  return cleaned.slice(0, 6000);
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Remove excessive whitespace
    .replace(/[^\x20-\x7E\n]/g, "") // Remove non-printable characters
    .trim();
}
