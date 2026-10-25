import { NextRequest, NextResponse } from 'next/server';
import { generateSlideContent } from '@/lib/sarvam';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, numberOfSlides } = body;

    if (!topic || typeof topic !== 'string' || topic.trim() === '') {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    const slideCount = typeof numberOfSlides === 'number' && numberOfSlides > 0
      ? numberOfSlides
      : 5;

    const slides = await generateSlideContent(topic.trim(), slideCount);
    return NextResponse.json({ slides });
  } catch (error) {
    console.error('Error generating slides:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate slides';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
