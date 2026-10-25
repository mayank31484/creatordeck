"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Slide } from "@/lib/types";

export interface PresentationPreviewProps {
  slides: Slide[];
  scripts: Record<string, string>;
  audioChunks: string[];
  topic: string;
}

// Fallback gradient map to guarantee accurate CSS rendering for preview and PDF export
const GRADIENT_MAP: Record<string, string> = {
  "from-violet-600 to-indigo-600": "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
  "from-blue-600 to-cyan-500": "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)",
  "from-emerald-500 to-teal-600": "linear-gradient(135deg, #10b981 0%, #0d9488 100%)",
  "from-orange-500 to-red-500": "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
  "from-pink-500 to-rose-500": "linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)",
  "from-amber-500 to-yellow-500": "linear-gradient(135deg, #f59e0b 0%, #eab308 100%)",
  "from-purple-600 to-pink-500": "linear-gradient(135deg, #9333ea 0%, #ec4899 100%)",
  "from-sky-500 to-blue-600": "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
  "from-lime-500 to-green-600": "linear-gradient(135deg, #84cc16 0%, #16a34a 100%)",
  "from-fuchsia-500 to-purple-600": "linear-gradient(135deg, #d946ef 0%, #9333ea 100%)",
};

/**
 * Combines multiple base64 encoded WAV chunks into a single valid WAV Blob by
 * preserving the format headers and merging the raw PCM audio samples.
 */
