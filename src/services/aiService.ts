import Anthropic from '@anthropic-ai/sdk';
import * as FileSystem from 'expo-file-system';
import { MacroNutrients } from '../types';

export interface FoodAnalysisResult {
  name: string;
  description: string;
  servingSize: string;
  macros: MacroNutrients;
  ingredients: string[];
  confidence: 'high' | 'medium' | 'low';
  healthScore: number; // 1-10
  tips: string[];
}

export async function analyzeFoodImage(
  imageUri: string,
  apiKey: string
): Promise<FoodAnalysisResult> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  let base64Image: string;
  if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
    base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } else {
    base64Image = imageUri.replace(/^data:image\/\w+;base64,/, '');
  }

  const prompt = `You are a professional nutritionist and food recognition AI. Analyze this food image and provide detailed nutritional information.

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

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image,
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse AI response');

  return JSON.parse(jsonMatch[0]) as FoodAnalysisResult;
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
    messages: [
      {
        role: 'user',
        content: `Based on these recent exercises: ${recentExercises.join(', ')} and fitness goal: ${goals}, suggest 5 exercises for today. Respond with a JSON array of strings only: ["exercise1", "exercise2", ...]`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}
