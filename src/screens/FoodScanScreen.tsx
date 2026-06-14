import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { analyzeFoodImage, FoodAnalysisResult } from '../services/aiService';
import { addFoodEntry, getSettings } from '../services/storageService';
import { FoodEntry } from '../types';
import { colors, spacing, borderRadius, typography } from '../theme';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export function FoodScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'idle' | 'camera' | 'analyzing' | 'result'>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo) {
        setImageUri(photo.uri);
        await analyzeImage(photo.uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handlePickImage = async () => {
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
    setMode('analyzing');
    const settings = await getSettings();
    const key = settings.claudeApiKey || apiKey;
    if (!key) {
      setMode('idle');
      setApiKeyModal(true);
      return;
    }
    try {
      const analysis = await analyzeFoodImage(uri, key);
      setResult(analysis);
      setMode('result');
    } catch (e) {
      Alert.alert('Analysis failed', 'Could not analyze the image. Please check your API key and try again.');
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
    Alert.alert('Saved!', `${result.name} added to today's log`, [
      { text: 'OK', onPress: () => { setMode('idle'); setResult(null); setImageUri(null); } },
    ]);
  };

  const handleOpenCamera = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) { Alert.alert('Camera permission required'); return; }
    }
    setMode('camera');
  };

  if (mode === 'camera') {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Center your food in the frame</Text>
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
        </CameraView>
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
    );
  }

  // Idle state
  return (
    <View style={styles.idle}>
      <Modal visible={apiKeyModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Claude API Key Required</Text>
            <Text style={styles.modalSubtext}>Enter your Anthropic API key to enable AI food analysis</Text>
            <TextInput
              style={styles.apiKeyInput}
              placeholder="sk-ant-..."
              placeholderTextColor={colors.textMuted}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setApiKeyModal(false);
                if (imageUri) analyzeImage(imageUri);
              }}
            >
              <Text style={styles.modalBtnText}>Analyze Food</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setApiKeyModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, width: '100%', gap: spacing.md },
  modalTitle: { ...typography.h2, color: colors.text },
  modalSubtext: { ...typography.body, color: colors.textSecondary },
  apiKeyInput: { backgroundColor: colors.surfaceElevated, borderRadius: borderRadius.md, padding: spacing.md, color: colors.text, ...typography.body, borderWidth: 1, borderColor: colors.border },
  modalBtn: { backgroundColor: colors.primary, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center' },
  modalBtnText: { ...typography.bodyBold, color: colors.text },
  modalCancel: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
});
