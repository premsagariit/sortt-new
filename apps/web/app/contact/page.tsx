import type { Metadata } from 'next';
import { NavBar } from '../../components/landing/NavBar';
import { Footer } from '../../components/landing/Footer';
import { APP_NAME } from '../../constants/app';

export const metadata: Metadata = {
  title: `Contact Us — ${APP_NAME}`,
  description: `Get in touch with the ${APP_NAME} team. We are here to help sellers and aggregators in Hyderabad.`,
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-bg text-navy flex flex-col">
      <NavBar />
      
      <div className="flex-1 pt-24 pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold text-navy tracking-tight mb-4">
            Contact Us
          </h1>
          <p className="text-slate text-lg mb-12">
            Have a question or need assistance? Reach out to our team in Hyderabad.
          </p>

          <div className="bg-surface border border-border rounded-2xl p-8 mb-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal/10 rounded-full blur-3xl" />
            <h2 className="text-xl font-bold mb-6 text-navy">Get in Touch</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-tealLight flex items-center justify-center text-teal text-xl shrink-0">
                  📍
                </div>
                <div>
                  <h3 className="font-bold text-navy mb-1">Headquarters</h3>
                  <p className="text-slate text-sm">
                    Sortt Technologies<br />
                    Gachibowli, Hyderabad,<br />
                    Telangana 500032, India
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-amberLight flex items-center justify-center text-amber text-xl shrink-0">
                  ✉️
                </div>
                <div>
                  <h3 className="font-bold text-navy mb-1">Email Us</h3>
                  <p className="text-slate text-sm">
                    <a href="mailto:support@sortt.in" className="text-teal hover:underline font-medium">support@sortt.in</a>
                  </p>
                  <p className="text-slate text-xs mt-1">We aim to respond within 24 hours.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red/10 flex items-center justify-center text-red text-xl shrink-0">
                  📞
                </div>
                <div>
                  <h3 className="font-bold text-navy mb-1">Call Support</h3>
                  <p className="text-slate text-sm">
                    +91 98765 43210
                  </p>
                  <p className="text-slate text-xs mt-1">Mon-Sat, 9:00 AM to 7:00 PM</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-navy rounded-2xl p-8 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-red/20 rounded-full blur-3xl pointer-events-none" />
             <h2 className="text-xl font-bold mb-3">Partner with {APP_NAME}</h2>
             <p className="text-white/70 text-sm mb-6">
               Are you an aggregator looking to expand your business? Or a large society wanting a scheduled pickup solution? Let&apos;s talk.
             </p>
             <a href="mailto:partners@sortt.in" className="inline-flex items-center justify-center bg-white text-navy font-bold px-6 py-2.5 rounded-btn hover:bg-white/90 transition-colors text-sm">
               Email Partnership Team
             </a>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
