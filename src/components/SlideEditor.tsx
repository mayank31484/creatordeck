"use client";

import React from "react";
import type { Slide } from "@/lib/types";
import { getRandomGradient } from "@/lib/gradients";

interface SlideEditorProps {
  slides: Slide[];
  onSlidesChange: (slides: Slide[]) => void;
  onContinue: () => void;
  isLoading: boolean;
}

const COMMON_EMOJIS = ["💡", "🚀", "📊", "🎯", "⚡", "🔥", "🧠", "✨", "🌟", "📈", "🛠️", "💬"];

export default function SlideEditor({
  slides,
  onSlidesChange,
  onContinue,
  isLoading,
}: SlideEditorProps) {
  const updateSlideTitle = (index: number, title: string) => {
    const updated = slides.map((slide, i) =>
      i === index ? { ...slide, title } : slide
    );
    onSlidesChange(updated);
  };

  const updateSlideIcon = (index: number, icon: string) => {
    const updated = slides.map((slide, i) =>
      i === index ? { ...slide, icon } : slide
    );
    onSlidesChange(updated);
  };

  const updateBullet = (
    slideIndex: number,
    bulletIndex: number,
    text: string
  ) => {
    const updated = slides.map((slide, i) => {
      if (i !== slideIndex) return slide;
      const newBullets = [...slide.bullets];
      newBullets[bulletIndex] = text;
      return { ...slide, bullets: newBullets };
    });
    onSlidesChange(updated);
  };

  const addBullet = (slideIndex: number) => {
    const slide = slides[slideIndex];
    if (!slide || slide.bullets.length >= 6) return;
    const updated = slides.map((s, i) => {
      if (i !== slideIndex) return s;
      return { ...s, bullets: [...s.bullets, "New key point"] };
    });
    onSlidesChange(updated);
  };

  const removeBullet = (slideIndex: number, bulletIndex: number) => {
    const updated = slides.map((slide, i) => {
      if (i !== slideIndex) return slide;
      const filtered = slide.bullets.filter((_, idx) => idx !== bulletIndex);
      return {
        ...slide,
        bullets: filtered.length > 0 ? filtered : ["Key takeaway point"],
      };
    });
    onSlidesChange(updated);
  };

  const deleteSlide = (slideIndex: number) => {
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== slideIndex);
    onSlidesChange(updated);
  };

  const addSlide = () => {
    if (slides.length >= 8) return;
    const nextIdx = slides.length;
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: `Slide ${nextIdx + 1}: New Topic`,
      bullets: [
        "First key takeaway point",
        "Second explanatory supporting detail",
      ],
      icon: COMMON_EMOJIS[nextIdx % COMMON_EMOJIS.length] || "💡",
      gradient: getRandomGradient(nextIdx),
    };
    onSlidesChange([...slides, newSlide]);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-slide-up pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-2">
            <span>🎨</span>
            <span>Step 2: Edit Slides</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Customize Your Deck
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Click any title or bullet to edit. Customize the slides before generating voice scripts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700">
            {slides.length}/8 Slides
          </span>

          {slides.length < 8 && (
            <button
              type="button"
              onClick={addSlide}
              disabled={isLoading}
              className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white px-3.5 py-2 rounded-xl text-xs font-medium border border-gray-700 transition-all hover:scale-105 disabled:opacity-50"
            >
              <span className="text-violet-400 text-sm font-bold">+</span>
              <span>Add Slide</span>
            </button>
          )}

          <button
            type="button"
            onClick={onContinue}
            disabled={isLoading || slides.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-violet-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Continue to Speech</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Slide Grid (2 Columns on Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id || `slide-${slideIndex}`}
            className={`group relative rounded-2xl p-6 bg-gradient-to-br ${slide.gradient} text-white shadow-xl border border-white/10 flex flex-col justify-between min-h-[340px] transition-all hover:shadow-2xl hover:border-white/20`}
          >
            {/* Slide Card Header */}
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="bg-black/30 backdrop-blur-md text-white/90 text-xs px-2.5 py-1 rounded-md font-semibold tracking-wider uppercase border border-white/10">
                  Slide {slideIndex + 1}
                </span>
                <span className="text-white/60 text-xs">
                  {slide.bullets.length} points
                </span>
              </div>

              {/* Action Buttons: Delete */}
              <div className="flex items-center gap-1">
                {slides.length > 1 && (
                  <button
                    type="button"
                    onClick={() => deleteSlide(slideIndex)}
                    title="Delete slide"
                    className="p-1.5 rounded-lg bg-black/20 hover:bg-red-500/40 text-white/70 hover:text-white transition-all border border-transparent hover:border-red-400/40"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Slide Main Content */}
            <div className="space-y-4 flex-1">
              {/* Emoji icon and editable title */}
              <div className="flex items-start gap-3">
                {/* Large Emoji Icon Display with quick edit */}
                <div className="relative group/emoji shrink-0">
                  <input
                    type="text"
                    value={slide.icon}
                    onChange={(e) => updateSlideIcon(slideIndex, e.target.value)}
                    maxLength={4}
                    title="Change emoji icon"
                    className="w-14 h-14 text-3xl md:text-4xl text-center bg-black/25 hover:bg-black/40 focus:bg-black/50 border border-white/15 focus:border-white/50 rounded-xl outline-none transition-all cursor-pointer select-all"
                  />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-white/60 bg-black/60 px-1 rounded opacity-0 group-hover/emoji:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Edit emoji
                  </span>
                </div>

                {/* Editable Slide Title */}
                <div className="flex-1">
                  <label className="text-[10px] uppercase font-semibold text-white/60 tracking-wider block mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) =>
                      updateSlideTitle(slideIndex, e.target.value)
                    }
                    placeholder="Enter slide title..."
                    className="w-full text-lg md:text-xl font-bold text-white bg-black/20 hover:bg-black/30 focus:bg-black/50 border border-white/15 focus:border-white/50 rounded-lg px-3 py-1.5 outline-none transition-all placeholder-white/40 shadow-inner"
                  />
                </div>
              </div>

              {/* Editable Bullet Points */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-semibold text-white/60 tracking-wider">
                    Bullet Points
                  </label>
                  {slide.bullets.length < 6 && (
                    <button
                      type="button"
                      onClick={() => addBullet(slideIndex)}
                      className="text-xs text-white/80 hover:text-white bg-black/20 hover:bg-black/40 px-2 py-0.5 rounded border border-white/15 flex items-center gap-1 transition-all"
                    >
                      <span>+</span>
                      <span>Add bullet</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {slide.bullets.map((bullet, bulletIndex) => (
                    <div
                      key={bulletIndex}
                      className="flex items-center gap-2 group/bullet"
                    >
                      <span className="text-white/60 text-sm select-none font-bold">
                        •
                      </span>
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) =>
                          updateBullet(slideIndex, bulletIndex, e.target.value)
                        }
                        placeholder={`Bullet point ${bulletIndex + 1}...`}
                        className="flex-1 text-sm bg-black/20 hover:bg-black/30 focus:bg-black/50 border border-white/15 focus:border-white/50 rounded-lg px-2.5 py-1.5 text-white/95 placeholder-white/40 outline-none transition-all shadow-inner"
                      />
                      {slide.bullets.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeBullet(slideIndex, bulletIndex)
                          }
                          title="Remove bullet"
                          className="opacity-40 group-hover/bullet:opacity-100 hover:text-red-300 text-white/80 p-1 rounded transition-all text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Slide Card Mini Footer */}
            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/50">
              <span>CreatorDeck AI Slide</span>
              <span>Slide {slideIndex + 1} of {slides.length}</span>
            </div>
          </div>
        ))}

        {/* Add Slide Card Slot if under limit */}
        {slides.length < 8 && (
          <button
            type="button"
            onClick={addSlide}
            disabled={isLoading}
            className="min-h-[340px] border-2 border-dashed border-gray-800 hover:border-violet-500/50 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-500 hover:text-violet-300 transition-all cursor-pointer group bg-gray-900/20 hover:bg-gray-900/60 disabled:opacity-50"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-800 group-hover:bg-violet-600/20 border border-gray-700 group-hover:border-violet-500/40 flex items-center justify-center text-xl text-gray-400 group-hover:text-violet-300 mb-3 transition-all group-hover:scale-110">
              +
            </div>
            <span className="font-semibold text-sm text-gray-300 group-hover:text-white">
              Add Slide {slides.length + 1}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              Up to 8 slides total
            </span>
          </button>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-900/80 border border-gray-800 rounded-2xl backdrop-blur-md">
        <div className="text-sm text-gray-400">
          Ready with your {slides.length} slides? Proceed to generate natural voiceover speech scripts.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {slides.length < 8 && (
            <button
              type="button"
              onClick={addSlide}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors"
            >
              + Add Slide
            </button>
          )}
          <button
            type="button"
            onClick={onContinue}
            disabled={isLoading || slides.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-violet-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                <span>Generating Speech...</span>
              </>
            ) : (
              <>
                <span>Continue to Speech</span>
                <span>→</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
