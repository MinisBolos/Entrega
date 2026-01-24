import { GoogleGenAI } from "@google/genai";
import { MenuItem } from "../types";

// Initialize the client
// Using process.env.API_KEY as strictly required.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMenuDescription = async (itemName: string, ingredients: string): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `Escreva uma descrição curta, apetitosa e persuasiva para um item de cardápio chamado "${itemName}" que contém: ${ingredients}. A descrição deve ter no máximo 20 palavras e ser em Português do Brasil.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "Uma delícia preparada especialmente para você.";
  } catch (error) {
    console.warn("Falha na geração de descrição (API/Network):", error);
    return "Sabor inigualável e ingredientes frescos.";
  }
};

export const generateProductImage = async (itemName: string, description: string): Promise<string | null> => {
  try {
    // Using gemini-2.5-flash-image as per guidelines for general image generation
    const model = 'gemini-2.5-flash-image';
    const prompt = `Foto profissional de comida, close-up, alta resolução, iluminação de estúdio gastronômico: ${itemName}. ${description}. Fundo desfocado, apetitoso, vibrante.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }]
      },
      // Note: gemini-2.5-flash-image does not support imageConfig like aspect ratio in the same way strictly, 
      // but prompt engineering helps.
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
    return null;
  }
};

export const getAIRecommendation = async (userQuery: string, menuItems: MenuItem[]): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    // Create a simplified menu representation for the AI
    const menuContext = menuItems.map(item => `${item.name} (${item.category}): R$ ${item.price.toFixed(2)} - ${item.description}`).join('\n');

    const prompt = `
      Você é um garçom virtual experiente e simpático do app "EntregaLocal".
      
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
  } catch (error) {
    console.warn("Falha na recomendação (API/Network):", error);
    return "Estou com dificuldade de acessar o cardápio agora, mas recomendo dar uma olhada nas nossas promoções!";
  }
};