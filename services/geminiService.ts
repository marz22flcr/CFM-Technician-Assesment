import { GoogleGenAI, Chat } from '@google/genai';
import { Module } from '../types';

let activeChat: Chat | null = null;

export const startReviewChatSession = async (module: Module) => {
    try {
        const { GoogleGenAI } = await import('@google/genai');
        // This relies on the API_KEY being available in the execution environment.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const questionTopics = module.questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n');
        const systemInstruction = `You are "CFM-AI", an expert AI tutor for refrigeration and air conditioning technicians.
You are helping a trainee review the module titled "${module.title}".
Your goal is to help them understand the key concepts. Use the following questions from the module as context for the topics you should be an expert in:
${questionTopics}

Be encouraging, clear, and helpful. Guide the trainee toward understanding the principles. If they ask for an answer directly, explain the underlying concept instead of just giving the answer.`;

        activeChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
            }
        });
    } catch (error) {
        console.error("Failed to initialize Gemini review chat:", error);
        if (error instanceof ReferenceError) {
             throw new Error("Could not initialize AI Client. The API Key is missing or not configured for this environment.");
        }
        throw new Error("Could not initialize the AI Assistant for review.");
    }
};


export const sendMessageToBot = async (message: string): Promise<string> => {
    if (!activeChat) {
        throw new Error("The AI chat session is not active. Please start a review session first.");
    }
    try {
        const response = await activeChat.sendMessage({ message });
        return response.text;
    } catch (error) {
        console.error("Gemini API call failed:", error);
        if (error instanceof Error && error.message.includes('API key not valid')) {
            activeChat = null; // Force re-initialization on next session
            throw new Error("The API key is invalid. Please check your configuration.");
        }
        throw new Error("Failed to get a response from the AI model. Please try again.");
    }
};