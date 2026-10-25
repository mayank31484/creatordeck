import { NextResponse } from 'next/server';
import { getAvailableVoices } from '@/lib/sarvam';

export async function GET() {
  try {
    const voices = await getAvailableVoices();
    return NextResponse.json({ voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch voices';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
