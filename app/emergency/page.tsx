// Path: app/emergency/page.tsx
// Version: 1.0.0 - Emergency contacts page with verified Gabriola Island phone numbers
// Date: 2024-12-13

import { AlertCircle, Phone, MapPin, Clock } from 'lucide-react';
import Footer from '@/components/Footer';

export default function EmergencyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 bg-gradient-to-b from-red-50 to-white">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Emergency Contacts
            </h1>
            <p className="text-xl text-gray-600">
              Important phone numbers for Gabriola Island
            </p>
          </div>

          {/* Emergency Alert */}
          <div className="bg-red-600 text-white rounded-xl p-6 mb-8 shadow-lg">
            <div className="flex items-start gap-4">
              <Phone className="w-8 h-8 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold mb-2">In Case of Emergency</h2>
                <p className="text-xl mb-4">
                  For life-threatening emergencies, always call <strong className="text-3xl">911</strong> first
                </p>
                <p className="text-sm opacity-90">
                  Fire, Medical Emergency, Police Emergency, Ambulance
                </p>
              </div>
            </div>
          </div>

          {/* Gabriola Island Specific Contacts */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-gabriola-green" />
              Gabriola Island Services
            </h2>
            
            <div className="space-y-4">
              {/* RCMP */}
              <div className="bg-white rounded-lg border-2 border-blue-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Gabriola RCMP</h3>
                    <p className="text-gray-600 mb-2">Non-emergency police matters</p>
                  </div>
                  <a 
                    href="tel:250-247-8333" 
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    250-247-8333
                  </a>
                </div>
              </div>

              {/* Fire Department */}
              <div className="bg-white rounded-lg border-2 border-orange-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Gabriola Fire Hall #1</h3>
                    <p className="text-gray-600 mb-2">730 Church Street</p>
                  </div>
                  <a 
                    href="tel:250-247-9677" 
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    250-247-9677
                  </a>
                </div>
              </div>

              {/* Fire Duty Officer */}
              <div className="bg-white rounded-lg border-2 border-orange-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Fire Duty Officer</h3>
                    <p className="text-gray-600 mb-2">After hours emergencies</p>
                  </div>
                  <a 
                    href="tel:250-755-9289" 
                    className="px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    250-755-9289
                  </a>
                </div>
              </div>

              {/* Medical Clinic */}
              <div className="bg-white rounded-lg border-2 border-green-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Gabriola Medical Clinic</h3>
                    <p className="text-gray-600 mb-1">695 Church Street</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      Mon-Fri 9:00 AM - 5:00 PM
                    </div>
                  </div>
                  <a 
                    href="tel:250-247-9922" 
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    250-247-9922
                  </a>
                </div>
              </div>

              {/* Ambulance Society */}
              <div className="bg-white rounded-lg border-2 border-green-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Gabriola Ambulance Society</h3>
                    <p className="text-gray-600 mb-2">Non-emergency ambulance bookings</p>
                  </div>
                  <a 
                    href="tel:250-247-0001" 
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    250-247-0001
                  </a>
                </div>
              </div>

              {/* Emergency Social Services */}
              <div className="bg-white rounded-lg border-2 border-purple-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Emergency Social Services</h3>
                    <p className="text-gray-600 mb-2">Disaster support and assistance</p>
                  </div>
                  <a 
                    href="tel:250-247-8105" 
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    250-247-8105
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* BC Provincial Services */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">BC Provincial Services</h2>
            
            <div className="space-y-4">
              {/* HealthLink BC */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">HealthLink BC</h3>
                    <p className="text-gray-600 mb-2">24/7 health advice from registered nurses</p>
                  </div>
                  <a 
                    href="tel:811" 
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    811
                  </a>
                </div>
              </div>

              {/* BC Poison Control */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">BC Poison Control Centre</h3>
                    <p className="text-gray-600 mb-2">24/7 poisoning emergencies and information</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <a 
                      href="tel:1-800-567-8911" 
                      className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition flex items-center gap-2"
                    >
                      <Phone className="w-5 h-5" />
                      1-800-567-8911
                    </a>
                    <a 
                      href="tel:604-682-5050" 
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition flex items-center gap-2 text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      604-682-5050
                    </a>
                  </div>
                </div>
              </div>

              {/* BC Hydro */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">BC Hydro Power Outages</h3>
                    <p className="text-gray-600 mb-2">Report outages and get updates</p>
                    <p className="text-sm text-gray-500">Text *HYDRO (*49376) from mobile</p>
                  </div>
                  <a 
                    href="tel:1-800-224-9376" 
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    1-800-224-9376
                  </a>
                </div>
              </div>

              {/* BC Ambulance Bookings */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">BC Ambulance Service</h3>
                    <p className="text-gray-600 mb-2">Non-emergency patient transport bookings</p>
                  </div>
                  <a 
                    href="tel:1-800-866-5602" 
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-800 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    1-800-866-5602
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Marine & Coast Guard */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Marine Emergency Services</h2>
            
            <div className="space-y-4">
              {/* Rescue Coordination */}
              <div className="bg-white rounded-lg border-2 border-blue-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Joint Rescue Coordination Centre</h3>
                    <p className="text-gray-600 mb-2">Marine and aviation emergencies</p>
                  </div>
                  <a 
                    href="tel:1-800-567-5111" 
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    1-800-567-5111
                  </a>
                </div>
              </div>

              {/* Coast Guard */}
              <div className="bg-white rounded-lg border-2 border-blue-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Coast Guard Victoria MCTS</h3>
                    <p className="text-gray-600 mb-2">Marine communications and traffic</p>
                    <p className="text-sm font-semibold text-blue-600">VHF Radio: Channel 16 (156.8 MHz)</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <a 
                      href="tel:250-363-6333" 
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                    >
                      <Phone className="w-5 h-5" />
                      250-363-6333
                    </a>
                    <a 
                      href="tel:1-800-661-9202" 
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition flex items-center gap-2 text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      1-800-661-9202
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Mental Health & Crisis Support */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mental Health & Crisis Support</h2>
            
            <div className="space-y-4">
              {/* Crisis Line BC */}
              <div className="bg-white rounded-lg border-2 border-purple-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Crisis Line BC</h3>
                    <p className="text-gray-600 mb-2">24/7 mental health crisis support</p>
                  </div>
                  <a 
                    href="tel:1-800-784-2433" 
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    1-800-784-2433
                  </a>
                </div>
              </div>

              {/* Talk Suicide Canada */}
              <div className="bg-white rounded-lg border-2 border-purple-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Talk Suicide Canada</h3>
                    <p className="text-gray-600 mb-2">24/7 suicide prevention support</p>
                    <p className="text-sm text-gray-500">Text: 45645</p>
                  </div>
                  <a 
                    href="tel:1-833-456-4566" 
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    1-833-456-4566
                  </a>
                </div>
              </div>

              {/* Kids Help Phone */}
              <div className="bg-white rounded-lg border-2 border-purple-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Kids Help Phone</h3>
                    <p className="text-gray-600 mb-2">24/7 support for youth</p>
                    <p className="text-sm text-gray-500">Text: CONNECT to 686868</p>
                  </div>
                  <a 
                    href="tel:1-800-668-6868" 
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    1-800-668-6868
                  </a>
                </div>
              </div>

              {/* BC Alcohol & Drug Info */}
              <div className="bg-white rounded-lg border-2 border-purple-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">BC Alcohol & Drug Information</h3>
                    <p className="text-gray-600 mb-2">24/7 confidential help and referrals</p>
                  </div>
                  <a 
                    href="tel:1-800-663-1441" 
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2"
                  >
                    <Phone className="w-5 h-5" />
                    1-800-663-1441
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Important Notice */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Important Notice</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• For life-threatening emergencies, <strong>always call 911 first</strong></li>
                  <li>• Power outages may affect phone service - keep a charged cell phone ready</li>
                  <li>• Keep emergency numbers posted near your phone</li>
                  <li>• Program key numbers into your cell phone contacts</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">
              Last updated: December 13, 2024
            </p>
            <p>
              Found an error or have a suggestion?{' '}
              <a href="/community" className="text-gabriola-green font-semibold hover:underline">
                Let us know in the forum
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
