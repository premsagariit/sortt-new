import type { Metadata } from 'next';
import { NavBar } from '../../components/landing/NavBar';
import { Footer } from '../../components/landing/Footer';
import { APP_NAME } from '../../constants/app';

export const metadata: Metadata = {
  title: `Help & Support — ${APP_NAME}`,
  description: `Frequently asked questions and support resources for ${APP_NAME}.`,
};

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-bg text-navy flex flex-col">
      <NavBar />
      
      <div className="flex-1 pt-24 pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold text-navy tracking-tight mb-4">
            Help & Support
          </h1>
          <p className="text-slate text-lg mb-12">
            Find answers to common questions about selling your scrap and picking up orders.
          </p>

          <div className="space-y-8">
            <section className="bg-surface border border-border rounded-2xl p-8">
              <h2 className="text-xl font-bold mb-6 text-navy flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-tealLight text-teal flex items-center justify-center text-sm">S</span>
                For Sellers
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-navy mb-2">How do I schedule a pickup?</h3>
                  <p className="text-slate text-sm">Download the Sortt app, create an account, select your material type, enter the estimated weight, and click 'Schedule Pickup'. A verified aggregator will accept it and come to your location.</p>
                </div>
                <div>
                  <h3 className="font-bold text-navy mb-2">How do I know the rates are fair?</h3>
                  <p className="text-slate text-sm">Our rates are published daily based on current market benchmarks in Hyderabad. You will see indicative rates before validating your order, and the final price is calculated by actual weight on-site.</p>
                </div>
                <div>
                  <h3 className="font-bold text-navy mb-2">What if the aggregator doesn't show up?</h3>
                  <p className="text-slate text-sm">Aggregators are rated on their completion times. If an aggregator misses your scheduled window, the system will automatically re-assign your order to another trusted partner, and you will be notified in the app.</p>
                </div>
              </div>
            </section>

            <section className="bg-surface border border-border rounded-2xl p-8">
              <h2 className="text-xl font-bold mb-6 text-navy flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-amberLight text-amber flex items-center justify-center text-sm">A</span>
                For Aggregators
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-bold text-navy mb-2">How do I get paid?</h3>
                  <p className="text-slate text-sm">Currently, aggregators pay sellers directly in cash or UPI at the time of pickup. The app serves as a trusted marketplace. Payment routing features are coming in future updates.</p>
                </div>
                <div>
                  <h3 className="font-bold text-navy mb-2">Can I choose which areas to cover?</h3>
                  <p className="text-slate text-sm">Yes. In your profile settings, you can define specific pin codes or zones in Hyderabad. You will only receive order notifications for your selected areas.</p>
                </div>
                <div>
                  <h3 className="font-bold text-navy mb-2">What documents are required for KYC?</h3>
                  <p className="text-slate text-sm">To maintain trust, all aggregators must upload a valid Aadhar card, pan card, and proof of vehicle (if applicable) within the app before accepting orders.</p>
                </div>
              </div>
            </section>
          </div>
          
        </div>
      </div>

      <Footer />
    </main>
  );
}
