import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

export async function extractTextFromFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase();
  let text = '';

  if (fileName.endsWith('.pdf')) {
    text = await extractTextFromPDF(file);
  } else if (fileName.endsWith('.docx')) {
    text = await extractTextFromDocx(file);
  } else if (fileName.endsWith('.pptx') || fileName.endsWith('.ppsx') || fileName.endsWith('.potx')) {
    text = await extractTextFromPptx(file);
  } else if (fileName.endsWith('.odt') || fileName.endsWith('.odp')) {
    text = await extractTextFromOdt(file);
  } else if (fileName.endsWith('.txt')) {
    text = await file.text();
  } else if (fileName.endsWith('.rtf')) {
    text = await extractTextFromRtf(file);
  } else if (fileName.endsWith('.pages') || fileName.endsWith('.key')) {
    text = await extractTextFromZipBased(file);
  } else if (fileName.endsWith('.doc') || fileName.endsWith('.ppt')) {
    text = await extractTextFromBinary(file);
  } else {
    try {
      text = await extractTextFromImage(file);
    } catch (e) {
      text = await file.text();
    }
  }

  const cleaned = cleanText(text);
  if (cleaned.length < 20) {
    throw new Error('The forge could not extract enough readable text from this file.');
  }

  return cleaned.slice(0, 10000);
}

export const extractTextFromPDF = async (file: File): Promise<string> => {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
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
  return fullText;
};

async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractTextFromPptx(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  let fullText = '';
  
  const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
  
  for (const slideFile of slideFiles) {
    const content = await zip.file(slideFile)?.async('text');
    if (content) {
      const matches = content.match(/<a:t>(.*?)<\/a:t>/g);
      if (matches) {
        fullText += matches.map(m => m.replace(/<a:t>|<\/a:t>/g, '')).join(' ') + '\n';
      }
    }
  }
  return fullText;
}

async function extractTextFromOdt(file: File): Promise<string> {
  const JSZip = (await import('jszip')).default;
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const contentXml = await zip.file('content.xml')?.async('text');
  if (!contentXml) return '';
  return contentXml.replace(/<[^>]+>/g, ' ');
}

async function extractTextFromRtf(file: File): Promise<string> {
  const text = await file.text();
  return text.replace(/\\([a-z]{1,32})(-?\d{1,10})?[ ]?|\\'([0-9a-f]{2})|\\\{|\\\}|\\/g, ' ');
}

async function extractTextFromZipBased(file: File): Promise<string> {
  try {
    const JSZip = (await import('jszip')).default;
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    let text = '';
    for (const name of Object.keys(zip.files)) {
      if (name.endsWith('.xml') || name.endsWith('.txt') || name.includes('Document')) {
        const content = await zip.file(name)?.async('text');
        if (content) text += content.replace(/<[^>]+>/g, ' ') + ' ';
      }
    }
    return text;
  } catch (e) {
    return await file.text();
  }
}

async function extractTextFromBinary(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let text = '';
  for (let i = 0; i < uint8.length; i++) {
    if (uint8[i] >= 32 && uint8[i] <= 126) {
      text += String.fromCharCode(uint8[i]);
    } else if (uint8[i] === 10 || uint8[i] === 13) {
      text += ' ';
    }
  }
  return text;
}

export async function extractTextFromImage(file: File): Promise<string> {
  const Tesseract = (await import('tesseract.js')).default;
  const { data: { text } } = await Tesseract.recognize(file, 'eng');
  return text;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "")
    .trim();
}
