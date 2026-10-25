"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Slide } from "@/lib/types";

interface VoiceGeneratorProps {
  slides: Slide[];
  scripts: Record<string, string>;
  onVoiceGenerated: (audioChunks: string[]) => void;
}

const LANGUAGE_MAP: Record<string, string> = {
  English: "en-IN",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN",
  Kannada: "kn-IN",
  Bengali: "bn-IN",
  Marathi: "mr-IN",
  Gujarati: "gu-IN",
  Malayalam: "ml-IN",
  Punjabi: "pa-IN",
  Odia: "od-IN",
};

const LANGUAGES = [
  { name: "English", code: "en-IN", native: "English" },
  { name: "Hindi", code: "hi-IN", native: "हिन्दी" },
  { name: "Tamil", code: "ta-IN", native: "தமிழ்" },
  { name: "Telugu", code: "te-IN", native: "తెలుగు" },
  { name: "Kannada", code: "kn-IN", native: "ಕನ್ನಡ" },
  { name: "Bengali", code: "bn-IN", native: "বাংলা" },
  { name: "Marathi", code: "mr-IN", native: "मराठी" },
  { name: "Gujarati", code: "gu-IN", native: "ગુજરાતી" },
  { name: "Malayalam", code: "ml-IN", native: "മലയാളം" },
  { name: "Punjabi", code: "pa-IN", native: "ਪੰਜਾਬੀ" },
  { name: "Odia", code: "od-IN", native: "ଓଡ଼ିଆ" },
];

const SPEAKERS = [
  { id: "meera", name: "Meera", gender: "Female", desc: "Warm & Natural" },
  { id: "pavithra", name: "Pavithra", gender: "Female", desc: "Expressive & Melodic" },
  { id: "maitreyi", name: "Maitreyi", gender: "Female", desc: "Clear & Articulate" },
  { id: "arvind", name: "Arvind", gender: "Male", desc: "Deep & Narrative" },
  { id: "amol", name: "Amol", gender: "Male", desc: "Friendly & Engaging" },
  { id: "amartya", name: "Amartya", gender: "Male", desc: "Crisp & Authoritative" },
];

// Audio helper to convert base64 audio to Blob URL
const playAudio = (base64Audio: string) => {
  const byteCharacters = atob(base64Audio);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  return url;
};

// Split text into chunks matching TTS limits (max 450 chars)
function splitTextIntoChunks(text: string, maxLength: number = 450): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    if (trimmedSentence.length > maxLength) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      const words = trimmedSentence.split(/\s+/);
      let wordChunk = "";
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

  return chunks.length > 0 ? chunks : [text];
}