function combineWavChunks(chunks: string[]): Blob {
  if (!chunks || chunks.length === 0) {
    return new Blob([], { type: "audio/wav" });
  }

  if (chunks.length === 1) {
    const clean = chunks[0].includes(",") ? chunks[0].split(",")[1] : chunks[0];
    const binary = atob(clean.trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: "audio/wav" });
  }

  try {
    const pcmDataArrays: Uint8Array[] = [];
    let headerBytes: Uint8Array | null = null;
    let totalDataLength = 0;

    for (const chunk of chunks) {
      const clean = chunk.includes(",") ? chunk.split(",")[1] : chunk;
      const binary = atob(clean.trim());
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Look for the 'data' chunk marker (0x64, 0x61, 0x74, 0x61)
      let dataOffset = -1;
      for (let i = 0; i < bytes.length - 4; i++) {
        if (
          bytes[i] === 0x64 &&
          bytes[i + 1] === 0x61 &&
          bytes[i + 2] === 0x74 &&
          bytes[i + 3] === 0x61
        ) {
          dataOffset = i + 8; // skip 4-byte 'data' tag + 4-byte chunk size
          break;
        }
      }

      if (dataOffset !== -1 && dataOffset <= bytes.length) {
        if (!headerBytes) {
          headerBytes = bytes.slice(0, dataOffset);
        }
        const pcm = bytes.slice(dataOffset);
        pcmDataArrays.push(pcm);
        totalDataLength += pcm.length;
      } else {
        // Fallback: assume default 44-byte WAV header
        const headerLen = Math.min(44, bytes.length);
        if (!headerBytes) {
          headerBytes = bytes.slice(0, headerLen);
        }
        const pcm = bytes.slice(headerLen);
        pcmDataArrays.push(pcm);
        totalDataLength += pcm.length;
      }
    }

    if (!headerBytes) {
      return new Blob([], { type: "audio/wav" });
    }

    const finalBuffer = new Uint8Array(headerBytes.length + totalDataLength);
    finalBuffer.set(headerBytes, 0);

    const view = new DataView(finalBuffer.buffer);
    // Update total RIFF size: total bytes - 8
    view.setUint32(4, finalBuffer.length - 8, true);
    // Update data subchunk size in header
    view.setUint32(headerBytes.length - 4, totalDataLength, true);

    let offset = headerBytes.length;
    for (const pcm of pcmDataArrays) {
      finalBuffer.set(pcm, offset);
      offset += pcm.length;
    }

    return new Blob([finalBuffer], { type: "audio/wav" });
  } catch (err) {
    console.error("Error creating merged WAV, falling back to simple concatenation:", err);
    // Fallback: raw concatenation
    const allBytes: number[] = [];
    chunks.forEach((chunk) => {
      const clean = chunk.includes(",") ? chunk.split(",")[1] : chunk;
      const byteCharacters = atob(clean.trim());
      for (let i = 0; i < byteCharacters.length; i++) {
        allBytes.push(byteCharacters.charCodeAt(i));
      }
    });
    return new Blob([new Uint8Array(allBytes)], { type: "audio/wav" });
  }
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function PresentationPreview({
  slides = [],
  scripts = {},
  audioChunks = [],
  topic = "Presentation",
}: PresentationPreviewProps) {
  // Carousel State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Audio Player State
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Convert base64 audio chunks to object URLs
  const audioUrls = useMemo(() => {
    if (!audioChunks || audioChunks.length === 0) return [];
    return audioChunks.map((chunk) => {
      try {
        const clean = chunk.includes(",") ? chunk.split(",")[1] : chunk;
        const byteCharacters = atob(clean.trim());
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "audio/wav" });
        return URL.createObjectURL(blob);
      } catch (err) {
        console.error("Error parsing audio chunk:", err);
        return "";
      }
    });
  }, [audioChunks]);

  // Clean up object URLs on unmount or updates
  useEffect(() => {
    return () => {
      audioUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [audioUrls]);

  // Handle source changes when current chunk index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const url = audioUrls[currentChunkIndex];
    if (url && audio.src !== url) {
      audio.src = url;
      audio.currentTime = 0;
      audio.playbackRate = playbackRate;
      setCurrentTime(0);

      if (isPlaying) {
        audio.play().catch((err) => {
          console.warn("Audio playback prevented:", err);
          setIsPlaying(false);
        });
      }
    }
  }, [currentChunkIndex, audioUrls, isPlaying, playbackRate]);

  // Handle play/pause state change
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioUrls.length === 0) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If at end, start from beginning
      if (currentChunkIndex >= audioUrls.length - 1 && audio.ended) {
        setCurrentChunkIndex(0);
        audio.currentTime = 0;
      }
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Playback error:", err);
          setIsPlaying(false);
        });
    }
  }, [isPlaying, audioUrls.length, currentChunkIndex]);

  // Sequential chunk playback on audio ended
  const handleAudioEnded = useCallback(() => {
    if (currentChunkIndex < audioUrls.length - 1) {
      const nextIndex = currentChunkIndex + 1;
      setCurrentChunkIndex(nextIndex);

      // If audio chunks correlate with slides, auto-advance the preview slide
      if (audioChunks.length === slides.length && nextIndex < slides.length) {
        setCurrentSlideIndex(nextIndex);
      }
    } else {
      setIsPlaying(false);
      setCurrentChunkIndex(0);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
  }, [currentChunkIndex, audioUrls.length, audioChunks.length, slides.length]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const goToNextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      if (prev < slides.length - 1) {
        const next = prev + 1;
        if (audioChunks.length === slides.length && next < audioChunks.length) {
          setCurrentChunkIndex(next);
        }
        return next;
      }
      return prev;
    });
  }, [slides.length, audioChunks.length]);

  const goToPrevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => {
      if (prev > 0) {
        const next = prev - 1;
        if (audioChunks.length === slides.length && next < audioChunks.length) {
          setCurrentChunkIndex(next);
        }
        return next;
      }
      return prev;
    });
  }, [slides.length, audioChunks.length]);

  // Keyboard navigation for slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        goToNextSlide();
      } else if (e.key === "ArrowLeft") {
        goToPrevSlide();
      } else if (e.key === " " && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextSlide, goToPrevSlide, togglePlay]);

  // Current slide and script
  const currentSlide = slides[currentSlideIndex] || {
    id: "slide-1",
    title: "Presentation Slide",
    bullets: ["Key takeaway point"],
    icon: "💡",
    gradient: "from-violet-600 to-indigo-600",
  };

  const currentScript =
    scripts[currentSlide.id] ||
    scripts[`slide-${currentSlideIndex + 1}`] ||
    scripts[String(currentSlideIndex + 1)] ||
    Object.values(scripts)[currentSlideIndex] ||
    "";

  // PDF Export
  const downloadPDF = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Pop-up was blocked. Please allow pop-ups for this site to download the PDF presentation.");
      return;
    }

    const slidesHtml = slides
      .map((slide, index) => {
        const bgGradient =
          GRADIENT_MAP[slide.gradient] || "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)";
        const bulletItems = (slide.bullets || [])
          .map(
            (b, bIdx) => `
            <li style="margin-bottom: 18px; display: flex; align-items: flex-start; gap: 14px;">
              <span style="display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: rgba(255, 255, 255, 0.22); font-weight: 700; font-size: 14px; flex-shrink: 0; margin-top: 3px;">${bIdx + 1}</span>
              <span style="font-size: 22px; line-height: 1.45; color: rgba(255, 255, 255, 0.95);">${b}</span>
            </li>`
          )
          .join("");

        return `
          <div class="slide-for-print" style="page-break-after: always; width: 100vw; height: 100vh; display: flex; flex-direction: column; justify-content: space-between; align-items: center; background: ${bgGradient}; color: white; font-family: system-ui, -apple-system, sans-serif; padding: 50px 70px; box-sizing: border-box; position: relative;">
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; opacity: 0.8; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">
              <span>${topic || "CreatorDeck Presentation"}</span>
              <span>Slide ${index + 1} of ${slides.length}</span>
            </div>

            <div style="width: 100%; max-width: 900px; display: flex; flex-direction: column; align-items: center; text-align: center; margin: auto 0;">
              <div style="font-size: 68px; margin-bottom: 16px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.25));">${slide.icon || "💡"}</div>
              <h1 style="font-size: 40px; font-weight: 800; margin: 0 0 28px 0; line-height: 1.25; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${slide.title}</h1>
              <div style="width: 100%; background: rgba(0, 0, 0, 0.2); backdrop-filter: blur(10px); border-radius: 18px; padding: 28px 36px; border: 1px solid rgba(255, 255, 255, 0.15); box-sizing: border-box;">
                <ul style="list-style: none; padding: 0; margin: 0; text-align: left;">
                  ${bulletItems}
                </ul>
              </div>
            </div>

            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; opacity: 0.65; font-size: 12px;">
              <span>Created with CreatorDeck • Powered by Sarvam AI</span>
              <span>${new Date().toLocaleDateString()}</span>
            </div>
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${topic ? `${topic} - CreatorDeck` : "Presentation - CreatorDeck"}</title>
          <style>
            @page {
              size: landscape;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #030712;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .slide-for-print {
              page-break-after: always;
              page-break-inside: avoid;
              width: 100vw;
              height: 100vh;
            }
          </style>
        </head>
        <body>
          ${slidesHtml}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  }, [slides, topic]);

  // Audio Download
  const downloadAudio = useCallback(() => {
    if (!audioChunks || audioChunks.length === 0) {
      alert("No audio narration available to download.");
      return;
    }

    try {
      const blob = combineWavChunks(audioChunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sanitizedTopic = topic
        ? topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
        : "creatordeck";
      a.download = `${sanitizedTopic || "presentation"}-narration.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error("Failed to download audio:", err);
      alert("Failed to process audio for download. Please try again.");
    }
  }, [audioChunks, topic]);

  // Copy speech script
  const copyScript = useCallback(() => {
    if (!currentScript) return;
    navigator.clipboard.writeText(currentScript).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  }, [currentScript]);

  const slideGradientStyle =
    GRADIENT_MAP[currentSlide.gradient] || "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)";

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto pb-12 animate-fade-in">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        preload="auto"
      />

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <span className="text-xs uppercase tracking-wider text-violet-400 font-semibold">
            Ready to Export
          </span>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
            {topic || "Your Deck & Narration"}
          </h1>
        </div>

        {/* Action button pills on top right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              window.location.href = "/create";
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-medium border border-gray-700/60 transition-colors"
          >
            <span>🔄</span>
            <span>Start Over</span>
          </button>
        </div>
      </div>

      {/* 1. Slide Carousel Preview */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between text-sm text-gray-400 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
            <span className="font-medium text-gray-200">16:9 Presentation Preview</span>
          </div>
          <div className="text-xs font-mono bg-gray-800/80 px-2.5 py-1 rounded-md border border-gray-700/60">
            Slide {currentSlideIndex + 1} of {slides.length}
          </div>
        </div>

        {/* 16:9 Slide Card */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 group select-none">
          {/* Dynamic Slide Background */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${currentSlide.gradient} transition-all duration-500`}
            style={{ background: slideGradientStyle }}
          />

          {/* Subtle noise / ambient lighting effect */}
          <div className="absolute inset-0 bg-radial-gradient from-white/10 via-transparent to-black/30 pointer-events-none" />

          {/* Slide Inner Content */}
          <div className="relative h-full w-full p-6 md:p-10 lg:p-12 flex flex-col justify-between box-border">
            {/* Top metadata */}
            <div className="flex items-center justify-between text-white/70 text-xs md:text-sm font-semibold tracking-wider uppercase">
              <span className="truncate max-w-[60%]">{topic || "CreatorDeck"}</span>
              <span className="font-mono bg-black/20 px-2.5 py-0.5 rounded-full border border-white/10">
                #{currentSlideIndex + 1}
              </span>
            </div>

            {/* Center slide presentation content */}
            <div className="flex flex-col items-center text-center my-auto px-2">
              <div className="text-4xl md:text-6xl mb-3 drop-shadow-lg transform transition-transform hover:scale-110 duration-200">
                {currentSlide.icon || "💡"}
              </div>
              <h2 className="text-xl md:text-3xl lg:text-4xl font-extrabold text-white mb-4 md:mb-6 max-w-2xl leading-tight drop-shadow-md">
                {currentSlide.title}
              </h2>

              {/* Bullet points box */}
              <div className="w-full max-w-xl bg-black/25 backdrop-blur-md rounded-xl p-4 md:p-5 border border-white/10 shadow-lg text-left">
                <ul className="space-y-2 md:space-y-3">
                  {(currentSlide.bullets || []).map((bullet, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs md:text-sm lg:text-base text-white/95"
                    >
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-white text-[11px] font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-snug">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom footer branding */}
            <div className="flex items-center justify-between text-white/50 text-[10px] md:text-xs">
              <span>CreatorDeck Studio</span>
              <span>16:9 Presentation Format</span>
            </div>
          </div>

          {/* Floating Next/Prev arrows on hover / mobile */}
          <button
            onClick={goToPrevSlide}
            disabled={currentSlideIndex === 0}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white disabled:opacity-20 disabled:hover:bg-black/40 flex items-center justify-center transition-all border border-white/10 shadow-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={goToNextSlide}
            disabled={currentSlideIndex === slides.length - 1}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white disabled:opacity-20 disabled:hover:bg-black/40 flex items-center justify-center transition-all border border-white/10 shadow-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Carousel Navigation Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevSlide}
              disabled={currentSlideIndex === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-40 disabled:hover:bg-gray-800 text-xs font-medium transition-colors border border-gray-700/60"
            >
              <span>←</span>
              <span>Previous</span>
            </button>
            <button
              onClick={goToNextSlide}
              disabled={currentSlideIndex === slides.length - 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 disabled:opacity-40 disabled:hover:bg-gray-800 text-xs font-medium transition-colors border border-gray-700/60"
            >
              <span>Next</span>
              <span>→</span>
            </button>
          </div>

          {/* Dots navigation */}
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentSlideIndex(idx);
                  if (audioChunks.length === slides.length && idx < audioChunks.length) {
                    setCurrentChunkIndex(idx);
                  }
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlideIndex
                    ? "w-6 bg-violet-500"
                    : "w-2 bg-gray-700 hover:bg-gray-600"
                }`}
                aria-label={`Jump to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="text-xs font-medium text-gray-400">
            Slide <span className="text-white font-bold">{currentSlideIndex + 1}</span> of{" "}
            {slides.length}
          </div>
        </div>

        {/* Narration Script Display for Current Slide */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎙️</span>
              <span className="text-sm font-semibold text-violet-300">
                Speech Script for Slide {currentSlideIndex + 1}
              </span>
            </div>
            <button
              onClick={copyScript}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded-md border border-gray-700/60 transition-colors"
            >
              <span>{isCopied ? "✓ Copied!" : "📋 Copy"}</span>
            </button>
          </div>

          <p className="text-gray-300 text-sm md:text-base leading-relaxed italic bg-gray-950/60 p-4 rounded-lg border border-gray-800/80">
            {currentScript || (
              <span className="text-gray-500 not-italic">
                No speech script found for this slide.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* 2. Audio Player Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 text-base">
              🔊
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Narration Audio Player</h3>
              <p className="text-xs text-gray-400">
                {audioUrls.length > 0
                  ? `Playing Part ${currentChunkIndex + 1} of ${audioUrls.length} • Powered by Sarvam AI`
                  : "No voice audio chunks available"}
              </p>
            </div>
          </div>

          {/* Speed Pills */}
          <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800 text-xs">
            {[1, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => changePlaybackRate(rate)}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  playbackRate === rate
                    ? "bg-violet-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Audio Player Controls */}
        <div className="flex flex-col gap-3 bg-gray-950/70 border border-gray-800/80 p-4 rounded-xl">
          {/* Progress Bar & Seek */}
          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              disabled={audioUrls.length === 0}
              className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-violet-500 disabled:opacity-40"
            />
            <div className="flex justify-between text-xs text-gray-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between pt-1">
            {/* Audio chunk skip buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentChunkIndex > 0) {
                    const prev = currentChunkIndex - 1;
                    setCurrentChunkIndex(prev);
                    if (audioChunks.length === slides.length && prev < slides.length) {
                      setCurrentSlideIndex(prev);
                    }
                  }
                }}
                disabled={currentChunkIndex === 0 || audioUrls.length === 0}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-30 disabled:hover:bg-gray-800 transition-colors"
                title="Previous audio segment"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                </svg>
              </button>

              {/* Main Play/Pause Button */}
              <button
                onClick={togglePlay}
                disabled={audioUrls.length === 0}
                className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-violet-600/30"
                title={isPlaying ? "Pause audio" : "Play all narration"}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => {
                  if (currentChunkIndex < audioUrls.length - 1) {
                    const next = currentChunkIndex + 1;
                    setCurrentChunkIndex(next);
                    if (audioChunks.length === slides.length && next < slides.length) {
                      setCurrentSlideIndex(next);
                    }
                  }
                }}
                disabled={
                  currentChunkIndex >= audioUrls.length - 1 || audioUrls.length === 0
                }
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-30 disabled:hover:bg-gray-800 transition-colors"
                title="Next audio segment"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>
            </div>

            {/* Chunk selector pills */}
            {audioUrls.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-xs text-gray-500 mr-1">Parts:</span>
                {audioUrls.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentChunkIndex(idx);
                      if (audioChunks.length === slides.length && idx < slides.length) {
                        setCurrentSlideIndex(idx);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                      idx === currentChunkIndex
                        ? "bg-violet-600 text-white font-bold"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Download & Export Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white mb-2">Export & Downloads</h3>
        <p className="text-sm text-gray-400 mb-6">
          Download your ready-to-present deck as a high-resolution PDF or save the voice narration audio file.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4">
          {/* PDF Download Button */}
          <button
            onClick={downloadPDF}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-600/25 hover:shadow-violet-600/40 transition-all hover:-translate-y-0.5 text-sm md:text-base cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Download Slides as PDF</span>
          </button>

          {/* Audio Download Button */}
          <button
            onClick={downloadAudio}
            disabled={audioChunks.length === 0}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all hover:-translate-y-0.5 text-sm md:text-base disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <span>Download Audio as WAV</span>
          </button>

          {/* Start Over Button */}
          <button
            onClick={() => {
              window.location.href = "/create";
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-medium border border-gray-700/60 transition-colors text-sm md:text-base cursor-pointer"
          >
            <span>🔄</span>
            <span>Start Over</span>
          </button>
        </div>
      </div>
    </div>
  );
}
