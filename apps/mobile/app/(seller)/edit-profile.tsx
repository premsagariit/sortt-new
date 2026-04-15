/**
 * app/(seller)/edit-profile.tsx
 * ──────────────────────────────────────────────────────────────────
 * Edit Profile screen.
 * Updates user name and locality in authStore with validation (BSE finding).
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, EnvelopeSimple, MapPin, User, CheckCircle } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { safeBack } from '../../utils/navigation';

import { colors, colorExtended, spacing, radius } from '../../constants/tokens';
import { NavBar } from '../../components/ui/NavBar';
import { Text, Numeric } from '../../components/ui/Typography';
import { PrimaryButton } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

const AVATAR_SOURCE = require('../../assets/avatar_placeholder.png');

export default function EditProfile() {
  const router = useRouter();
  const { name, email, locality, city, accountType, profilePhoto, setName, setEmail, setLocality, setProfilePhoto, token } = useAuthStore();

  const [newName, setNewName] = useState(name);
  const [newEmail, setNewEmail] = useState(email);
  const [newLocality, setNewLocality] = useState(locality);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        setIsUploadingPhoto(true);
        setError(null);
        
        const localUri = asset.uri;
        const filename = localUri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        const formData = new FormData();
        formData.append('photo', {
          uri: localUri,
          name: filename,
          type,
        } as any);

        const uploadRes = await api.post('/api/users/profile-photo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (uploadRes.data?.profile_photo_url) {
          setProfilePhoto(uploadRes.data.profile_photo_url);
        }
      }
    } catch (err: any) {
      console.error('Error uploading photo', err);
      setError('Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = () => {
    // 🛡️ BSE Security Finding 1: Input Validation / Trimming
    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim();
    const trimmedLocality = newLocality.trim();

    if (trimmedName.length === 0) {
      setError('Name cannot be empty');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Name is too long (max 50 chars)');
      return;
    }

    if (trimmedEmail.length > 0 && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Enter a valid email address');
      return;
    }

    if (trimmedLocality.length > 80) {
      setError('Locality is too long (max 80 chars)');
      return;
    }

    setIsSaving(true);
    setError(null);

    void (async () => {
      try {
        await api.post('/api/users/profile', {
          name: trimmedName,
          email: trimmedEmail || null,
          locality: trimmedLocality,
          city_code: city,
          profile_type: accountType ?? 'individual',
        });

        setName(trimmedName);
        setEmail(trimmedEmail);
        setLocality(trimmedLocality);
        setIsSaving(false);
        router.back();
      } catch (saveError: any) {
        setIsSaving(false);
        setError(saveError?.response?.data?.error || saveError?.message || 'Failed to update profile');
      }
    })();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <NavBar 
        title="Edit Profile" 
        variant="light" 
        onBack={() => safeBack()} 
      />

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrap} onPress={handlePickImage} disabled={isUploadingPhoto || isSaving}>
            <Avatar 
              name={name} 
              userType="seller" 
              size="lg" 
              uri={profilePhoto || undefined}
            />
            <View style={styles.cameraIcon}>
              <Camera size={18} color={colors.surface} weight="fill" />
            </View>
          </Pressable>
          <Text variant="label" color={colors.teal} style={{ marginTop: 12, fontWeight: '600' }}>
            {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text variant="label" color={colors.muted} style={styles.inputLabel}>FULL NAME</Text>
            <View style={styles.inputWrap}>
              <User size={20} color={colors.muted} />
              <TextInput 
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Enter your name"
                placeholderTextColor={colors.muted}
                maxLength={60} // Slightly above 50 for better UX during typing
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text variant="label" color={colors.muted} style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputWrap}>
              <EnvelopeSimple size={20} color={colors.muted} />
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={120}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text variant="label" color={colors.muted} style={styles.inputLabel}>LOCALITY / AREA</Text>
            <View style={styles.inputWrap}>
              <MapPin size={20} color={colors.muted} />
              <TextInput 
                style={styles.input}
                value={newLocality}
                onChangeText={setNewLocality}
                placeholder="e.g. Madhapur"
                placeholderTextColor={colors.muted}
                maxLength={90}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text variant="label" color={colors.muted} style={styles.inputLabel}>CITY</Text>
            <View style={[styles.inputWrap, styles.inputDisabled]}>
              <MapPin size={20} color={colors.muted} weight="fill" />
              <Text variant="body" color={colors.muted} style={styles.inputTextDisabled}>{city}</Text>
              <View style={styles.pilotPill}>
                <Text variant="caption" color={colors.amber} style={{ fontSize: 10, fontWeight: '700' }}>PILOT</Text>
              </View>
            </View>
            <Text variant="caption" color={colors.muted} style={{ marginTop: 8 }}>
              City switching is disabled during the Hyderabad pilot phase.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text variant="caption" color={colors.red}>{error}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />

        <PrimaryButton 
          label={isSaving ? "Saving..." : "Save Changes"} 
          onPress={handleSave}
          disabled={isSaving}
        />
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: spacing.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.navy,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    height: 56,
    gap: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: colors.navy,
    height: '100%',
  },
  inputDisabled: {
    backgroundColor: colorExtended.surface2,
  },
  inputTextDisabled: {
    flex: 1,
  },
  pilotPill: {
    backgroundColor: colorExtended.amberLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 0, 0.1)',
  },
});
