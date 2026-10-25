import { Slide, VoiceOption } from './types';
import { getRandomGradient } from './gradients';

const SARVAM_BASE_URL = 'https://api.sarvam.ai';

export const AVAILABLE_SPEAKERS = [
  { id: 'priya', name: 'Priya', gender: 'Female' },
  { id: 'ritu', name: 'Ritu', gender: 'Female' },
  { id: 'neha', name: 'Neha', gender: 'Female' },
  { id: 'kavya', name: 'Kavya', gender: 'Female' },
  { id: 'shreya', name: 'Shreya', gender: 'Female' },
  { id: 'ishita', name: 'Ishita', gender: 'Female' },
  { id: 'shubh', name: 'Shubh', gender: 'Male' },
  { id: 'aditya', name: 'Aditya', gender: 'Male' },
  { id: 'rahul', name: 'Rahul', gender: 'Male' },
  { id: 'dev', name: 'Dev', gender: 'Male' },
  { id: 'rohan', name: 'Rohan', gender: 'Male' },
  { id: 'amit', name: 'Amit', gender: 'Male' },
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'bn-IN', name: 'Bengali' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' },
  { code: 'mr-IN', name: 'Marathi' },
  { code: 'od-IN', name: 'Odia' },
  { code: 'pa-IN', name: 'Punjabi' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' },
  { code: 'gu-IN', name: 'Gujarati' },
  { code: 'en-IN', name: 'English (India)' },
] as const;

function getApiKey(): string {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error('SARVAM_API_KEY environment variable is not configured');
  }
  return apiKey;
}

function extractJson<T>(content: string): T {
  let cleaned = content.trim();

  // Remove markdown code fences if wrapped
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }

  // Attempt direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt bracket extraction for array
    const firstBracket = cleaned.indexOf('[');
    const lastBracket = cleaned.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1)) as T;
      } catch {
        // Continue to brace check
      }
    }

    // Attempt brace extraction for object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)) as T;
      } catch {
        // Fall through to error
      }
    }

    throw new Error(`Failed to parse JSON response from Sarvam AI: ${content.substring(0, 300)}`);
  }
}

async function callSarvamChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${SARVAM_BASE_URL}/v2/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      model: 'sarvam-105b',
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam Chat Completion failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Sarvam Chat Completion returned an empty response');
  }

  return content;
}

/**
 * Generates structured presentation slides using Sarvam AI Chat Completion.
 */
export async function generateSlideContent(topic: string, numberOfSlides: number): Promise<Slide[]> {
  const systemPrompt = `You are an expert presentation designer and YouTube content strategist.
Your task is to generate concise, high-impact presentation slides for a video creator.
You MUST reply ONLY with a valid JSON array of slide objects.
Do not wrap in anything other than JSON. No markdown ticks, no preamble, no explanations.`;

  const userPrompt = `Create a presentation deck with exactly ${numberOfSlides} slides for a YouTube video about: "${topic}".

Format your response as a JSON array of slide objects with this exact structure:
[
  {
    "title": "Slide Title Here",
    "bullets": [
      "First key takeaway or insight",
      "Second concise explanation point",
      "Third actionable or memorable detail"
    ],
    "icon": "🚀"
  }
]

Requirements:
- Provide exactly ${numberOfSlides} slides.
- Each slide must have 3 to 4 concise, informative bullet points.
- "icon" must be a single relevant, expressive emoji that represents the slide's core theme.
- Return ONLY valid JSON.`;

  const responseText = await callSarvamChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  interface RawSlide {
    title?: string;
    bullets?: string[];
    icon?: string;
  }

  let rawSlides = extractJson<RawSlide[] | { slides?: RawSlide[] }>(responseText);

  if (!Array.isArray(rawSlides)) {
    if (rawSlides && Array.isArray(rawSlides.slides)) {
      rawSlides = rawSlides.slides;
    } else {
      throw new Error('Sarvam failed to generate valid slide array data');
    }
  }

  return rawSlides.map((slide, index) => ({
    id: `slide-${index + 1}`,
    title: slide.title?.trim() || `Slide ${index + 1}`,
    bullets:
      Array.isArray(slide.bullets) && slide.bullets.length > 0
        ? slide.bullets.map((b) => String(b).trim())
        : ['Key point for this slide'],
    icon: slide.icon?.trim() || '💡',
    gradient: getRandomGradient(index),
  }));
}

/**
 * Generates natural, conversational YouTube voiceover scripts for presentation slides.
 */
