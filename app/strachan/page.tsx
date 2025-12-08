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
          
          <p className="text-gabriola-sand/90 text-lg text-center mt-1">
            Three decades on Gabriola Island
          </p>
		  <p className="text-gabriola-sand/90 text-lg text-center">
            Building Community Connections on Gabriola Island
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
            We're a family passionate about building and using tools that bring communities together. 
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

          {/* Roadmap Link */}
          <div className="text-center my-8">
            <a
              href="/roadmap"
              className="inline-block bg-gradient-to-r from-gabriola-green to-gabriola-green-light text-white px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 font-bold text-xl"
            >
              📋 View Full Status & Roadmap
            </a>
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
