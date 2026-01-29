
import { GoogleGenAI } from "@google/genai";
import { MenuItem } from "../types";

// Initialize client lazily to prevent crash on module load if env is invalid
let aiClient: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiClient) {
    // Fallback to empty string if undefined to prevent constructor error, 
    // operations will fail gracefully later if key is invalid.
    const key = process.env.API_KEY || ''; 
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
};

const checkApiKey = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === '' || key.includes('YOUR_API_KEY')) {
    throw new Error("MISSING_API_KEY");
  }
};

export const generateMenuDescription = async (itemName: string, ingredients: string): Promise<string> => {
  checkApiKey();
  try {
    const ai = getAI();
    const model = 'gemini-3-flash-preview';
    const prompt = `Escreva uma descrição curta, apetitosa e persuasiva para um item de cardápio chamado "${itemName}" que contém: ${ingredients}. A descrição deve ter no máximo 20 palavras e ser em Português do Brasil.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "Uma delícia preparada especialmente para você.";
  } catch (error) {
    console.warn("Falha na geração de descrição (API/Network):", error);
    throw error;
  }
};

export const generateProductImage = async (itemName: string, description: string): Promise<string | null> => {
  checkApiKey();
  try {
    const ai = getAI();
    // Using gemini-2.5-flash-image as per guidelines for general image generation
    const model = 'gemini-2.5-flash-image';
    const prompt = `Foto profissional de comida, close-up, alta resolução, iluminação de estúdio gastronômico: ${itemName}. ${description}. Fundo desfocado, apetitoso, vibrante.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    // Iterate to find inlineData (image)
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64String = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${base64String}`;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Falha na geração de imagem:", error);
    throw error;
  }
};

export const getAIRecommendation = async (userQuery: string, menuItems: MenuItem[]): Promise<string> => {
  // Recommendation shouldn't throw blocking error if key missing, just return fallback
  if (!process.env.API_KEY) return "Olá! Recomendo dar uma olhada nos nossos Destaques!";

  try {
    const ai = getAI();
    const model = 'gemini-3-flash-preview';
    
    // Create a simplified menu representation for the AI
    const menuContext = menuItems.map(item => `${item.name} (${item.category}): R$ ${item.price.toFixed(2)} - ${item.description}`).join('\n');

    const prompt = `
      Você é um garçom virtual experiente e simpático do app "Entrega Local".
      
      CARDÁPIO DO DIA:
      ${menuContext}

      CLIENTE DISSE: "${userQuery}"

      Tarefa: Recomende 1 opção do cardápio que combine com o pedido. 
      Regras:
      1. Seja curto (máx 2 frases).
      2. Cite o preço.
      3. Seja vendedor.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "Que tal experimentar nosso prato do dia? É delicioso!";
  } catch (error: any) {
    console.warn("Falha na recomendação (API/Network):", error);
    
    // Check for Quota Exceeded error in various formats
    const errStr = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
    if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
        return "Estou com muitos pedidos no momento! (Cota de IA excedida). Tente novamente em alguns instantes.";
    }
    
    return "Estou com dificuldade de acessar o cardápio agora, mas recomendo dar uma olhada nas nossas promoções!";
  }
};
