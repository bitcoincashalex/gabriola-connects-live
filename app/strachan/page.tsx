'use client';

export default function StrachanPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gabriola-sand/30 via-white to-gabriola-green/10">
      {/* Header */}
      <header className="bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Family Photo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/images/strachan-family.jpg" 
              alt="The Strachan Family" 
              className="w-64 h-64 rounded-full object-cover border-4 border-white shadow-xl"
            />
          </div>
          <h1 className="text-4xl font-display font-bold mb-2 text-center">
            The Strachan Family
          </h1>
          <p className="text-gabriola-sand/90 text-lg text-center">
            Building Community Connections on Gabriola Island
          </p>
          <p className="text-gabriola-sand/80 text-sm text-center mt-1">
            Property owners since 1990, residents since 2004
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        
        {/* About Section */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gabriola-green-dark mb-4">
            About Us
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We're a family passionate about building open source tools that bring communities together. 
            Gabriola Connects was born from our love for this island and our desire to help 
            neighbors stay connected, informed, and engaged.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Whether it's checking ferry times, finding local services, or staying updated on 
            community events, we believe technology should make island life easier and more connected.
          </p>
        </section>

        {/* Why We Built This Section */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gabriola-green-dark mb-4">
            Why We Built Gabriola Connects
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-gabriola-green text-xl">🏝️</span>
              <span>To create a central hub for all island information</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gabriola-green text-xl">🤝</span>
              <span>To help neighbors connect and support each other</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gabriola-green text-xl">⛴️</span>
              <span>To make ferry schedules and alerts easily accessible</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gabriola-green text-xl">💚</span>
              <span>To strengthen our island community through technology</span>
            </li>
          </ul>
        </section>

        {/* Roadmap Section */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gabriola-green-dark mb-4">
            🗺️ Gabriola Connects Roadmap
          </h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            Built by and for Gabriolans, Gabriola Connects is your island hub for events, discussions, 
            local businesses, ferry updates, and community alerts. Here's what's live and what's coming next. 
            Your feedback drives everything—tell us what you need!
          </p>

          <div className="space-y-6">
            {/* Phase 1 */}
            <div className="border-l-4 border-gabriola-green pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <h3 className="text-xl font-bold text-gabriola-green-dark">
                  Live Now: Core Features
                </h3>
                <span className="text-sm text-gray-500 ml-auto">December 2025</span>
              </div>
              <p className="text-gray-700 mb-2">
                The foundation is in beta! Active features:
              </p>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>• Events Calendar with categories</li>
                <li>• Bulletin Board with multiple discussion categories</li>
                <li>• Business Directory with 16+ categories</li>
                <li>• Real-time Ferry Schedule and status</li>
                <li>• Mobile-friendly design</li>
              </ul>
            </div>

            {/* Phase 2 */}
            <div className="border-l-4 border-gabriola-ocean pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔨</span>
                <h3 className="text-xl font-bold text-gabriola-ocean">
                  In Progress: Authentication & Polish
                </h3>
                <span className="text-sm text-gray-500 ml-auto">December 2025 - January 2026</span>
              </div>
              <p className="text-gray-700 mb-2">
                Adding user accounts and deepening core features:
              </p>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>• User login/registration (email + password)</li>
                <li>• Gabriola resident verification</li>
                <li>• Event RSVPs (see who's coming!)</li>
                <li>• BBS posting with user profiles</li>
                <li>• Community Alerts system (real alerts, not demo!)</li>
                <li>• Moderator tools for community safety</li>
                <li>• Global search across all sections</li>
              </ul>
            </div>

            {/* Phase 3 */}
            <div className="border-l-4 border-purple-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📱</span>
                <h3 className="text-xl font-bold text-purple-700">
                  Next Up: Mobile App (PWA)
                </h3>
                <span className="text-sm text-gray-500 ml-auto">January - February 2026</span>
              </div>
              <p className="text-gray-700 mb-2">
                Install Gabriola Connects on your phone! Progressive Web App features:
              </p>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>• Add to home screen (works like a real app!)</li>
                <li>• Push notifications for alerts and ferry updates</li>
                <li>• View cached ferry schedules, events, and directory offline</li>
                <li>• Faster loading and smoother experience</li>
                <li>• Works on ALL phones (iPhone + Android)</li>
              </ul>
            </div>

            {/* Phase 4 */}
            <div className="border-l-4 border-amber-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🌟</span>
                <h3 className="text-xl font-bold text-amber-700">
                  Island-Specific Features
                </h3>
                <span className="text-sm text-gray-500 ml-auto">Q1 2026</span>
              </div>
              <p className="text-gray-700 mb-2">
                Tools that make island life easier:
              </p>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>• Classifieds Marketplace (buy/sell/trade locally)</li>
                <li>• Rideshare Board (find rides to Nanaimo, Costco runs)</li>
                <li>• Weather & Tides Dashboard (essential for boating/beaches)</li>
                <li>• Lost & Found (reunite pets and items with owners)</li>
                <li>• Directory reviews and ratings</li>
                <li>• Photo uploads for posts and listings</li>
              </ul>
            </div>

            {/* Phase 5 */}
            <div className="border-l-4 border-teal-500 pl-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🚀</span>
                <h3 className="text-xl font-bold text-teal-700">
                  Community-Driven Growth
                </h3>
                <span className="text-sm text-gray-500 ml-auto">Mid-2026+</span>
              </div>
              <p className="text-gray-700 mb-2">
                Features based on YOUR requests and actual usage:
              </p>
              <ul className="text-gray-700 space-y-1 ml-4">
                <li>• Interest groups (hikers, artists, gardeners, etc.)</li>
                <li>• Volunteering opportunities board</li>
                <li>• Native iOS/Android apps (if needed)</li>
                <li>• BC Ferries API integration (real-time delays)</li>
                <li>• Advanced features you tell us you want!</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gabriola-green/10 rounded-lg">
            <p className="text-gray-700">
              <span className="font-semibold text-lg">We're listening! 👂</span>
              <br />
              What features matter most to YOU? Join the conversation on our Bulletin Board and help 
              shape Gabriola Connects. This is YOUR community hub—let's build it together! 
              <br /><br />
              <span className="font-semibold">Our vision:</span> If we're successful here, other Gulf Islands 
              may start their own community hubs—imagine Mayne Connects, Pender Connects, Salt Spring Connects! 
              Together, we can strengthen island communities across the Salish Sea. 🏝️⛴️🏝️
            </p>
          </div>
        </section>

        {/* Other Projects Section */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gabriola-green-dark mb-4">
            Our Other Projects
          </h2>
          <div className="space-y-4">
            <a 
              href="https://ftjp.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block p-4 border-2 border-gabriola-green/20 rounded-lg hover:border-gabriola-green hover:shadow-md transition-all"
            >
              <h3 className="text-lg font-semibold text-gabriola-green mb-1">
                FTJP.org →
              </h3>
              <p className="text-gray-600 text-sm">
                Empowering People Through DeCentralization
              </p>
            </a>
            
            {/* Add more projects here */}
          </div>
        </section>

        {/* Contact Section */}
        <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gabriola-green-dark mb-4">
            Get In Touch
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Have suggestions for Gabriola Connects? Want to help improve the platform? 
            We'd love to hear from you!
          </p>
          <div className="space-y-3">
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span>{' '}
              <a 
                href="mailto:gabriolaconnects@gmail.com" 
                className="text-gabriola-green hover:text-gabriola-green-dark underline"
              >
                gabriolaconnects@gmail.com
              </a>
            </p>
            {/* Add more contact methods if desired */}
          </div>
        </section>

        {/* Back to Home */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 font-semibold"
          >
            ← Back to Gabriola Connects
          </a>
        </div>
      </main>
    </div>
  );
}
