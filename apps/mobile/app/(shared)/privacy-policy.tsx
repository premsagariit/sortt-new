/**
 * app/(seller)/privacy-policy.tsx
 * ──────────────────────────────────────────────────────────────────
 * Privacy Policy screen.
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

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NavBar
        title="Privacy Policy"
        variant="light"
        onBack={() => safeBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="subheading" style={styles.effectiveDate}>Effective Date: 1 March 2026</Text>

        <Section title="1. Introduction">
          Sortt Technologies Pvt. Ltd. ("Sortt", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your personal information when you use the Sortt mobile application. By using the App, you consent to the practices described in this Policy.
        </Section>

        <Section title="2. Information We Collect">
          We collect the following categories of information:{"\n\n"}
          <Text style={styles.bold}>Account Information:</Text> Your mobile phone number (used for authentication via WhatsApp OTP), name, city and locality, and optionally a profile photograph.{"\n\n"}
          <Text style={styles.bold}>Transaction Information:</Text> Details of orders you create or accept, including material types, approximate and actual weights, pickup addresses (revealed to matched Aggregators only), transaction amounts, timestamps, and OTP confirmation records.{"\n\n"}
          <Text style={styles.bold}>Device and Technical Information:</Text> Device type, operating system version, Expo push notification tokens, app version, and anonymised crash logs.{"\n\n"}
          <Text style={styles.bold}>Communications:</Text> In-app chat messages between Sellers and Aggregators within order contexts.{"\n\n"}
          <Text style={styles.bold}>Media:</Text> Photographs of scrap materials uploaded by Sellers and scale photographs uploaded by Aggregators. These are stored securely and are not publicly accessible.{"\n\n"}
          <Text style={styles.bold}>Business Information (Business Sellers only):</Text> Business name, GSTIN, registered address, and industry type.
        </Section>

        <Section title="3. How We Use Your Information">
          We use your information to: authenticate your identity and maintain your account; match Seller listings with nearby Aggregators; facilitate order management, pickup scheduling, and OTP-based pickup confirmation; generate GST invoices for eligible transactions; send push notifications about order updates, price alerts, and platform communications (you may manage these preferences in Settings); improve the App through anonymised analytics and crash reporting via Sentry and PostHog; resolve disputes between Sellers and Aggregators; and comply with applicable Indian law including tax and regulatory requirements.
        </Section>

        <Section title="4. AI Image Processing">
          Photographs you upload may be processed by Google's Gemini Vision API to estimate material categories and quantities. We strip all EXIF metadata (including location data embedded in photos) from images before they are processed or stored. AI analysis results are indicative only and are not stored as confirmed transaction data.
        </Section>

        <Section title="5. Sharing of Your Information">
          We share your information only in the following circumstances:{"\n\n"}
          <Text style={styles.bold}>With Aggregators:</Text> When an Aggregator accepts your order, your full pickup address is revealed to them. Before acceptance, only your locality (neighbourhood name) and anonymised coordinates are visible. Your phone number is never shared — all communication occurs through in-app chat.{"\n\n"}
          <Text style={styles.bold}>With Service Providers:</Text> We use Azure PostgreSQL (database), Cloudflare R2 (storage), Meta WhatsApp Business API (OTP delivery), Google Gemini API (image analysis), Expo (push notifications), Sentry (error monitoring), and PostHog (product analytics). These providers process your data only as necessary to deliver their services and are bound by appropriate data processing agreements.{"\n\n"}
          <Text style={styles.bold}>For Legal Compliance:</Text> We may disclose your information if required to do so by law, court order, or regulatory authority in India.{"\n\n"}
          <Text style={styles.bold}>Business Transfers:</Text> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change via in-app notification.{"\n\n"}
          We do not sell your personal information to advertisers or third parties.
        </Section>

        <Section title="6. Advertisements">
          The App displays non-intrusive banner advertisements. Advertisers do not receive your personal information. Ad targeting, if any, is based only on non-identifiable contextual signals such as the city you are in.
        </Section>

        <Section title="7. Data Retention">
          Account information is retained for the duration of your account and for 5 years after account deletion, as required by Indian tax and commercial record-keeping regulations. Transaction records and GST invoices are retained for 6 years as required by the CGST Act, 2017. Chat messages are retained for 6 months after order completion to support dispute resolution. Scale photographs are retained for 12 months.
        </Section>

        <Section title="8. Data Security">
          We implement industry-standard technical and organisational measures to protect your personal data. These include: TLS encryption for all data in transit; private cloud storage with short-lived signed URLs for sensitive media; OTP-based authentication with no static passwords stored; and regular security reviews. However, no system is completely secure and we cannot guarantee absolute security.
        </Section>

        <Section title="9. Your Rights">
          Under applicable Indian data protection law, you have the right to: access the personal information we hold about you; request correction of inaccurate information; request deletion of your account and associated data (subject to legal retention obligations); withdraw consent for non-essential data processing; and lodge a complaint with the relevant data protection authority. To exercise any of these rights, contact us at privacy@sortt.in.
        </Section>

        <Section title="10. Children's Privacy">
          The App is not intended for use by persons under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that a minor has registered, we will delete the account.
        </Section>

        <Section title="11. Changes to This Policy">
          We may update this Privacy Policy from time to time. We will notify you of material changes via in-app notification. The "Effective Date" at the top of this page will reflect the date of the most recent revision.
        </Section>

        <Section title="12. Contact">
          For privacy-related queries or to exercise your rights:{"\n"}
          Sortt Technologies Pvt. Ltd.{"\n"}
          Email: privacy@sortt.in{"\n"}
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
  bold: {
    fontWeight: '700',
    color: colors.navy,
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
