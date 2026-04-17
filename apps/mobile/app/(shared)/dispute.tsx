import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Warning, UploadSimple, Camera, ImagesSquare, XCircle } from 'phosphor-react-native';
import * as FileSystem from 'expo-file-system';

import { colors, spacing, radius } from '../../constants/tokens';
import { Text, Numeric } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { NavBar } from '../../components/ui/NavBar';
import { StatusChip } from '../../components/ui/StatusChip';
import { BaseCard } from '../../components/ui/Card';
import { useAuthStore } from '../../store/authStore';
import { useOrderStore } from '../../store/orderStore';
import { api } from '../../lib/api';
import { safeBack } from '../../utils/navigation';
import { usePhotoCapture } from '../../hooks/usePhotoCapture';

type IssueOption = {
  id: string;
  label: string;
};

type DisputeSummary = {
  id: string;
  uuid?: string;
  order_id: string;
  issue_type: string;
  description: string;
  status: string;
  resolution_note?: string | null;
  created_at: string;
  resolved_at?: string | null;
};

type DisputeEvidenceItem = {
  id: string;
  url: string | null;
  created_at: string;
  expires_at?: string | null;
  uploaded_by_role?: 'seller' | 'aggregator' | 'admin' | 'user' | string;
  uploaded_by_label?: string;
  uploaded_by_name?: string | null;
};

const AGGREGATOR_ISSUES: IssueOption[] = [
  { id: 'no_show', label: 'Seller was not present at address' },
  { id: 'wrong_weight', label: 'Wrong weight recorded' },
  { id: 'abusive_behaviour', label: 'Abusive or unsafe behaviour' },
  { id: 'payment_not_made', label: 'Payment not made' },
  { id: 'other', label: 'Other' },
];

const SELLER_ISSUES: IssueOption[] = [
  { id: 'wrong_weight', label: 'Wrong weight recorded' },
  { id: 'payment_not_made', label: 'Payment not made' },
  { id: 'no_show', label: 'Aggregator no-show' },
  { id: 'abusive_behaviour', label: 'Abusive or unsafe behaviour' },
  { id: 'other', label: 'Other' },
];

const ISSUE_LABEL_BY_ID: Record<string, string> = {
  wrong_weight: 'Wrong weight recorded',
  payment_not_made: 'Payment not made',
  no_show: 'No-show',
  abusive_behaviour: 'Abusive or unsafe behaviour',
  other: 'Other',
};

const inferUploadMimeType = (uri: string): 'image/jpeg' | 'image/png' | 'image/heic' => {
  const lower = String(uri || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
};

const inferUploadExtension = (mimeType: 'image/jpeg' | 'image/png' | 'image/heic'): 'jpg' | 'png' | 'heic' => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/heic') return 'heic';
  return 'jpg';
};

type FileSystemCompat = {
  cacheDirectory?: string | null;
  documentDirectory?: string | null;
  copyAsync: (options: { from: string; to: string }) => Promise<void>;
};

