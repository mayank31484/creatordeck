"use client";

import React, { useState, useRef } from "react";

interface TopicInputProps {
  onSubmit: (topic: string, numberOfSlides: number) => void;
  isLoading: boolean;
}

const EXAMPLE_TOPICS = [
  "AI in Healthcare",
  "Climate Change Solutions",
  "History of Space Exploration",
  "The Future of Electric Vehicles",
  "Healthy Eating Habits",
];

export default function TopicInput({ onSubmit, isLoading }: TopicInputProps) {
  const [topic, setTopic] = useState("");
  const [numberOfSlides, setNumberOfSlides] = useState(5);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startDictation = () => {
    // If already listening, stop it
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTopic((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognition.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsListening(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    onSubmit(topic.trim(), numberOfSlides);
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-3">
          <span>✨</span>
          <span>Step 1: Deck Ideation</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
          What is your presentation about?
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
          Enter a topic, summary, or bulleted outline. Sarvam AI will create
          structured, beautifully formatted slides for your video.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Topic Input Box */}
        <div className="relative bg-gray-900/80 border border-gray-800 rounded-2xl p-4 md:p-5 shadow-2xl transition-all focus-within:border-violet-500/70 focus-within:ring-2 focus-within:ring-violet-500/20">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. 5 Mind-Blowing AI Tools for Video Creators in 2026, including workflow improvements, voice cloning, and auto-editing..."
            rows={4}
            disabled={isLoading}
            className="w-full bg-transparent text-gray-100 placeholder-gray-500 resize-none text-base md:text-lg focus:outline-none disabled:opacity-60 leading-relaxed pr-12"
          />

          {/* Voice Input Button inside input area */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-800/80 mt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={startDictation}
                title={
                  isListening
                    ? "Click to stop dictation"
                    : "Click to speak your topic"
                }
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isListening
                    ? "bg-red-500/20 text-red-300 border border-red-500/50 animate-pulse"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:text-white"
                }`}
              >
                <svg
                  className={`w-3.5 h-3.5 ${isListening ? "text-red-400" : ""}`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
                <span>{isListening ? "Listening... (Click to stop)" : "Voice Dictate"}</span>
              </button>
              {isListening && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Speak now...
                </span>
              )}
            </div>

            <div className="text-xs text-gray-500">
              {topic.length} characters
            </div>
          </div>
        </div>

        {/* Number of Slides Selector */}
        <div className="bg-gray-900/50 border border-gray-800/80 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <label
                htmlFor="num-slides"
                className="text-sm font-semibold text-gray-200 block"
              >
                Number of Slides
              </label>
              <span className="text-xs text-gray-400">
                Choose between 4 to 6 slides for optimal video pacing
              </span>
            </div>

            {/* Quick selector pill buttons */}
            <div className="flex items-center gap-1 bg-gray-800/80 p-1 rounded-lg border border-gray-700">
              {[4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  disabled={isLoading}
                  onClick={() => setNumberOfSlides(num)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    numberOfSlides === num
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {num} slides
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              id="num-slides"
              type="range"
              min={4}
              max={6}
              step={1}
              value={numberOfSlides}
              onChange={(e) => setNumberOfSlides(Number(e.target.value))}
              disabled={isLoading}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-violet-500 disabled:opacity-50"
            />
            <span className="text-sm font-mono font-bold text-violet-400 w-8 text-right">
              {numberOfSlides}
            </span>
          </div>
        </div>

        {/* Example Topics */}
        <div className="space-y-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">
            Or try an example topic:
          </span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_TOPICS.map((example) => (
              <button
                key={example}
                type="button"
                disabled={isLoading}
                onClick={() => setTopic(example)}
                className="text-xs bg-gray-900/60 hover:bg-gray-800 text-gray-300 hover:text-violet-300 border border-gray-800 hover:border-violet-500/40 px-3 py-1.5 rounded-full transition-all disabled:opacity-50 text-left"
              >
                💡 {example}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2 flex justify-center">
          <button
            type="submit"
            disabled={isLoading || !topic.trim()}
            className="w-full sm:w-auto min-w-[240px] flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                <span>Generating Slides...</span>
              </>
            ) : (
              <>
                <span>Generate Slides</span>
                <span>✨</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
