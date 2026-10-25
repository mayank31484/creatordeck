import { NextRequest, NextResponse } from 'next/server';
import { generateSpeechScript } from '@/lib/sarvam';
import type { Slide } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { slides, tone } = (await request.json()) as {
      slides?: Slide[];
      tone?: string;
    };

    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json(
        { error: 'Slides array is required' },
        { status: 400 }
      );
    }

    const scripts = await generateSpeechScript(slides, tone || 'conversational');
    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('Error generating speech scripts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate speech scripts';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
