import { createWorker } from 'tesseract.js';

/**
 * Performs OCR on an image buffer and returns the extracted text.
 */
export async function performOCR(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker('eng');
  
  try {
    const { data: { text } } = await worker.recognize(imageBuffer);
    return text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to perform OCR on the document');
  } finally {
    await worker.terminate();
  }
}
