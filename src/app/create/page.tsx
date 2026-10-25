"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Slide, AppStep } from "@/lib/types";
import TopicInput from "@/components/TopicInput";
import SlideEditor from "@/components/SlideEditor";
import SpeechEditor from "@/components/SpeechEditor";
import VoiceGenerator from "@/components/VoiceGenerator";
import PresentationPreview from "@/components/PresentationPreview";

const steps: { key: AppStep; label: string; icon: string }[] = [
  { key: "topic", label: "Topic", icon: "📝" },
  { key: "slides", label: "Slides", icon: "🎨" },
  { key: "speech", label: "Speech", icon: "💬" },
  { key: "voice", label: "Voice", icon: "🔊" },
  { key: "preview", label: "Preview", icon: "🎬" },
];

export default function CreatePage() {
  const [currentStep, setCurrentStep] = useState<AppStep>("topic");
  const [topic, setTopic] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [speechScripts, setSpeechScripts] = useState<Record<string, string>>({});
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const handleTopicSubmit = useCallback(
    async (submittedTopic: string, numberOfSlides: number) => {
      setTopic(submittedTopic);
      setIsLoading(true);
      try {
        const res = await fetch("/api/generate-slides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: submittedTopic, numberOfSlides }),
        });
        if (!res.ok) throw new Error("Failed to generate slides");
        const data = await res.json();
        setSlides(data.slides);
        setCurrentStep("slides");
      } catch (err) {
        console.error(err);
        alert("Failed to generate slides. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSlidesComplete = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/generate-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides, tone: "conversational" }),
      });
      if (!res.ok) throw new Error("Failed to generate speech");
      const data = await res.json();
      setSpeechScripts(data.scripts);
      setCurrentStep("speech");
    } catch (err) {
      console.error(err);
      alert("Failed to generate speech scripts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [slides]);

  const handleSpeechComplete = useCallback(() => {
    setCurrentStep("voice");
  }, []);

  const handleVoiceGenerated = useCallback((chunks: string[]) => {
    setAudioChunks(chunks);
    setCurrentStep("preview");
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              CreatorDeck
            </span>
          </Link>
          {topic && (
            <span className="text-sm text-gray-400 hidden md:block">
              {topic}
            </span>
          )}
        </div>
      </nav>

      {/* Step indicator */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => {
                    // Only allow going back to completed steps
                    if (idx < currentStepIndex) {
                      setCurrentStep(step.key);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    step.key === currentStep
                      ? "bg-violet-500/20 text-violet-300 font-semibold"
                      : idx < currentStepIndex
                      ? "text-green-400 cursor-pointer hover:bg-gray-800"
                      : "text-gray-600 cursor-default"
                  }`}
                >
                  <span>{step.icon}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                  {idx < currentStepIndex && (
                    <span className="text-green-400">✓</span>
                  )}
                </button>
                {idx < steps.length - 1 && (
                  <div
                    className={`w-8 md:w-16 h-px mx-1 ${
                      idx < currentStepIndex ? "bg-green-500/50" : "bg-gray-800"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center max-w-sm">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">AI is working...</h3>
            <p className="text-sm text-gray-400">
              {currentStep === "topic"
                ? "Generating your slides..."
                : "Creating speech scripts..."}
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {currentStep === "topic" && (
          <TopicInput onSubmit={handleTopicSubmit} isLoading={isLoading} />
        )}
        {currentStep === "slides" && (
          <SlideEditor
            slides={slides}
            onSlidesChange={setSlides}
            onContinue={handleSlidesComplete}
            isLoading={isLoading}
          />
        )}
        {currentStep === "speech" && (
          <SpeechEditor
            slides={slides}
            scripts={speechScripts}
            onScriptsChange={setSpeechScripts}
            onContinue={handleSpeechComplete}
          />
        )}
        {currentStep === "voice" && (
          <VoiceGenerator
            slides={slides}
            scripts={speechScripts}
            onVoiceGenerated={handleVoiceGenerated}
          />
        )}
        {currentStep === "preview" && (
          <PresentationPreview
            slides={slides}
            scripts={speechScripts}
            audioChunks={audioChunks}
            topic={topic}
          />
        )}
      </main>
    </div>
  );
}