export default function DisputeScreen() {
  const insets = useSafeAreaInsets();
  const userType = useAuthStore((state) => state.userType);
  const authToken = useAuthStore((state) => state.token);
  const orders = useOrderStore((state) => state.orders);
  const fetchOrder = useOrderStore((state) => state.fetchOrder);

  const params = useLocalSearchParams<{ orderId?: string; id?: string; disputeId?: string; fallbackRoute?: string }>();
  const orderId = typeof params.orderId === 'string'
    ? params.orderId
    : (typeof params.id === 'string' ? params.id : '');
  const fallbackRoute = typeof params.fallbackRoute === 'string'
    ? params.fallbackRoute
    : (userType === 'aggregator' ? '/(aggregator)/orders' : '/(seller)/orders');

  const [activeDisputeId, setActiveDisputeId] = useState<string>(
    typeof params.disputeId === 'string' ? params.disputeId : ''
  );
  const [dispute, setDispute] = useState<DisputeSummary | null>(null);
  const [evidence, setEvidence] = useState<DisputeEvidenceItem[]>([]);
  const [isLoadingDispute, setIsLoadingDispute] = useState(false);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    photoUri,
    capturePhoto,
    pickFromGallery,
    permissionDenied,
    mediaPermissionDenied,
    isLoading: mediaBusy,
    reset: clearPhoto,
  } = usePhotoCapture({ allowsEditing: false });

  const order = orders.find((item: any) => item.orderId === orderId);

  useEffect(() => {
    if (!orderId || order) return;
    void fetchOrder(orderId, true);
  }, [orderId, order, fetchOrder]);

  const loadDisputeDetail = useCallback(async (targetDisputeId: string) => {
    if (!targetDisputeId) return;
    setIsLoadingDispute(true);
    try {
      const res = await api.get(`/api/disputes/${targetDisputeId}`);
      setDispute(res?.data?.dispute ?? null);
      setEvidence(Array.isArray(res?.data?.evidence) ? res.data.evidence : []);
    } catch {
      setDispute(null);
      setEvidence([]);
    } finally {
      setIsLoadingDispute(false);
    }
  }, []);

  useEffect(() => {
    if (!activeDisputeId) return;
    void loadDisputeDetail(activeDisputeId);
  }, [activeDisputeId, loadDisputeDetail]);

  useEffect(() => {
    if (!orderId || activeDisputeId) return;
    api.get(`/api/orders/${orderId}/dispute`)
      .then((res) => {
        const summaryDisputeId = res?.data?.dispute?.id;
        if (typeof summaryDisputeId === 'string' && summaryDisputeId.length > 0) {
          setActiveDisputeId(summaryDisputeId);
        }
      })
      .catch(() => null);
  }, [orderId, activeDisputeId]);

  const issueOptions = userType === 'aggregator' ? AGGREGATOR_ISSUES : SELLER_ISSUES;
  const counterpartyName = userType === 'aggregator'
    ? order?.sellerName || 'Seller'
    : order?.aggregatorName || 'Aggregator';
  const statusLabel = order?.status || 'completed';
  const disputeDateLabel = useMemo(() => {
    const completedEvent = Array.isArray(order?.history)
      ? [...order.history].reverse().find((entry: any) => entry?.new_status === 'completed')
      : null;
    const iso = completedEvent?.created_at || order?.updatedAt || order?.createdAt;
    return iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently completed';
  }, [order?.history, order?.updatedAt, order?.createdAt]);

  const isViewMode = Boolean(dispute?.id);
  const visibleEvidence = useMemo(
    () => evidence.filter((item): item is DisputeEvidenceItem & { url: string } => typeof item.url === 'string' && item.url.length > 0),
    [evidence]
  );
  const canUploadEvidence = isViewMode && dispute?.status === 'open';
  const isCreateFormValid = !!orderId && selectedIssue !== null && description.trim().length >= 10;

  const ensureUploadableUri = useCallback(async (uri: string, extension: string): Promise<string> => {
    if (Platform.OS === 'android' && uri.startsWith('content://')) {
      try {
        const fs = FileSystem as unknown as FileSystemCompat;
        const safeDir = fs.cacheDirectory ?? fs.documentDirectory;
        if (!safeDir) return uri;
        const copiedUri = `${safeDir}dispute_upload_${Date.now()}.${extension}`;
        await fs.copyAsync({ from: uri, to: copiedUri });
        return copiedUri;
      } catch {
        return uri;
      }
    }

    return uri;
  }, []);

  const uploadDisputeEvidenceFile = useCallback(async (targetDisputeId: string, sourceUri: string) => {
    const mimeType = inferUploadMimeType(sourceUri);
    const extension = inferUploadExtension(mimeType);
    const uploadUri = await ensureUploadableUri(sourceUri, extension);
    const filename = `dispute_${Date.now()}.${extension}`;
    const url = `${api.defaults.baseURL}/api/disputes/${encodeURIComponent(targetDisputeId)}/evidence`;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const formData = new FormData();
      formData.append('file', {
        uri: uploadUri,
        name: filename,
        type: mimeType,
      } as any);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: formData,
          signal: controller.signal,
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const err: any = new Error(payload?.error || `Evidence upload failed (${response.status})`);
          err.response = { status: response.status, data: payload };
          throw err;
        }

        return;
      } catch (uploadErr: any) {
        const status = uploadErr?.response?.status;
        const retryable =
          !status ||
          status >= 500 ||
          uploadErr?.name === 'AbortError' ||
          String(uploadErr?.message || '').toLowerCase().includes('network');

        if (attempt < maxAttempts && retryable) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 700));
          continue;
        }

        throw uploadErr;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }, [authToken, ensureUploadableUri]);

  const handleSubmit = async () => {
    if (!selectedIssue) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const disputeRes = await api.post('/api/disputes', {
        order_id: orderId,
        issue_type: selectedIssue,
        description: description.trim(),
      });
      const createdDisputeId = disputeRes?.data?.disputeId as string | undefined;
      const createdDisputeUuid = disputeRes?.data?.disputeUuid as string | undefined;
      if (!createdDisputeId) {
        throw new Error('Dispute created but ID missing in response');
      }

      if (photoUri) {
        try {
          const uploadTargetId = createdDisputeUuid || createdDisputeId;
          await uploadDisputeEvidenceFile(uploadTargetId, photoUri);
        } catch (uploadError) {
          console.warn('[Dispute] Evidence upload failed after create', uploadError);
          setSubmitError('Dispute created, but evidence upload failed. Open dispute details and upload evidence again.');
        }
      }

      setActiveDisputeId(createdDisputeId);
      setSelectedIssue(null);
      setDescription('');
      clearPhoto();
      await loadDisputeDetail(createdDisputeId);
    } catch (error: any) {
      const message = error?.response?.data?.message
        || error?.response?.data?.error
        || error?.message
        || 'Failed to submit dispute. Please try again.';
      setSubmitError(String(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadEvidence = async () => {
    if (!photoUri || !dispute?.id) return;
    setIsUploadingEvidence(true);
    setSubmitError(null);
    try {
      await uploadDisputeEvidenceFile(dispute.uuid || dispute.id, photoUri);
      clearPhoto();
      await loadDisputeDetail(dispute.id);
    } catch (error: any) {
      const message = error?.response?.data?.message
        || error?.response?.data?.error
        || 'Failed to upload evidence. Please try again.';
      setSubmitError(String(message));
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  return (
    <View style={styles.container}>
      <NavBar
        title={isViewMode ? 'Dispute Details' : 'File a Dispute'}
        onBack={() => safeBack(fallbackRoute)}
        variant="light"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.banner}>
            <Warning size={18} color={colors.amber} weight="fill" />
            <Text variant="caption" style={styles.bannerText}>
              {isViewMode
                ? `Status: ${String(dispute?.status || '').toUpperCase()}`
                : 'Disputes must be raised within 30 minutes of order completion. Reviewed within 72 hours.'}
            </Text>
          </View>

          <BaseCard style={styles.contextCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text variant="label" style={styles.cardSectionLabel}>{isViewMode ? 'Dispute' : 'Order'}</Text>
                <View style={styles.orderMeta}>
                  <Numeric size={12} color={colors.muted}>
                    {isViewMode
                      ? (dispute?.id || 'Dispute ID unavailable')
                      : (orderId || dispute?.order_id || 'Order ID unavailable')}
                  </Numeric>
                  <StatusChip status={statusLabel as any} />
                </View>
                {isViewMode ? (
                  <Text variant="caption" color={colors.muted}>
                    Order: {dispute?.order_id || orderId || '-'}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text variant="caption" style={styles.partnerInfo}>
              {counterpartyName} - {disputeDateLabel}
            </Text>
          </BaseCard>

          {isLoadingDispute && activeDisputeId && !dispute ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.navy} />
            </View>
          ) : null}

          {isViewMode ? (
            <>
              <BaseCard style={styles.contextCard}>
                <Text variant="label" style={styles.cardSectionLabel}>Issue Type</Text>
                <Text variant="body" style={styles.valueText}>
                  {ISSUE_LABEL_BY_ID[dispute?.issue_type || ''] || dispute?.issue_type || '-'}
                </Text>

                <Text variant="label" style={[styles.cardSectionLabel, { marginTop: spacing.sm }]}>Description</Text>
                <Text variant="body" style={styles.valueText}>{dispute?.description || '-'}</Text>

                <Text variant="label" style={[styles.cardSectionLabel, { marginTop: spacing.sm }]}>Raised At</Text>
                <Text variant="body" style={styles.valueText}>
                  {dispute?.created_at
                    ? new Date(dispute.created_at).toLocaleString('en-IN')
                    : '-'}
                </Text>

                {dispute?.resolution_note ? (
                  <>
                    <Text variant="label" style={[styles.cardSectionLabel, { marginTop: spacing.sm }]}>Resolution Note</Text>
                    <Text variant="body" style={styles.valueText}>{dispute.resolution_note}</Text>
                  </>
                ) : null}
              </BaseCard>

              <View style={styles.section}>
                <Text variant="label" style={styles.sectionLabel}>Evidence</Text>
                {visibleEvidence.length > 0 ? (
                  <View style={styles.evidenceList}>
                    {visibleEvidence.map((item) => (
                      <View key={item.id} style={styles.evidenceItemCard}>
                        <Image source={{ uri: item.url }} style={styles.evidenceItemImage} />
                        <View style={styles.evidenceMetaRow}>
                          <Text variant="caption" style={styles.evidenceMetaLabel}>
                            Uploaded by: {item.uploaded_by_label || 'User'}
                          </Text>
                          <Text variant="caption" color={colors.muted}>
                            {new Date(item.created_at).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.uploadZone}>
                    <UploadSimple size={24} color={colors.muted} weight="regular" />
                    <Text variant="label" color={colors.muted}>No evidence uploaded yet</Text>
                  </View>
                )}
              </View>

              {canUploadEvidence ? (
                <View style={styles.section}>
                  <Text variant="label" style={styles.sectionLabel}>
                    Add More Evidence
                  </Text>
                  {photoUri ? (
                    <View style={styles.evidencePreviewWrap}>
                      <Image source={{ uri: photoUri }} style={styles.evidencePreview} />
                      <Pressable onPress={clearPhoto} style={styles.clearEvidenceBtn}>
                        <XCircle size={18} color={colors.red} weight="fill" />
                        <Text variant="caption" color={colors.red}>Remove</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.uploadZone}>
                      <UploadSimple size={24} color={colors.muted} weight="regular" />
                      <Text variant="label" color={colors.muted}>Attach photo evidence</Text>
                    </View>
                  )}
                  <View style={styles.evidenceActions}>
                    <Pressable onPress={() => void capturePhoto()} style={styles.evidenceActionBtn} disabled={mediaBusy || isUploadingEvidence}>
                      <Camera size={16} color={colors.navy} />
                      <Text variant="caption" color={colors.navy}>Capture</Text>
                    </Pressable>
                    <Pressable onPress={() => void pickFromGallery()} style={styles.evidenceActionBtn} disabled={mediaBusy || isUploadingEvidence}>
                      <ImagesSquare size={16} color={colors.navy} />
                      <Text variant="caption" color={colors.navy}>Gallery</Text>
                    </Pressable>
                  </View>
                  <PrimaryButton
                    label={isUploadingEvidence ? 'Uploading...' : 'Upload Evidence'}
                    onPress={handleUploadEvidence}
                    disabled={!photoUri || isUploadingEvidence}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.section}>
                <Text variant="label" style={styles.sectionLabel}>Issue Type</Text>
                <View style={styles.radioGroup}>
                  {issueOptions.map((option) => {
                    const isSelected = selectedIssue === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => setSelectedIssue(option.id)}
                        style={[
                          styles.radioCard,
                          isSelected && styles.radioCardSelected,
                        ]}
                      >
                        <View style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected,
                        ]} />
                        <Text
                          variant="body"
                          style={[
                            styles.radioLabel,
                            isSelected && { color: colors.navy, fontWeight: '600' } as any,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.section}>
                <Text variant="label" style={styles.sectionLabel}>Describe the issue</Text>
                <TextInput
                  style={styles.descriptionInput}
                  placeholder={userType === 'aggregator'
                    ? 'I arrived at the address but pickup could not be completed...'
                    : 'The aggregator recorded less weight than expected...'}
                  placeholderTextColor={colors.muted}
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                  value={description}
                  onChangeText={setDescription}
                />
                <Text variant="caption" color={colors.muted}>
                  {description.length}/2000
                </Text>
              </View>

              <View style={styles.section}>
                <Text variant="label" style={styles.sectionLabel}>
                  Upload Evidence <Text variant="caption">(Optional)</Text>
                </Text>
                {photoUri ? (
                  <View style={styles.evidencePreviewWrap}>
                    <Image source={{ uri: photoUri }} style={styles.evidencePreview} />
                    <Pressable onPress={clearPhoto} style={styles.clearEvidenceBtn}>
                      <XCircle size={18} color={colors.red} weight="fill" />
                      <Text variant="caption" color={colors.red}>Remove</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.uploadZone}>
                    <UploadSimple size={24} color={colors.muted} weight="regular" />
                    <Text variant="label" color={colors.muted}>Add photo evidence</Text>
                  </View>
                )}
                <View style={styles.evidenceActions}>
                  <Pressable onPress={() => void capturePhoto()} style={styles.evidenceActionBtn} disabled={mediaBusy || isSubmitting}>
                    <Camera size={16} color={colors.navy} />
                    <Text variant="caption" color={colors.navy}>Capture</Text>
                  </Pressable>
                  <Pressable onPress={() => void pickFromGallery()} style={styles.evidenceActionBtn} disabled={mediaBusy || isSubmitting}>
                    <ImagesSquare size={16} color={colors.navy} />
                    <Text variant="caption" color={colors.navy}>Gallery</Text>
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {permissionDenied ? (
            <Text variant="caption" style={styles.errorText}>
              Camera permission denied. Enable camera access in system settings.
            </Text>
          ) : null}
          {mediaPermissionDenied ? (
            <Text variant="caption" style={styles.errorText}>
              Gallery permission denied. Enable photo access in system settings.
            </Text>
          ) : null}
          {submitError ? (
            <Text variant="caption" style={styles.errorText}>{submitError}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {isViewMode ? (
          <PrimaryButton
            label="Back to Receipt"
            onPress={() => safeBack(fallbackRoute)}
          />
        ) : (
          <PrimaryButton
            label={isSubmitting ? 'Submitting...' : 'Submit Dispute'}
            onPress={handleSubmit}
            disabled={!isCreateFormValid || isSubmitting}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: colors.amberLight,
    padding: spacing.md,
    borderRadius: radius.card,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.amber + '20',
  },
  bannerText: {
    flex: 1,
    color: colors.slate,
    lineHeight: 18,
  },
  contextCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardSectionLabel: {
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 4,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  partnerInfo: {
    marginTop: spacing.xs,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontWeight: '700',
    color: colors.navy,
  },
  radioGroup: {
    gap: spacing.sm,
  },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  radioCardSelected: {
    borderColor: colors.navy,
    backgroundColor: colors.bg,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  radioLabel: {
    flex: 1,
    color: colors.slate,
  },
  descriptionInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.input,
    padding: spacing.md,
    height: 100,
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
    color: colors.navy,
  },
  uploadZone: {
    height: 80,
    backgroundColor: colors.surface2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  evidenceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  evidenceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.input,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
  },
  evidencePreviewWrap: {
    gap: spacing.xs,
  },
  evidenceList: {
    gap: spacing.sm,
  },
  evidenceItemCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  evidenceItemImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.surface2,
  },
  evidenceMetaRow: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  evidenceMetaLabel: {
    color: colors.slate,
    fontWeight: '700',
  },
  evidencePreview: {
    width: '100%',
    height: 180,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  clearEvidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  valueText: {
    color: colors.slate,
  },
  loaderWrap: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  errorText: {
    color: colors.red,
  },
});
