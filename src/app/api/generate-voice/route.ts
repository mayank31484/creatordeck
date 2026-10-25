import { NextRequest, NextResponse } from 'next/server';
import { generateVoice } from '@/lib/sarvam';

function splitTextIntoChunks(text: string, maxLength: number = 450): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    // If an individual sentence exceeds maxLength, split it into word-level pieces
    if (trimmedSentence.length > maxLength) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      const words = trimmedSentence.split(/\s+/);
      let wordChunk = '';
      for (const word of words) {
        if ((wordChunk ? `${wordChunk} ${word}` : word).length > maxLength) {
          if (wordChunk.trim()) chunks.push(wordChunk.trim());
          wordChunk = word;
        } else {
          wordChunk = wordChunk ? `${wordChunk} ${word}` : word;
        }
      }
      if (wordChunk.trim()) {
        current = wordChunk.trim();
      }
      continue;
    }

    if ((current ? `${current} ${trimmedSentence}` : trimmedSentence).length > maxLength) {
      if (current.trim()) chunks.push(current.trim());
      current = trimmedSentence;
    } else {
      current = current ? `${current} ${trimmedSentence}` : trimmedSentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const { text, targetLanguageCode, speaker, pitch, pace, model } = await request.json();
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const chunks = splitTextIntoChunks(text);
    const audioChunks: string[] = [];

    for (const chunk of chunks) {
      const audio = await generateVoice(chunk, {
        targetLanguageCode,
        speaker,
        pitch,
        pace,
        model,
      });
      if (audio) {
        audioChunks.push(audio);
      }
    }

    return NextResponse.json({ audioChunks });
  } catch (error) {
    console.error('Error generating voice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate voice';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
