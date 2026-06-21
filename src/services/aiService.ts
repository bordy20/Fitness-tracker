import Anthropic from '@anthropic-ai/sdk';
import { Platform } from 'react-native';
import { MacroNutrients } from '../types';

export type AIProvider = 'claude' | 'openai' | 'gemini' | 'groq' | 'xai';

export interface FoodAnalysisResult {
  name: string;
  description: string;
  servingSize: string;
  macros: MacroNutrients;
  ingredients: string[];
  confidence: 'high' | 'medium' | 'low';
  healthScore: number;
  tips: string[];
}

const FOOD_PROMPT = `You are a professional nutritionist and food recognition AI. Analyze this food image and provide detailed nutritional information.

Respond ONLY with a valid JSON object in this exact format:
{
  "name": "Food name",
  "description": "Brief description of the dish",
  "servingSize": "Estimated serving size (e.g., 1 cup, 200g)",
  "macros": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0,
    "sugar": 0
  },
  "ingredients": ["ingredient1", "ingredient2"],
  "confidence": "high|medium|low",
  "healthScore": 7,
  "tips": ["health tip 1", "health tip 2"]
}

All numeric values should be numbers (not strings). Protein, carbs, fat, fiber, sugar in grams. Calories in kcal. Health score 1-10 where 10 is most nutritious.`;

async function toBase64(imageUri: string): Promise<string> {
  if (Platform.OS === 'web') {
    if (imageUri.startsWith('data:')) {
      return imageUri.replace(/^data:image\/\w+;base64,/, '');
    }
    const res = await fetch(imageUri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).replace(/^data:image\/\w+;base64,/, ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  const FileSystem = await import('expo-file-system');
  if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
    return FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
  }
  return imageUri.replace(/^data:image\/\w+;base64,/, '');
}

function parseResult(text: string): FoodAnalysisResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse AI response');
  return JSON.parse(jsonMatch[0]) as FoodAnalysisResult;
}

async function analyzeWithClaude(base64: string, apiKey: string): Promise<FoodAnalysisResult> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
        { type: 'text', text: FOOD_PROMPT },
      ],
    }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return parseResult(text);
}

async function analyzeWithOpenAI(base64: string, apiKey: string): Promise<FoodAnalysisResult> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          { type: 'text', text: FOOD_PROMPT },
        ],
      }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI request failed');
  return parseResult(data.choices[0].message.content);
}

async function analyzeWithGemini(base64: string, apiKey: string): Promise<FoodAnalysisResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
            { text: FOOD_PROMPT },
          ],
        }],
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Gemini request failed');
  return parseResult(data.candidates[0].content.parts[0].text);
}

async function analyzeWithGroq(base64: string, apiKey: string): Promise<FoodAnalysisResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          { type: 'text', text: FOOD_PROMPT },
        ],
      }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Groq request failed');
  return parseResult(data.choices[0].message.content);
}

async function analyzeWithXAI(base64: string, apiKey: string): Promise<FoodAnalysisResult> {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'grok-2-vision-latest',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          { type: 'text', text: FOOD_PROMPT },
        ],
      }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'xAI request failed');
  return parseResult(data.choices[0].message.content);
}

export async function analyzeFoodImage(
  imageUri: string,
  apiKey: string,
  provider: AIProvider = 'claude'
): Promise<FoodAnalysisResult> {
  const base64 = await toBase64(imageUri);
  switch (provider) {
    case 'openai': return analyzeWithOpenAI(base64, apiKey);
    case 'gemini': return analyzeWithGemini(base64, apiKey);
    case 'groq':   return analyzeWithGroq(base64, apiKey);
    case 'xai':    return analyzeWithXAI(base64, apiKey);
    default:       return analyzeWithClaude(base64, apiKey);
  }
}

export async function getExerciseSuggestions(
  recentExercises: string[],
  goals: string,
  apiKey: string
): Promise<string[]> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Based on these recent exercises: ${recentExercises.join(', ')} and fitness goal: ${goals}, suggest 5 exercises for today. Respond with a JSON array of strings only: ["exercise1", "exercise2", ...]`,
    }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}
