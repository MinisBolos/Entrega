import { GoogleGenAI } from "@google/genai";
import { MenuItem } from "../types";

// Initialize the client
// Using process.env.API_KEY as strictly required.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMenuDescription = async (itemName: string, ingredients: string): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `Escreva uma descrição curta, apetitosa e vendedora para um item de cardápio chamado "${itemName}" que contém: ${ingredients}. A descrição deve ter no máximo 25 palavras e ser em Português do Brasil. Use emojis se apropriado.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "Descrição indisponível no momento.";
  } catch (error) {
    console.warn("Falha na geração de descrição (API/Network):", error);
    return "Descrição clássica e saborosa.";
  }
};

export const generateProductImage = async (itemName: string, description: string): Promise<string | null> => {
  try {
    // Using gemini-2.5-flash-image as per guidelines for general image generation
    const model = 'gemini-2.5-flash-image';
    const prompt = `Uma foto profissional, apetitosa e de alta qualidade de culinária para um cardápio de delivery: ${itemName}. ${description}. Iluminação de estúdio, fundo neutro ou desfocado, foco na comida.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        // No specific imageConfig needed for standard square generation unless specified
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
    return null;
  }
};

export const getAIRecommendation = async (userQuery: string, menuItems: MenuItem[]): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    // Create a simplified menu representation for the AI
    const menuContext = menuItems.map(item => `${item.name} (${item.category}): R$ ${item.price.toFixed(2)}`).join('\n');

    const prompt = `
      Você é um garçom virtual inteligente e prestativo chamado "Chef Bot".
      
      Aqui está o cardápio do restaurante:
      ${menuContext}

      O cliente disse: "${userQuery}"

      Com base no pedido do cliente e no cardápio acima, sugira 1 ou 2 opções ideais. 
      Seja breve, simpático e mencione o preço. Fale em Português do Brasil.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "Desculpe, não consegui pensar em uma recomendação agora. Que tal olhar nossos destaques?";
  } catch (error) {
    console.warn("Falha na recomendação (API/Network):", error);
    return "Tivemos um problema técnico, mas recomendo o nosso X-Burguer!";
  }
};