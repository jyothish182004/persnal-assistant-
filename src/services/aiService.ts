import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export enum RiskLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high"
}

export enum ActionType {
  OPEN_APP = "OPEN_APP",
  SEARCH = "SEARCH",
  CREATE_FILE = "CREATE_FILE",
  NONE = "NONE"
}

export interface AIAction {
  type: ActionType;
  params: Record<string, any>;
  description: string;
}

export interface AIResponse {
  reply: string;
  riskLevel: RiskLevel;
  reasoning: string;
  action?: AIAction;
}

export async function jarvisBrain(input: string): Promise<AIResponse> {
  const model = "gemini-3-flash-preview";

  const response = await ai.models.generateContent({
    model,
    contents: input,
    config: {
      systemInstruction: `You are JARVIS, a sophisticated AI assistant and system controller. 
      Analyze the user input and provide a helpful reply, a security risk assessment, and reasoning.
      
      If the user wants to do something (open app, search, create file), return an "action" object.
      Actions:
      1. OPEN_APP: params: { name: string } (e.g. "code", "chrome", "calculator")
      2. SEARCH: params: { query: string }
      3. CREATE_FILE: params: { filename: string, content: string }
      
      Risk levels: low, medium, high.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          riskLevel: { type: Type.STRING, enum: ["low", "medium", "high"] },
          reasoning: { type: Type.STRING },
          action: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["OPEN_APP", "SEARCH", "CREATE_FILE", "NONE"] },
              params: { type: Type.OBJECT },
              description: { type: Type.STRING, description: "Display name for the action" }
            },
            required: ["type", "params", "description"]
          }
        },
        required: ["reply", "riskLevel", "reasoning"]
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      reply: data.reply || "I'm sorry, I couldn't process that.",
      riskLevel: data.riskLevel as RiskLevel || RiskLevel.LOW,
      reasoning: data.reasoning || "No reasoning provided."
    };
  } catch (error) {
    console.error("Failed to parse JARVIS brain response:", error);
    return {
      reply: "Diagnostic error in neural pathways. Please stabilize input.",
      riskLevel: RiskLevel.HIGH,
      reasoning: "Failed to parse JSON response from AI model."
    };
  }
}
