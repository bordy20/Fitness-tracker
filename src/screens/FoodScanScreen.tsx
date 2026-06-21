import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { analyzeFoodImage, FoodAnalysisResult, AIProvider } from '../services/aiService';
import { addFoodEntry, getSettings } from '../services/storageService';
import { FoodEntry } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';
import { Toast } from '../components/Toast';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const PROVIDER_LABELS: Record<AIProvider, string> = {
  claude: 'Claude',
  openai: 'GPT-4o',
  gemini: 'Gemini',
  groq:   'Groq (Llama)',
  xai:    'Grok (xAI)',
};

export function FoodScanScreen() {
  const [mode, setMode] = useState<'idle' | 'camera' | 'analyzing' | 'result'>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [availableProviders, setAvailableProviders] = useState<{ provider: AIProvider; key: string }[]>([]);
  const [activeProvider, setActiveProvider] = useState<AIProvider | null>(null);
  const [activeKey, setActiveKey] = useState('');
  const webFileRef = useRef<HTMLInputElement | null>(null);

  useFocusEffect(useCallback(() => {
    getSettings().then(s => {
      const all = ([
        ['claude', s.claudeApiKey],
        ['openai', s.openaiApiKey],
        ['gemini', s.geminiApiKey],
        ['groq',   s.groqApiKey],
        ['xai',    s.xaiApiKey],
      ] as [AIProvider, string][])
        .filter(([, k]) => k?.trim())
        .map(([provider, key]) => ({ provider, key }));

      setAvailableProviders(all);
      setActiveProvider(prev => {
        const match = all.find(p => p.provider === prev);
        if (match) { setActiveKey(match.key); return prev; }
        if (all.length) { setActiveKey(all[0].key); return all[0].provider; }
        setActiveKey(''); return null;
      });
    });
  }, []));
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
  }, []);

  const handleWebFilePick = (useCamera = false) => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCamera) input.setAttribute('capture', 'environment');
    // Must be in the DOM for iOS Safari to allow programmatic .click()
    input.style.cssText = 'position:fixed;top:-200px;left:-200px;opacity:0;';
    document.body.appendChild(input);
    const cleanup = () => { if (document.body.contains(input)) document.body.removeChild(input); };
    input.onchange = async (e: Event) => {
      cleanup();
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUri = ev.target?.result as string;
        setImageUri(dataUri);
        await analyzeImage(dataUri);
      };
      reader.readAsDataURL(file);
    };
    input.addEventListener('cancel', cleanup);
    input.click();
  };

  const handleCapture = async () => {
    if (Platform.OS === 'web') { handleWebFilePick(true); return; }
    const { CameraView } = await import('expo-camera');
    void CameraView; // type-only usage to keep import
    try {
      const { CameraView: CV } = await import('expo-camera');
      // handled above for web; this path is native only
      Alert.alert('Error', 'Failed to capture photo');
    } catch (e) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handlePickImage = async () => {
    if (Platform.OS === 'web') { handleWebFilePick(false); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      await analyzeImage(uri);
    }
  };

  const analyzeImage = async (uri: string) => {
    if (!activeKey || !activeProvider) {
      setMode('idle');
      Alert.alert('API Key Missing', 'Go to Profile → AI Settings and add an API key to enable food scanning.');
      return;
    }
    setMode('analyzing');
    try {
      const analysis = await analyzeFoodImage(uri, activeKey, activeProvider);
      setResult(analysis);
      setMode('result');
    } catch (e) {
      Alert.alert('Analysis failed', `Could not analyze the image. Please check your ${PROVIDER_LABELS[activeProvider]} API key in Profile → AI Settings.`);
      setMode('idle');
    }
  };

  const handleSave = async () => {
    if (!result) return;
    const entry: FoodEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      name: result.name,
      description: result.description,
      imageUri: imageUri ?? undefined,
      macros: result.macros,
      servingSize: result.servingSize,
      mealType,
    };
    await addFoodEntry(entry);
    showToast(`${result.name} added to log!`);
    setTimeout(() => { setMode('idle'); setResult(null); setImageUri(null); }, 1500);
  };

  const handleOpenCamera = async () => {
    if (Platform.OS === 'web') { handleWebFilePick(true); return; }
    setMode('camera');
  };

  if (mode === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <View style={[styles.camera, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Camera available on device — use gallery instead</Text>
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.galleryBtn} onPress={() => { setMode('idle'); handlePickImage(); }}>
              <Ionicons name="images-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setMode('idle')}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (mode === 'analyzing') {
    return (
      <View style={styles.analyzingContainer}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.analyzingImage} blurRadius={3} />}
        <View style={styles.analyzingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.analyzingTitle}>Analyzing with AI...</Text>
          <Text style={styles.analyzingSubtext}>Detecting food and calculating macros</Text>
        </View>
      </View>
    );
  }

  if (mode === 'result' && result) {
    const healthColor = result.healthScore >= 7 ? colors.accent : result.healthScore >= 4 ? colors.warning : colors.error;
    return (
      <View style={{ flex: 1 }}>
      <Toast visible={toast.visible} message={toast.message} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.resultImage} />}
        <LinearGradient colors={['transparent', colors.background]} style={styles.imageFade} />

        <View style={styles.resultContent}>
          <View style={styles.resultHeader}>
            <View style={styles.resultTitleRow}>
              <Text style={styles.resultName}>{result.name}</Text>
              <View style={[styles.healthBadge, { backgroundColor: healthColor + '20', borderColor: healthColor + '40' }]}>
                <Text style={[styles.healthScore, { color: healthColor }]}>{result.healthScore}/10</Text>
              </View>
            </View>
            <Text style={styles.resultDesc}>{result.description}</Text>
            <Text style={styles.servingSize}>{result.servingSize}</Text>
          </View>

          {/* Macro Cards */}
          <View style={styles.macroCards}>
            <View style={[styles.macroCard, { borderColor: colors.calories + '40' }]}>
              <Text style={[styles.macroCardValue, { color: colors.calories }]}>{result.macros.calories}</Text>
              <Text style={styles.macroCardLabel}>Calories</Text>
            </View>
            <View style={[styles.macroCard, { borderColor: colors.protein + '40' }]}>
              <Text style={[styles.macroCardValue, { color: colors.protein }]}>{result.macros.protein}g</Text>
              <Text style={styles.macroCardLabel}>Protein</Text>
            </View>
            <View style={[styles.macroCard, { borderColor: colors.carbs + '40' }]}>
              <Text style={[styles.macroCardValue, { color: colors.carbs }]}>{result.macros.carbs}g</Text>
              <Text style={styles.macroCardLabel}>Carbs</Text>
            </View>
            <View style={[styles.macroCard, { borderColor: colors.fat + '40' }]}>
              <Text style={[styles.macroCardValue, { color: colors.fat }]}>{result.macros.fat}g</Text>
              <Text style={styles.macroCardLabel}>Fat</Text>
            </View>
          </View>

          {/* Extra macros */}
          <View style={styles.extraMacros}>
            {result.macros.fiber !== undefined && (
              <View style={styles.extraMacroItem}>
                <Text style={styles.extraMacroLabel}>Fiber</Text>
                <Text style={styles.extraMacroValue}>{result.macros.fiber}g</Text>
              </View>
            )}
            {result.macros.sugar !== undefined && (
              <View style={styles.extraMacroItem}>
                <Text style={styles.extraMacroLabel}>Sugar</Text>
                <Text style={styles.extraMacroValue}>{result.macros.sugar}g</Text>
              </View>
            )}
          </View>

          {/* Meal type */}
          <View style={styles.mealTypeSection}>
            <Text style={styles.mealTypeTitle}>Meal Type</Text>
            <View style={styles.mealTypeRow}>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealTypeBtn, mealType === m && styles.mealTypeBtnActive]}
                  onPress={() => setMealType(m)}
                >
                  <Text style={[styles.mealTypeBtnText, mealType === m && styles.mealTypeBtnTextActive]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Health Tips */}
          {result.tips.length > 0 && (
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>Health Tips</Text>
              {result.tips.map((tip, i) => (
                <View key={i} style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Ingredients */}
          {result.ingredients.length > 0 && (
            <View style={styles.ingredientsSection}>
              <Text style={styles.ingredientsTitle}>Detected Ingredients</Text>
              <View style={styles.ingredientsList}>
                {result.ingredients.map((ing, i) => (
                  <View key={i} style={styles.ingredientChip}>
                    <Text style={styles.ingredientText}>{ing}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.saveBtnGradient}>
                <Ionicons name="add-circle" size={20} color={colors.text} />
                <Text style={styles.saveBtnText}>Add to Log</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rescanBtn} onPress={() => { setMode('idle'); setResult(null); setImageUri(null); }}>
              <Text style={styles.rescanText}>Scan Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </View>
    );
  }

  // Idle state
  return (
    <View style={styles.idle}>
      <Toast visible={toast.visible} message={toast.message} />

      {availableProviders.length === 0 ? (
        <View style={styles.noKeyBanner}>
          <Ionicons name="key-outline" size={18} color={colors.warning} />
          <Text style={styles.noKeyText}>
            Add an API key in <Text style={styles.noKeyLink}>Profile → AI Settings</Text> to enable food scanning
          </Text>
        </View>
      ) : (
        <View style={styles.providerRow}>
          {availableProviders.map(({ provider }) => (
            <TouchableOpacity
              key={provider}
              style={[styles.providerChip, activeProvider === provider && styles.providerChipActive]}
              onPress={() => {
                const p = availableProviders.find(x => x.provider === provider)!;
                setActiveProvider(p.provider);
                setActiveKey(p.key);
              }}
            >
              <Text style={[styles.providerChipText, activeProvider === provider && styles.providerChipTextActive]}>
                {PROVIDER_LABELS[provider]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.idleHeader}>
        <Text style={styles.idleTitle}>Food Scanner</Text>
        <Text style={styles.idleSubtitle}>Scan your food to get instant macro analysis powered by AI</Text>
      </View>

      <View style={styles.scanOptions}>
        <TouchableOpacity style={styles.scanOption} onPress={handleOpenCamera}>
          <LinearGradient colors={['#3A3A5E', '#2A2A4E']} style={styles.scanOptionGradient}>
            <View style={styles.scanOptionIcon}>
              <Ionicons name="camera" size={36} color={colors.primary} />
            </View>
            <Text style={styles.scanOptionTitle}>Take Photo</Text>
            <Text style={styles.scanOptionDesc}>Use your camera to capture food</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.scanOption} onPress={handlePickImage}>
          <LinearGradient colors={['#3A3A5E', '#2A2A4E']} style={styles.scanOptionGradient}>
            <View style={styles.scanOptionIcon}>
              <Ionicons name="images" size={36} color={colors.accent} />
            </View>
            <Text style={styles.scanOptionTitle}>Choose Photo</Text>
            <Text style={styles.scanOptionDesc}>Pick from your photo library</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>What AI detects:</Text>
        {[
          { icon: 'nutrition-outline', text: 'Calories, protein, carbs & fat' },
          { icon: 'leaf-outline', text: 'Ingredients & portion size' },
          { icon: 'heart-outline', text: 'Health score & tips' },
          { icon: 'list-outline', text: 'Sugar & fiber content' },
        ].map(({ icon, text }, i) => (
          <View key={i} style={styles.feature}>
            <Ionicons name={icon as any} size={16} color={colors.primary} />
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 100 },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
  scanFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  scanHint: { ...typography.body, color: colors.text, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  cameraControls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 40, paddingHorizontal: spacing.xl },
  galleryBtn: { width: 48, height: 48, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  captureBtn: { width: 72, height: 72, backgroundColor: colors.text, borderRadius: 36, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)' },
  captureBtnInner: { width: 58, height: 58, backgroundColor: colors.text, borderRadius: 29 },
  closeBtn: { width: 48, height: 48, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  analyzingContainer: { flex: 1, backgroundColor: colors.background },
  analyzingImage: { width: '100%', height: '100%', position: 'absolute' },
  analyzingOverlay: { flex: 1, backgroundColor: 'rgba(15,15,26,0.85)', justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  analyzingTitle: { ...typography.h2, color: colors.text },
  analyzingSubtext: { ...typography.body, color: colors.textSecondary },
  resultImage: { width: '100%', height: 280, resizeMode: 'cover' },
  imageFade: { position: 'absolute', top: 200, left: 0, right: 0, height: 80 },
  resultContent: { padding: spacing.md, gap: spacing.md },
  resultHeader: { gap: spacing.xs },
  resultTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultName: { ...typography.h1, color: colors.text, flex: 1 },
  healthBadge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, borderWidth: 1 },
  healthScore: { ...typography.captionBold },
  resultDesc: { ...typography.body, color: colors.textSecondary },
  servingSize: { ...typography.caption, color: colors.textMuted },
  macroCards: { flexDirection: 'row', gap: spacing.sm },
  macroCard: { flex: 1, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center', borderWidth: 1, gap: 2 },
  macroCardValue: { ...typography.h3, fontWeight: '800' },
  macroCardLabel: { ...typography.caption, color: colors.textSecondary },
  extraMacros: { flexDirection: 'row', gap: spacing.md },
  extraMacroItem: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  extraMacroLabel: { ...typography.caption, color: colors.textMuted },
  extraMacroValue: { ...typography.captionBold, color: colors.textSecondary },
  mealTypeSection: { gap: spacing.sm },
  mealTypeTitle: { ...typography.bodyBold, color: colors.text },
  mealTypeRow: { flexDirection: 'row', gap: spacing.sm },
  mealTypeBtn: { flex: 1, paddingVertical: spacing.sm, backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  mealTypeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  mealTypeBtnText: { ...typography.caption, color: colors.textSecondary },
  mealTypeBtnTextActive: { color: colors.primary },
  tipsSection: { gap: spacing.sm },
  tipsTitle: { ...typography.bodyBold, color: colors.text },
  tipItem: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  tipText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  ingredientsSection: { gap: spacing.sm },
  ingredientsTitle: { ...typography.bodyBold, color: colors.text },
  ingredientsList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  ingredientChip: { backgroundColor: colors.surfaceElevated, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  ingredientText: { ...typography.caption, color: colors.textSecondary },
  actionButtons: { gap: spacing.sm, marginTop: spacing.sm },
  saveBtn: { borderRadius: borderRadius.lg, overflow: 'hidden' },
  saveBtnGradient: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  saveBtnText: { ...typography.bodyBold, color: colors.text },
  rescanBtn: { paddingVertical: spacing.md, alignItems: 'center' },
  rescanText: { ...typography.body, color: colors.textSecondary },
  idle: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.xl },
  idleHeader: { paddingTop: spacing.xl, gap: spacing.xs },
  idleTitle: { ...typography.h1, color: colors.text },
  idleSubtitle: { ...typography.body, color: colors.textSecondary },
  scanOptions: { flexDirection: 'row', gap: spacing.md },
  scanOption: { flex: 1 },
  scanOptionGradient: { borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.sm },
  scanOptionIcon: { width: 64, height: 64, backgroundColor: colors.background + '80', borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center' },
  scanOptionTitle: { ...typography.bodyBold, color: colors.text },
  scanOptionDesc: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  featuresSection: { gap: spacing.sm },
  featuresTitle: { ...typography.bodyBold, color: colors.textSecondary },
  feature: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  featureText: { ...typography.body, color: colors.textSecondary },
  noKeyBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.warning + '18', borderRadius: borderRadius.md, padding: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md },
  noKeyText: { ...typography.caption, color: colors.warning, flex: 1 },
  noKeyLink: { fontWeight: '700', textDecorationLine: 'underline' },
  providerRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  providerChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  providerChipActive: { backgroundColor: colors.primary + '20', borderColor: colors.primary },
  providerChipText: { ...typography.captionBold, color: colors.textSecondary },
  providerChipTextActive: { color: colors.primary },
});
