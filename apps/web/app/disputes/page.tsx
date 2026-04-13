import type { Metadata } from 'next';
import { NavBar } from '../../components/landing/NavBar';
import { Footer } from '../../components/landing/Footer';
import { APP_NAME } from '../../constants/app';

export const metadata: Metadata = {
  title: `Disputes & Complaints — ${APP_NAME}`,
  description: `How to raise a dispute or complaint with ${APP_NAME}.`,
};

export default function DisputesPage() {
  return (
    <main className="min-h-screen bg-bg text-navy flex flex-col">
      <NavBar />
      
      <div className="flex-1 pt-24 pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-extrabold text-navy tracking-tight mb-4">
            Disputes & Complaints
          </h1>
          <p className="text-slate text-lg mb-12">
            Your trust is our priority. If something went wrong, we are here to resolve it fairly.
          </p>

          <div className="bg-surface border border-border rounded-2xl p-8 mb-8">
            <h2 className="text-xl font-bold mb-4 text-navy">Our Resolution Policy</h2>
            <p className="text-slate text-sm leading-relaxed mb-6">
              {APP_NAME} acts as a transparent marketplace connecting sellers and aggregators. While we do not handle the physical scrap or direct financial transactions, we enforce strict quality standards for all users. Any participant violating our trust guidelines will be suspended.
            </p>

            <h3 className="font-bold text-navy mb-3">Common Dispute Types</h3>
            <ul className="space-y-4 text-sm text-slate mb-8">
              <li className="flex items-start gap-2">
                <span className="text-red font-bold">•</span>
                <strong>Weight Discrepancies:</strong> If you believe the scale used was inaccurate, do not share the OTP. Contact support immediately.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red font-bold">•</span>
                <strong>Unprofessional Behavior:</strong> Aggregators and sellers are expected to be polite and professional. We take all conduct complaints seriously.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red font-bold">•</span>
                <strong>Payment Issues:</strong> If an aggregator attempts to renegotiate the confirmed rate outside the app's predefined parameters, report them.
              </li>
            </ul>

            <h3 className="font-bold text-navy mb-3">How to Raise a Complaint</h3>
            <div className="bg-bg border border-border rounded-xl p-5 text-sm text-slate">
              <ol className="list-decimal pl-4 space-y-2">
                <li>Open the {APP_NAME} mobile app.</li>
                <li>Go to your <strong>Order History</strong>.</li>
                <li>Select the specific transaction in question.</li>
                <li>Tap on <strong>'Raise an Issue'</strong> at the bottom of the screen.</li>
                <li>Provide details and attach any relevant photos.</li>
              </ol>
            </div>
          </div>

          <div className="bg-navy text-white rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-32 h-32 bg-amber/20 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-xl font-bold mb-3">Need Immediate Assistance?</h2>
            <p className="text-white/70 text-sm mb-6 max-w-lg mx-auto">
              If you cannot access the app or have an urgent safety concern, please contact our escalation team directly.
            </p>
            <a href="mailto:disputes@sortt.in" className="inline-flex items-center justify-center bg-white text-navy font-bold px-6 py-2.5 rounded-btn hover:bg-white/90 transition-colors text-sm">
              Email disputes@sortt.in
            </a>
          </div>
          
        </div>
      </div>

      <Footer />
    </main>
  );
}
