export interface Slide {
  id: string;
  title: string;
  bullets: string[];
  icon: string; // emoji icon for the slide
  gradient: string; // tailwind gradient classes
}

export interface Presentation {
  id: string;
  topic: string;
  slides: Slide[];
  speechScripts: Record<string, string>; // slideId -> speech text
  createdAt: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  language: string;
  languageCode: string;
}

export interface GenerateSlidesRequest {
  topic: string;
  numberOfSlides: number;
}

export interface GenerateSpeechRequest {
  slides: Slide[];
  tone: string;
}

export interface GenerateVoiceRequest {
  text: string;
  targetLanguageCode: string;
  speaker: string;
  pitch: number;
  pace: number;
  model: string;
}

export type AppStep = 'topic' | 'slides' | 'speech' | 'voice' | 'preview';
