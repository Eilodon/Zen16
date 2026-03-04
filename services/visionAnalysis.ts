import { VisionAnalysis } from '../types';

// Placeholder until dedicated vision classifier is introduced.
export const analyzeEnvironment = async (
  _apiKey: string,
  _base64Image: string
): Promise<VisionAnalysis> => {
  return {
    buddhist_score: 0.8,
    modern_score: 0.2,
    natural_score: 0.5,
    detected_items: ['altar', 'incense'],
    mode: 'VN',
  };
};
