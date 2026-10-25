"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Slide } from "@/lib/types";

interface SpeechEditorProps {
  slides: Slide[];
  scripts: Record<string, string>; // slideId -> speech text
  onScriptsChange: (scripts: Record<string, string>) => void;
  onContinue: () => void;
}

export default function SpeechEditor({
  slides,
  scripts,
  onScriptsChange,
  onContinue,
}: SpeechEditorProps) {
  const [listeningSlideId, setListeningSlideId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const getWordCount = (text?: string): number => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const totalWords = useMemo(() => {
    return slides.reduce((acc, slide) => {
      return acc + getWordCount(scripts[slide.id]);
    }, 0);
  }, [slides, scripts]);

  // Speaking time estimate: approx words / 150 = minutes
  const totalMinutes = totalWords / 150;
  const estimatedSpeakingTime = useMemo(() => {
    if (totalWords === 0) return "0 sec";
    const totalSeconds = Math.round(totalMinutes * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `~${seconds}s`;
    return seconds > 0 ? `~${minutes}m ${seconds}s` : `~${minutes} min`;
  }, [totalWords, totalMinutes]);

  const handleScriptChange = (slideId: string, value: string) => {
    onScriptsChange({
      ...scripts,
      [slideId]: value,
    });
  };

  const toggleDictation = (slideId: string) => {
    // If currently listening to this slide, stop it
    if (listeningSlideId === slideId) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setListeningSlideId(null);
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setListeningSlideId(slideId);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          const currentText = scripts[slideId] || "";
          const separator =
            currentText.length > 0 && !currentText.endsWith(" ") ? " " : "";
          const updated = `${currentText}${separator}${transcript}`.trim();
          handleScriptChange(slideId, updated);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setListeningSlideId(null);
      };

      recognition.onend = () => {
        setListeningSlideId(null);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setListeningSlideId(null);
    }
  };

  const hasAnyScripts = totalWords > 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header and Stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1 mb-3 text-xs font-semibold text-violet-400">
              <span>💬</span> Step 3: Speech Narration
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Edit Voiceover Scripts
            </h2>
            <p className="text-sm sm:text-base text-gray-400 mt-1 max-w-xl leading-relaxed">
              Review and customize the natural speech script for each slide. You can
              edit the text directly or tap the microphone to dictate your own words.
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 bg-gray-950/70 border border-gray-800 rounded-xl p-4 sm:p-5">
            <div className="text-center px-2">
              <div className="text-xs text-gray-400 font-medium mb-1">
                Total Words
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {totalWords}
              </div>
            </div>
            <div className="text-center px-2 border-x border-gray-800">
              <div className="text-xs text-gray-400 font-medium mb-1">
                Est. Speaking Time
              </div>
              <div className="text-xl sm:text-2xl font-bold text-violet-400">
                {estimatedSpeakingTime}
              </div>
              <div className="text-[10px] text-gray-500">~150 wpm</div>
            </div>
            <div className="text-center px-2">
              <div className="text-xs text-gray-400 font-medium mb-1">
                Slides
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white">
                {slides.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Speech Cards */}
      <div className="space-y-6">
        {slides.map((slide, index) => {
          const scriptText = scripts[slide.id] || "";
          const wordCount = getWordCount(scriptText);
          const isListening = listeningSlideId === slide.id;
          const slideDurationSec = Math.round((wordCount / 150) * 60);

          return (
            <div
              key={slide.id}
              className={`bg-gray-900 border rounded-2xl p-6 transition-all duration-200 ${
                isListening
                  ? "border-violet-500 shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30"
                  : "border-gray-800 hover:border-gray-700"
              }`}
            >
              {/* Slide Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl shrink-0">
                    {slide.icon || "💡"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">
                        Slide {index + 1} of {slides.length}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white text-base sm:text-lg">
                      {slide.title}
                    </h3>
                  </div>
                </div>

                {/* Header Controls: Word count & Mic dictation */}
                <div className="flex items-center gap-3">
                  <div className="text-xs bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span>
                      <strong className="text-gray-200 font-semibold">
                        {wordCount}
                      </strong>{" "}
                      words
                    </span>
                    {wordCount > 0 && (
                      <span className="text-gray-500">
                        (~{slideDurationSec}s)
                      </span>
                    )}
                  </div>

                  {/* Dictation Button */}
                  <button
                    type="button"
                    onClick={() => toggleDictation(slide.id)}
                    title={
                      isListening
                        ? "Stop listening"
                        : "Dictate with microphone (Web Speech API)"
                    }
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isListening
                        ? "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse shadow-sm shadow-red-500/30"
                        : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-violet-500/50"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                        <span>Listening...</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5 text-violet-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        </svg>
                        <span>Dictate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Textarea for Speech Script */}
              <div className="relative">
                <textarea
                  value={scriptText}
                  onChange={(e) => handleScriptChange(slide.id, e.target.value)}
                  placeholder={`Write or dictate what the narrator will say for "${slide.title}"...`}
                  rows={4}
                  className="w-full bg-gray-950/80 border border-gray-800 rounded-xl p-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm sm:text-base leading-relaxed resize-y transition-colors"
                />

                {isListening && (
                  <div className="absolute top-3 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-red-950/80 border border-red-500/30 rounded-md text-[11px] text-red-300 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                    Recording speech... speak clearly
                  </div>
                )}
              </div>

              {/* Card Footer: Context hint */}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1.5">
                  <span>💡</span>
                  <span>
                    Conversational scripts sound best when spoken at ~150 words
                    per minute.
                  </span>
                </div>
                {scriptText && (
                  <button
                    type="button"
                    onClick={() => handleScriptChange(slide.id, "")}
                    className="text-gray-500 hover:text-gray-400 text-xs transition-colors"
                  >
                    Clear text
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Action Footer */}
      <div className="sticky bottom-4 z-20 bg-gray-950/90 backdrop-blur-md border border-gray-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
        <div className="text-sm text-gray-400 flex items-center gap-3">
          <span className="text-base">🎙️</span>
          <span>
            Ready to convert{" "}
            <strong className="text-white font-medium">{totalWords} words</strong>{" "}
            ({estimatedSpeakingTime}) into voice narration
          </span>
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={!hasAnyScripts}
          className={`w-full sm:w-auto px-7 py-3 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all ${
            hasAnyScripts
              ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          }`}
        >
          <span>Continue to Voice Generation</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