export async function generateSpeechScript(
  slides: Slide[],
  tone: string = 'conversational and engaging'
): Promise<Record<string, string>> {
  const systemPrompt = `You are a professional YouTube scriptwriter.
Convert presentation slides into natural, engaging spoken scripts for video voiceover.
You MUST reply ONLY with a valid JSON object mapping slide IDs to the voiceover script.
Do not include markdown ticks, preamble, or any text other than the JSON object.`;

  const slideSummaries = slides
    .map(
      (slide, index) =>
        `Slide ID: "${slide.id}" (Slide #${index + 1})\nTitle: ${slide.title}\nBullets:\n${slide.bullets
          .map((b) => `- ${b}`)
          .join('\n')}`
    )
    .join('\n\n');

  const userPrompt = `Write a voiceover narration script for each of the following presentation slides.
Desired Tone: ${tone}

Slides:
${slideSummaries}

Requirements:
- Return a JSON object where the keys are the exact Slide IDs (${slides.map((s) => `"${s.id}"`).join(', ')}).
- Each value must be a natural, conversational speech script (around 2-4 sentences, ~30-60 seconds when spoken) suitable for a YouTube creator presenting this slide to their audience.
- Speak directly to the viewer (e.g. "Welcome back", "Let's take a look at", "Notice how...").
- Do NOT simply read bullet points verbatim. Turn them into fluid, spoken dialogue.
- Return ONLY valid JSON.`;

  const responseText = await callSarvamChat([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const parsed = extractJson<Record<string, string>>(responseText);
  const scripts: Record<string, string> = {};

  slides.forEach((slide, index) => {
    const matchedScript =
      parsed[slide.id] ||
      parsed[`slide-${index + 1}`] ||
      parsed[String(index + 1)] ||
      parsed[String(index)];

    if (matchedScript && typeof matchedScript === 'string') {
      scripts[slide.id] = matchedScript.trim();
    } else {
      scripts[slide.id] = `In this slide on ${slide.title}, we explore key insights: ${slide.bullets.join(', ')}.`;
    }
  });

  return scripts;
}

/**
 * Generates speech audio using Sarvam AI Bulbul Text-to-Speech API.
 * Returns base64 encoded audio string (WAV format).
 */
export async function generateVoice(
  text: string,
  options: {
    targetLanguageCode: string;
    speaker: string;
    pitch: number;
    pace: number;
    model: string;
  }
): Promise<string> {
  const apiKey = getApiKey();

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required to generate speech audio');
  }

  const response = await fetch(`${SARVAM_BASE_URL}/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Subscription-Key': apiKey,
    },
    body: JSON.stringify({
      inputs: [text.trim()],
      target_language_code: options.targetLanguageCode || 'hi-IN',
      speaker: options.speaker || 'meera',
      pitch: typeof options.pitch === 'number' ? options.pitch : 0,
      pace: typeof options.pace === 'number' ? options.pace : 1.0,
      loudness: 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      model: options.model || 'bulbul:v2',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sarvam Text-to-Speech failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const audioBase64 = data.audios?.[0];

  if (!audioBase64) {
    throw new Error('Sarvam Text-to-Speech did not return any audio data');
  }

  return audioBase64;
}

/**
 * Returns available voice options with speaker names, gender, and language.
 */
export function getAvailableVoices(): VoiceOption[] {
  return [
    {
      id: 'meera',
      name: 'Meera (Warm & Articulate)',
      gender: 'Female',
      language: 'Hindi & Multilingual',
      languageCode: 'hi-IN',
    },
    {
      id: 'pavithra',
      name: 'Pavithra (Expressive & Melodic)',
      gender: 'Female',
      language: 'Tamil & Multilingual',
      languageCode: 'ta-IN',
    },
    {
      id: 'maitreyi',
      name: 'Maitreyi (Clear & Professional)',
      gender: 'Female',
      language: 'Bengali & Multilingual',
      languageCode: 'bn-IN',
    },
    {
      id: 'arvind',
      name: 'Arvind (Deep & Narrative)',
      gender: 'Male',
      language: 'Hindi & Multilingual',
      languageCode: 'hi-IN',
    },
    {
      id: 'amol',
      name: 'Amol (Energetic & Friendly)',
      gender: 'Male',
      language: 'Marathi & Multilingual',
      languageCode: 'mr-IN',
    },
    {
      id: 'amartya',
      name: 'Amartya (Crisp & Authoritative)',
      gender: 'Male',
      language: 'English (India) & Multilingual',
      languageCode: 'en-IN',
    },
  ];
}
