import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { signInWithGoogle, signInWithGithub, isFirebaseConfigured, AuthUser } from '../services/authService';
import { colors, spacing, borderRadius, typography } from '../theme';

interface Props {
  onLogin: (user: AuthUser) => void;
}

export function LoginScreen({ onLogin }: Props) {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setLoading('google');
    try {
      const user = await signInWithGoogle();
      onLogin(user);
    } catch (e: any) {
      setError(e.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleGithub = async () => {
    setError(null);
    setLoading('github');
    try {
      const user = await signInWithGithub();
      onLogin(user);
    } catch (e: any) {
      setError(e.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <LinearGradient colors={['#0F0F1A', '#1A1A2E', '#0F0F1A']} style={styles.container}>
      {/* Logo / App name */}
      <View style={styles.hero}>
        <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.logoCircle}>
          <Ionicons name="fitness" size={48} color={colors.text} />
        </LinearGradient>
        <Text style={styles.appName}>FitTrack AI</Text>
        <Text style={styles.tagline}>Your personal fitness companion</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {[
          { icon: 'camera-outline', text: 'AI food scanning & macro tracking' },
          { icon: 'barbell-outline', text: 'Exercise logging & calorie burn' },
          { icon: 'walk-outline', text: 'Step tracking & daily goals' },
          { icon: 'water-outline', text: 'Hydration & nutrition insights' },
        ].map(({ icon, text }, i) => (
          <View key={i} style={styles.feature}>
            <View style={styles.featureIcon}>
              <Ionicons name={icon as any} size={18} color={colors.primary} />
            </View>
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Sign-in buttons */}
      <View style={styles.authSection}>
        {!isFirebaseConfigured && (
          <View style={styles.setupBanner}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={styles.setupText}>
              Firebase not configured yet. Set up your project to enable sign-in.
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.providerBtn, !isFirebaseConfigured && styles.btnDisabled]}
          onPress={handleGoogle}
          disabled={!isFirebaseConfigured || loading !== null}
        >
          {loading === 'google' ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.providerBtnText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.providerBtn, styles.githubBtn, !isFirebaseConfigured && styles.btnDisabled]}
          onPress={handleGithub}
          disabled={!isFirebaseConfigured || loading !== null}
        >
          {loading === 'github' ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <>
              <Ionicons name="logo-github" size={22} color={colors.text} />
              <Text style={styles.providerBtnText}>Continue with GitHub</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing, you agree that your data is stored locally on your device.
        </Text>
      </View>
    </LinearGradient>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIcon}>
      <Text style={styles.googleG}>G</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'space-between', padding: spacing.xl, paddingTop: 80, paddingBottom: 48 },
  hero: { alignItems: 'center', gap: spacing.md },
  logoCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center' },
  appName: { ...typography.h1, color: colors.text, fontSize: 32 },
  tagline: { ...typography.body, color: colors.textSecondary },
  features: { gap: spacing.md, paddingHorizontal: spacing.sm },
  feature: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { width: 40, height: 40, backgroundColor: colors.primary + '20', borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  featureText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  authSection: { gap: spacing.md },
  setupBanner: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.warning + '15', padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'flex-start' },
  setupText: { ...typography.caption, color: colors.warning, flex: 1 },
  errorBanner: { flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.error + '15', padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  errorText: { ...typography.caption, color: colors.error, flex: 1 },
  providerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border },
  githubBtn: { backgroundColor: '#24292E' },
  btnDisabled: { opacity: 0.4 },
  providerBtnText: { ...typography.bodyBold, color: colors.text },
  googleIcon: { width: 22, height: 22, backgroundColor: '#fff', borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  googleG: { color: '#4285F4', fontWeight: '700', fontSize: 14 },
  legal: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
