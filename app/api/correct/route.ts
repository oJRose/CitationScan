import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-5.4-mini", 
      messages: [
        {
          role: "system",
          content: "Expert en correction d'OCR. Nettoie le texte sans changer le style."
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.2, 
    });

    return NextResponse.json({ 
      correctedText: response.choices[0].message.content 
    });

  } catch (error: unknown) {
    // 💡 En TypeScript moderne, on attrape un 'unknown'
    // On extrait le message de manière sécurisée
    const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue";
    
    console.error("Détails de l'erreur:", errorMessage);

    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}