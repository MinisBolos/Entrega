import { GoogleGenAI } from "@google/genai";
import { MenuItem } from "../types";

// Initialize client lazily
let aiClient: GoogleGenAI | null = null;

const getAI = () => {
  const key = process.env.API_KEY;
  if (!key || key.trim() === '' || key.includes('YOUR_API_KEY') || key.length < 10) {
    return null; // Return null to signal "Demo Mode"
  }
  
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
};

// Helper to simulate network delay for realistic demo feel
const simulateDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateMenuDescription = async (itemName: string, ingredients: string): Promise<string> => {
  const ai = getAI();

  if (!ai) {
    // MOCK RESPONSE (Demo Mode)
    await simulateDelay(1000);
    const mockDescriptions = [
      `Delicie-se com o autêntico sabor de ${itemName}, preparado com ingredientes frescos e selecionados.`,
      `Uma explosão de sabores! ${itemName} feito com ${ingredients || 'muito carinho'} para você.`,
      `A melhor escolha do dia: ${itemName}. Sabor inigualável e qualidade premium.`,
      `Irresistível e suculento. Experimente nosso ${itemName} e surpreenda-se.`
    ];
    return mockDescriptions[Math.floor(Math.random() * mockDescriptions.length)] + " (Demo)";
  }

  try {
    const model = 'gemini-3-flash-preview';
    const prompt = `Escreva uma descrição curta, apetitosa e persuasiva para um item de cardápio chamado "${itemName}" que contém: ${ingredients}. A descrição deve ter no máximo 20 palavras e ser em Português do Brasil.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text?.trim() || "Uma delícia preparada especialmente para você.";
  } catch (error) {
    console.warn("IA indisponível, usando fallback.", error);
    return "Uma delícia preparada com ingredientes selecionados especialmente para você.";
  }
};

export const generateProductImage = async (itemName: string, description: string): Promise<string | null> => {
  const ai = getAI();

  if (!ai) {
    // MOCK RESPONSE (Demo Mode)
    await simulateDelay(1500);
    // Returns a high-quality food placeholder from Unsplash based on keywords roughly matched to category logic or random
    const keywords = itemName.toLowerCase();
    let imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'; // Default healthy bowl
    
    if (keywords.includes('burguer') || keywords.includes('hambúrguer') || keywords.includes('bacon')) {
        imageUrl = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80';
    } else if (keywords.includes('pizza')) {
        imageUrl = 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80';
    } else if (keywords.includes('doce') || keywords.includes('sobremesa') || keywords.includes('bolo') || keywords.includes('açaí')) {
        imageUrl = 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&q=80';
    } else if (keywords.includes('bebida') || keywords.includes('suco') || keywords.includes('refrigerante')) {
        imageUrl = 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80';
    }

    return imageUrl;
  }

  try {
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
    console.error("Falha na geração de imagem (API):", error);
    return null;
  }
};

export const getAIRecommendation = async (userQuery: string, menuItems: MenuItem[]): Promise<string> => {
  const ai = getAI();

  if (!ai) {
    // MOCK RESPONSE (Demo Mode)
    await simulateDelay(800);
    const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
    if (randomItem) {
        return `(Modo Demo) Baseado no seu pedido, recomendo fortemente o nosso ${randomItem.name}. É um dos mais pedidos e custa apenas R$ ${randomItem.price.toFixed(2)}!`;
    }
    return "Olá! Como estou no modo demonstração (sem chave de API), sugiro dar uma olhada nas nossas promoções do dia!";
  }

  try {
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
    return "Estou com dificuldade de acessar o cérebro da IA agora, mas recomendo dar uma olhada nas nossas promoções!";
  }
};