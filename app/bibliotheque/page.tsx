"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// 1. On définit la structure exacte de ce qu'on reçoit de Supabase
interface Quote {
  id: string;
  content: string;
  created_at: string;
  books: {
    title: string;
    author: string | null;
  } | null; // Peut être null si la jointure échoue
}

export default function Bibliotheque() {
  // 2. On utilise l'interface au lieu de 'any'
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuotes() {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          id,
          content,
          created_at,
          books (title, author)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur de récupération:", error.message);
      } else if (data) {
        // 3. On "cast" les données pour rassurer TypeScript
        setQuotes(data as unknown as Quote[]);
      }
      setLoading(false);
    }
    fetchQuotes();
  }, []);

  return (
    <main className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 bg-gray-50 min-h-screen font-sans">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Ma Bibliothèque</h1>
          <p className="text-gray-500">Tes pépites littéraires sauvegardées</p>
        </div>
        <Link 
          href="/" 
          className="bg-white border-2 border-blue-600 text-blue-600 px-4 py-2 rounded-xl font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
        >
          + Scanner
        </Link>
      </header>

      {loading ? (
        <div className="flex justify-center pt-20">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      ) : quotes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
          <p className="text-gray-400">Ta bibliothèque est vide pour le moment.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {quotes.map((quote) => (
            <div key={quote.id} className="p-6 rounded-3xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="text-blue-600 opacity-20">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H16.017C15.4647 8 15.017 8.44772 15.017 9V12M14.017 21H7C5.89543 21 5 20.1046 5 19V12C5 10.8954 5.89543 10 7 10H10C10.5523 10 11 9.55228 11 9V5C11 4.44772 10.5523 4 10 4H7C5.89543 4 5 4.89543 5 6V9" />
                </svg>
              </div>
              
              <p className="italic text-xl text-gray-800 leading-relaxed font-serif">
                {quote.content}
              </p>
              
              <div className="flex justify-between items-end pt-4 border-t border-gray-100">
                <div>
                  <p className="font-bold text-gray-900">{quote.books?.title || "Livre inconnu"}</p>
                  <p className="text-sm text-gray-500 font-medium">{quote.books?.author || "Auteur inconnu"}</p>
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase bg-gray-100 px-2 py-1 rounded-md">
                   {new Date(quote.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}