export default function VoiceGenerator({
  slides,
  scripts,
  onVoiceGenerated,
}: VoiceGeneratorProps) {
  // Voice selection states
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("meera");
  const [pitch, setPitch] = useState<number>(0); // -5 to 5, default 0
  const [pace, setPace] = useState<number>(1.0); // 0.5 to 2.0, default 1.0

  // Preview states
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Full generation states
  const [isGeneratingFull, setIsGeneratingFull] = useState<boolean>(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up object URLs on unmount or URL change
  useEffect(() => {
    return () => {
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }
    };
  }, [previewAudioUrl]);

  const targetLanguageCode = useMemo(() => {
    return LANGUAGE_MAP[selectedLanguage] || "en-IN";
  }, [selectedLanguage]);

  // Combined full speech text with natural pauses between slides
  const combinedText = useMemo(() => {
    return slides
      .map((slide) => {
        const script = (scripts[slide.id] || "").trim();
        if (!script) return "";
        // Ensure each slide ends with a period for a natural pause
        return script.endsWith(".") || script.endsWith("!") || script.endsWith("?")
          ? script
          : `${script}.`;
      })
      .filter(Boolean)
      .join(" ");
  }, [slides, scripts]);

  const totalWords = useMemo(() => {
    if (!combinedText) return 0;
    return combinedText.split(/\s+/).filter(Boolean).length;
  }, [combinedText]);

  // First slide text for quick testing
  const firstSlideText = useMemo(() => {
    if (slides.length === 0) return "";
    return (scripts[slides[0].id] || "").trim();
  }, [slides, scripts]);

  // Handler for Preview (Slide 1 audio)
  const handlePreviewVoice = async () => {
    if (!firstSlideText) {
      setPreviewError("No script available for Slide 1 to preview.");
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);

    try {
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: firstSlideText,
          targetLanguageCode,
          speaker: selectedSpeaker,
          pitch,
          pace,
          model: "bulbul:v2",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Generation failed (${response.status})`);
      }

      const data = await response.json();
      if (!data.audioChunks || data.audioChunks.length === 0) {
        throw new Error("No audio returned from voice API");
      }

      // Convert first chunk to blob URL
      const audioUrl = playAudio(data.audioChunks[0]);
      setPreviewAudioUrl(audioUrl);

      // Play audio automatically if possible
      setTimeout(() => {
        if (previewAudioRef.current) {
          previewAudioRef.current.currentTime = 0;
          previewAudioRef.current.play().catch(() => {
            // Autoplay might be blocked by browser policy, user can click play
          });
        }
      }, 100);
    } catch (err) {
      console.error("Preview error:", err);
      setPreviewError(err instanceof Error ? err.message : "Failed to preview voice");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Handler for generating all speech scripts combined
  const handleGenerateFullAudio = async () => {
    if (!combinedText) {
      setGenerationError("Please enter speech scripts before generating voice.");
      return;
    }

    setIsGeneratingFull(true);
    setGenerationError(null);
    setProgressPercent(0);

    const chunks = splitTextIntoChunks(combinedText);
    const totalChunks = chunks.length;
    const collectedAudioChunks: string[] = [];

    try {
      for (let i = 0; i < totalChunks; i++) {
        const currentChunkNum = i + 1;
        setProgressStatus(`Generating chunk ${currentChunkNum} of ${totalChunks}...`);
        setProgressPercent(Math.round(((i) / totalChunks) * 100));

        const response = await fetch("/api/generate-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chunks[i],
            targetLanguageCode,
            speaker: selectedSpeaker,
            pitch,
            pace,
            model: "bulbul:v2",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error ||
              `Failed generating chunk ${currentChunkNum} of ${totalChunks}`
          );
        }

        const data = await response.json();
        if (Array.isArray(data.audioChunks)) {
          collectedAudioChunks.push(...data.audioChunks);
        } else if (data.audio) {
          collectedAudioChunks.push(data.audio);
        }
      }

      setProgressPercent(100);
      setProgressStatus("Audio generation completed!");

      // Final step: pass audio chunks to parent callback
      onVoiceGenerated(collectedAudioChunks);
    } catch (err) {
      console.error("Full voice generation error:", err);
      setGenerationError(
        err instanceof Error ? err.message : "Failed to generate full audio. Please try again."
      );
    } finally {
      setIsGeneratingFull(false);
    }
  };

  const selectedSpeakerObj = SPEAKERS.find((s) => s.id === selectedSpeaker);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Title & Intro */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-3 text-xs font-semibold text-violet-400">
              <span>🔊</span> Step 4: Voice Synthesis
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Select Voice & Generate Narration
            </h2>
            <p className="text-sm sm:text-base text-gray-400 mt-1 max-w-xl leading-relaxed">
              Powered by Sarvam AI Bulbul v2. Choose an Indian language, voice persona,
              and adjust pitch or speed for the most realistic presentation delivery.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-gray-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Model: <strong className="text-white font-mono">bulbul:v2</strong></span>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Voice Customization Settings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-7 space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
              <span>🎛️</span> Voice Options
            </h3>

            {/* Language Selector */}
            <div>
              <label
                htmlFor="language-select"
                className="block text-sm font-medium text-gray-200 mb-2 flex items-center justify-between"
              >
                <span>Language</span>
                <span className="text-xs text-violet-400 font-mono">
                  {targetLanguageCode}
                </span>
              </label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm transition-colors cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.name} value={lang.name} className="bg-gray-900 text-white">
                    {lang.name} ({lang.native}) — {lang.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker Selector */}
            <div>
              <label
                htmlFor="speaker-select"
                className="block text-sm font-medium text-gray-200 mb-2 flex items-center justify-between"
              >
                <span>Speaker Voice</span>
                <span className="text-xs text-gray-400">
                  {selectedSpeakerObj?.gender} • {selectedSpeakerObj?.desc}
                </span>
              </label>
              <select
                id="speaker-select"
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm transition-colors cursor-pointer"
              >
                <optgroup label="Female Speakers" className="bg-gray-900 text-violet-400 font-semibold">
                  {SPEAKERS.filter((s) => s.gender === "Female").map((speaker) => (
                    <option key={speaker.id} value={speaker.id} className="text-white font-normal">
                      {speaker.name} (Female) — {speaker.desc}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Male Speakers" className="bg-gray-900 text-violet-400 font-semibold">
                  {SPEAKERS.filter((s) => s.gender === "Male").map((speaker) => (
                    <option key={speaker.id} value={speaker.id} className="text-white font-normal">
                      {speaker.name} (Male) — {speaker.desc}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Pitch & Pace Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Pitch Slider */}
              <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="pitch-slider" className="text-sm font-medium text-gray-200">
                    Pitch
                  </label>
                  <span className="text-xs font-mono font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                    {pitch > 0 ? `+${pitch}` : pitch}
                  </span>
                </div>
                <input
                  id="pitch-slider"
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
                <div className="flex justify-between text-[11px] text-gray-500 mt-2">
                  <span>-5 (Deeper)</span>
                  <span className="text-gray-400">0 (Normal)</span>
                  <span>+5 (Higher)</span>
                </div>
              </div>

              {/* Pace Slider */}
              <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="pace-slider" className="text-sm font-medium text-gray-200">
                    Pace (Speed)
                  </label>
                  <span className="text-xs font-mono font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                    {pace.toFixed(1)}x
                  </span>
                </div>
                <input
                  id="pace-slider"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={pace}
                  onChange={(e) => setPace(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
                <div className="flex justify-between text-[11px] text-gray-500 mt-2">
                  <span>0.5x (Slower)</span>
                  <span className="text-gray-400">1.0x (Normal)</span>
                  <span>2.0x (Faster)</span>
                </div>
              </div>
            </div>

            {/* Quick Reset Controls */}
            {(pitch !== 0 || pace !== 1.0) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPitch(0);
                    setPace(1.0);
                  }}
                  className="text-xs text-gray-400 hover:text-violet-400 transition-colors"
                >
                  ↺ Reset pitch & pace to default
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Audio Preview & Generation */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Voice Preview Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>🎧</span> Voice Preview
              </h3>
              <span className="text-xs text-gray-400 bg-gray-950 px-2.5 py-1 rounded-md border border-gray-800">
                Slide 1 Sample
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Test how <strong className="text-gray-200">{selectedSpeakerObj?.name}</strong> sounds
              with your current settings on the first slide before generating the full presentation.
            </p>

            {/* Preview Text Box */}
            <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-3 text-xs text-gray-300 italic line-clamp-3">
              &ldquo;{firstSlideText || "No text available for Slide 1..."}&rdquo;
            </div>

            {/* Preview Button */}
            <button
              type="button"
              onClick={handlePreviewVoice}
              disabled={isPreviewLoading || !firstSlideText || isGeneratingFull}
              className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                isPreviewLoading || !firstSlideText || isGeneratingFull
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-gray-800 hover:bg-gray-700 text-violet-300 border border-violet-500/30 hover:border-violet-500/60 shadow-sm cursor-pointer"
              }`}
            >
              {isPreviewLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Sample...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span>Preview Audio (Slide 1)</span>
                </>
              )}
            </button>

            {previewError && (
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <span className="text-red-400">⚠️</span>
                <span>{previewError}</span>
              </div>
            )}

            {/* Audio Player */}
            {previewAudioUrl && (
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                <div className="text-xs text-gray-400 font-medium flex items-center justify-between">
                  <span>Audio Preview Player</span>
                  <span className="text-[11px] text-green-400 font-mono">Ready to play</span>
                </div>
                <audio
                  ref={previewAudioRef}
                  controls
                  src={previewAudioUrl}
                  className="w-full h-10 rounded-lg filter invert hue-rotate-180 brightness-95 contrast-125"
                />
              </div>
            )}
          </div>

          {/* Full Generation Card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>⚡</span> Full Presentation Audio
              </h3>
            </div>

            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span>Total Slides:</span>
                <span className="font-semibold text-gray-200">{slides.length}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span>Total Words:</span>
                <span className="font-semibold text-gray-200">{totalWords}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-800/60">
                <span>Estimated Chunks:</span>
                <span className="font-semibold text-gray-200">
                  {splitTextIntoChunks(combinedText).length}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Selected Voice:</span>
                <span className="font-semibold text-violet-400">
                  {selectedSpeakerObj?.name} ({selectedLanguage})
                </span>
              </div>
            </div>

            {/* Progress Display */}
            {isGeneratingFull && (
              <div className="bg-gray-950 border border-violet-500/30 rounded-xl p-4 space-y-3 animate-pulse">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-violet-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
                    {progressStatus || "Generating audio..."}
                  </span>
                  <span className="font-mono text-violet-400">{progressPercent}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-violet-600 to-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {generationError && (
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2">
                <span className="text-red-400">⚠️</span>
                <span>{generationError}</span>
              </div>
            )}

            {/* Generate Full Audio Button */}
            <button
              type="button"
              onClick={handleGenerateFullAudio}
              disabled={isGeneratingFull || totalWords === 0}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all ${
                isGeneratingFull || totalWords === 0
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              }`}
            >
              {isGeneratingFull ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing Voice...</span>
                </>
              ) : (
                <>
                  <span>Generate Full Audio 🔊</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
