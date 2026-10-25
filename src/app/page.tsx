import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎬</span>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
              CreatorDeck
            </span>
          </div>
          <Link
            href="/create"
            className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-8 text-sm text-violet-300">
            <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
            Powered by Sarvam AI
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Create. Speak.{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Inspire.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            AI-powered presentation decks with auto-generated speech scripts and
            natural voice narration. Built for YouTube creators who want to
            create faster.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              href="/create"
              className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3.5 rounded-xl font-semibold text-lg transition-all hover:scale-105 animate-pulse-glow"
            >
              Create Your Deck →
            </Link>
          </div>

          {/* Feature cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <FeatureCard
              icon="✨"
              title="AI Slide Generation"
              description="Enter a topic and get a beautiful 4–6 slide deck in seconds with AI-crafted content"
            />
            <FeatureCard
              icon="🎤"
              title="Speech Scripts"
              description="AI generates natural, conversational speech scripts from your slides — ready to present"
            />
            <FeatureCard
              icon="🔊"
              title="Voice Narration"
              description="Generate lifelike voice audio in 10+ Indian languages with multiple speaker options"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-800 bg-gray-900/50 px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "1", title: "Enter Topic", desc: "Type your presentation topic or outline", icon: "📝" },
              { step: "2", title: "Edit Slides", desc: "AI generates slides — customize them your way", icon: "🎨" },
              { step: "3", title: "Generate Speech", desc: "AI writes a natural speech script", icon: "💬" },
              { step: "4", title: "Get Audio", desc: "Choose a voice, generate, and download", icon: "🎧" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-2xl">
                  {item.icon}
                </div>
                <div className="text-sm text-violet-400 font-semibold mb-1">
                  Step {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Languages section */}
      <section className="border-t border-gray-800 px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            10+ Languages Supported
          </h2>
          <p className="text-gray-400 mb-8">
            Generate voice narration in English, Hindi, Tamil, Telugu, Kannada,
            Bengali, Marathi, Gujarati, Malayalam, Punjabi, and Odia.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "English", "हिन्दी", "தமிழ்", "తెలుగు", "ಕನ್ನಡ",
              "বাংলা", "मराठी", "ગુજરાતી", "മലയാളം", "ਪੰਜਾਬੀ", "ଓଡ଼ିଆ"
            ].map((lang) => (
              <span
                key={lang}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>🎬</span>
            <span>CreatorDeck</span>
          </div>
          <div>Powered by Sarvam AI</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-left hover:border-violet-500/30 transition-colors">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
