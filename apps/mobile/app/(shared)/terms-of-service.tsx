/**
 * app/(seller)/terms-of-service.tsx
 * ──────────────────────────────────────────────────────────────────
 * Terms of Service screen.
 * Displays real legal content verbatim.
 * ──────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../../constants/tokens';
import { safeBack } from '../../utils/navigation';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';

export default function TermsOfService() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NavBar 
        title="Terms of Service" 
        variant="light" 
        onBack={() => safeBack()} 
      />

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="subheading" style={styles.effectiveDate}>Effective Date: 1 March 2026</Text>

        <Section title="1. Acceptance of Terms">
          By accessing or using the Sortt mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App. Sortt is operated by Sortt Technologies Pvt. Ltd., a company incorporated under the Companies Act, 2013, with its registered office in Hyderabad, Telangana, India ("Company", "we", "us", or "our").
        </Section>

        <Section title="2. Description of Service">
          Sortt is a two-sided digital marketplace that connects individuals, households, and businesses ("Sellers") who wish to sell recyclable scrap materials with verified scrap dealers and aggregators ("Aggregators") who wish to purchase such materials. The App facilitates order creation, aggregator matching, pickup scheduling, weight verification, and transaction recording. Sortt does not purchase, handle, or take ownership of any scrap materials at any time. All transactions are directly between Sellers and Aggregators.
        </Section>

        <Section title="3. Eligibility">
          You must be at least 18 years of age and a resident of India to use this App. By using the App, you represent and warrant that you meet these eligibility requirements. Business users must have valid authority to bind their organisation to these Terms.
        </Section>

        <Section title="4. Account Registration and OTP Authentication">
          Access to the App requires registration with a valid Indian mobile phone number. Authentication is performed via a one-time password (OTP) delivered through WhatsApp. You are responsible for maintaining the confidentiality of your account and for all activity that occurs under your account. You must notify us immediately at support@sortt.in if you suspect any unauthorised use of your account. We reserve the right to suspend or terminate accounts found to be in violation of these Terms.
        </Section>

        <Section title="5. Seller Obligations">
          As a Seller, you agree to: (a) provide accurate descriptions of the scrap materials you wish to sell, including correct material types and approximate weights; (b) ensure that the scrap offered for collection is legitimately owned by you and free from any legal encumbrances; (c) be present at the designated pickup address during the agreed pickup window, or make arrangements for an authorised representative to be present; (d) enter the OTP only after reviewing and agreeing to the final weight and amount confirmed by the Aggregator; and (e) not use the platform to sell prohibited or hazardous materials including but not limited to radioactive waste, unexploded ordnance, narcotics, or any material whose sale is restricted under Indian law.
        </Section>

        <Section title="6. Aggregator Obligations">
          As an Aggregator, you agree to: (a) complete KYC verification and maintain accurate profile information including operating areas, materials handled, and per-kg rates; (b) honour accepted orders and arrive within the agreed pickup window; (c) conduct fair and accurate weighing of materials in the Seller's presence using calibrated equipment; (d) pay the Seller the agreed amount in cash at the time of pickup unless an alternative payment method has been explicitly agreed; (e) upload a clear, timestamped photograph of the weighing scale at each pickup; and (f) not solicit Sellers to transact outside the platform to circumvent the App.
        </Section>

        <Section title="7. Prohibited Conduct">
          You must not: misuse the in-app chat to share personal contact information for off-platform transactions; submit false or misleading information during registration, order creation, or dispute filing; create multiple accounts to manipulate ratings or evade a ban; use the App for any unlawful purpose or in violation of any applicable Indian law or regulation; reverse-engineer, decompile, or attempt to extract the source code of the App; or use automated means to scrape, access, or interact with the platform without our written consent.
        </Section>

        <Section title="8. AI-Assisted Features">
          The App uses AI image analysis to provide estimated material categorisation and price guidance. These estimates are indicative only and do not constitute a binding offer or guarantee of any price. The final weight and transaction amount are determined at the time of physical pickup by the Aggregator and confirmed by the Seller via OTP. The Company is not liable for any discrepancy between AI-generated estimates and actual transaction values.
        </Section>

        <Section title="9. GST and Tax Obligations">
          Business Sellers are responsible for ensuring compliance with all applicable Goods and Services Tax (GST) obligations. GST invoices generated by the App for transactions exceeding ₹50,000 are generated based on information provided by you. You represent that your GSTIN, if provided, is valid and current. The Company is not a GST-registered intermediary for the purpose of these transactions and does not collect or remit GST on your behalf.
        </Section>

        <Section title="10. Dispute Resolution">
          In the event of a dispute between a Seller and an Aggregator, either party may raise a dispute through the App within 48 hours of order completion. The Company will review available evidence including scale photographs, OTP logs, and chat history and communicate a resolution within 72 hours. The Company's decision is final for in-app disputes. For disputes involving amounts exceeding ₹50,000, or disputes that cannot be resolved through the in-app process, both parties agree to submit to the jurisdiction of courts in Hyderabad, Telangana, India.
        </Section>

        <Section title="11. Intellectual Property">
          All content, design, code, trademarks, and materials on the App are the exclusive property of Sortt Technologies Pvt. Ltd. and are protected under applicable Indian intellectual property laws. You may not reproduce, distribute, or create derivative works from any part of the App without our prior written consent.
        </Section>

        <Section title="12. Limitation of Liability">
          To the maximum extent permitted by applicable law, the Company shall not be liable for: (a) any indirect, incidental, or consequential damages arising from your use of the App; (b) the conduct of any Seller or Aggregator on the platform; (c) any loss arising from inaccuracy of AI-generated estimates; or (d) any failure or delay in service due to circumstances beyond our reasonable control. Our total aggregate liability to you for any claim arising under these Terms shall not exceed ₹10,000.
        </Section>

        <Section title="13. Modifications to Terms">
          We reserve the right to modify these Terms at any time. We will notify you of material changes via in-app notification. Your continued use of the App after such notification constitutes your acceptance of the revised Terms.
        </Section>

        <Section title="14. Governing Law">
          These Terms are governed by the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.
        </Section>

        <Section title="15. Contact">
          For questions regarding these Terms, contact us at:{"\n"}
          Sortt Technologies Pvt. Ltd.{"\n"}
          Email: legal@sortt.in{"\n"}
          Address: Hyderabad, Telangana, India — 500032
        </Section>

        <View style={styles.footer}>
          <Numeric size={11} style={styles.footerText}>
            v1.0 · Sortt Technologies Pvt. Ltd. · Hyderabad
          </Numeric>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  effectiveDate: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 20,
  },
  section: {
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: colors.slate,
    lineHeight: 1.6 * 14,
    marginBottom: 20,
  },
  footer: {
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    color: colors.muted,
  },
});
