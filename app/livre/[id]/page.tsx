"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Quote {
  id: string;
  content: string;
  page: string | null;
  created_at: string;
}

interface Book {
  title: string;
  author: string | null;
}

export default function BookDetails() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.id as string;

  // --- ETATS ---
  const [book, setBook] = useState<Book | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [newQuote, setNewQuote] = useState("");
  const [newPage, setNewPage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- CHARGEMENT DU LIVRE ET SES CITATIONS ---
  useEffect(() => {
    const loadBookData = async () => {
      // 1. Récupérer les infos du livre
      const { data: bookData } = await supabase
        .from('books')
        .select('title, author')
        .eq('id', bookId)
        .single();

      if (bookData) setBook(bookData);

      // 2. Récupérer les citations associées
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (quotesData) setQuotes(quotesData as Quote[]);
      setIsLoading(false);
    };

    if (bookId) loadBookData();
  }, [bookId]);

  // --- ENREGISTRER UNE CITATION ---
  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuote.trim()) return;

    const { data, error } = await supabase
      .from('quotes')
      .insert([{
        book_id: bookId,
        content: newQuote.trim(),
        page: newPage.trim() || null
      }])
      .select()
      .single();

    if (!error && data) {
      setQuotes([data as Quote, ...quotes]);
      setNewQuote("");
      setNewPage("");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-sm text-gray-500">Chargement en cours...</div>;
  }

  if (!book) {
    return <div className="p-8 text-center text-sm text-gray-500">Livre introuvable.</div>;
  }

  return (
    <main className="max-w-2xl mx-auto p-4 min-h-screen bg-gray-50 text-gray-900">
      
      {/* Retour */}
      <Link href="/" className="text-sm text-blue-600 font-semibold flex items-center gap-1 mb-6">
        ← Retour à la réserve
      </Link>

      {/* Infos Livre */}
      <div className="mb-8">
        <h1 className="text-2xl font-black leading-tight">{book.title}</h1>
        <p className="text-sm text-gray-500 font-medium mt-1">{book.author || "Auteur inconnu"}</p>
      </div>

      {/* Formulaire d'ajout (Saisie manuelle ou Scan iPhone) */}
      <form onSubmit={handleAddQuote} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-8 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
            Nouvelle citation (Saisie ou scan Live Text)
          </label>
          <textarea
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            rows={3}
            className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:bg-white border border-transparent focus:border-blue-500 transition-all text-sm resize-none"
            placeholder="Double-clique ici sur ton iPhone pour scanner le texte du livre..."
            required
          />
        </div>

        <div className="flex gap-4">
          <div className="w-1/3">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Page</label>
            <input
              type="text"
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:bg-white border border-transparent focus:border-blue-500 transition-all text-sm"
              placeholder="Ex: 42"
            />
          </div>
          <div className="w-2/3 flex items-end">
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-700 transition-colors">
              Enregistrer la citation
            </button>
          </div>
        </div>
      </form>

      {/* Liste des citations */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Citations enregistrées ({quotes.length})</h2>
        
        {quotes.length === 0 ? (
          <p className="text-xs text-gray-400 italic bg-white p-4 rounded-xl text-center border border-gray-100">
            Aucune citation pour le moment.
          </p>
        ) : (
          quotes.map((quote) => (
            <div key={quote.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <p className="text-sm font-medium text-gray-800 leading-relaxed italic">
                « {quote.content} »
              </p>
              {quote.page && (
                <div className="text-[10px] uppercase font-bold tracking-widest text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded-md">
                  Page {quote.page}
                </div>
              )}
            </div>
          ))
        )}
      </div>

    </main>
  );
}