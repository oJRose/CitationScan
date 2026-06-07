"use client";
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Tesseract from 'tesseract.js';
import Link from 'next/link';
import { Book, Quote } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LivrePage({ params }: PageProps) {
  // Récupération de l'ID via le nouveau système de Next.js
  const { id } = use(params);

  // --- ÉTATS ---
  const [book, setBook] = useState<Book | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualQuote, setManualQuote] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  // --- CHARGEMENT DES DONNÉES ---
  useEffect(() => {
    async function loadData() {
      try {
        // 1. Récupérer le livre
        const { data: bookData, error: bError } = await supabase
          .from('books')
          .select('*')
          .eq('id', id)
          .single();

        if (bError) throw bError;
        setBook(bookData as Book);

        // 2. Récupérer les citations liées
        const { data: quotesData, error: qError } = await supabase
          .from('quotes')
          .select('*')
          .eq('book_id', id)
          .order('created_at', { ascending: false });

        if (qError) throw qError;
        setQuotes(quotesData as Quote[]);

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur de chargement";
        setError(msg);
      }
    }
    loadData();
  }, [id]);

  // --- AJOUT MANUEL ---
  const saveManualQuote = async () => {
  if (!manualQuote.trim()) return;
  setIsSavingManual(true);

  try {
    const { data: newQuote, error: saveError } = await supabase
      .from('quotes')
      .insert([{ 
        book_id: id, 
        content: manualQuote.trim() 
      }])
      .select()
      .single();

    if (saveError) throw saveError;
    
    if (newQuote) {
      setQuotes((prev) => [newQuote as Quote, ...prev]);
      setManualQuote(""); // On vide le champ après succès
    }
  } catch (err) {
    console.error("Erreur sauvegarde manuelle:", err);
  } finally {
    setIsSavingManual(false);
  }
};

  // --- LOGIQUE DU SCANNER ---
  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);

    try {
      // Étape A : OCR avec Tesseract
      const { data: { text } } = await Tesseract.recognize(file, 'fra');

      // Étape B : Correction par l'IA (GPT-5.4 mini)
      const res = await fetch('/api/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("L'API de correction a échoué.");
      const { correctedText } = await res.json();

      // Étape C : Sauvegarde dans Supabase
      const { data: newQuote, error: saveError } = await supabase
        .from('quotes')
        .insert([{ 
          book_id: id, 
          content: correctedText 
        }])
        .select()
        .single();

      if (saveError) throw saveError;
      
      // Mise à jour de l'affichage
      if (newQuote) setQuotes((prev) => [newQuote as Quote, ...prev]);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du scan";
      setError(msg);
    } finally {
      setIsScanning(false);
    }
  };
  //-- DELETE QUOTE
  const deleteQuote = async (quoteId: string) => {
  if (!confirm("Supprimer cette citation ?")) return;

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId); // Utilise .eq('id', ...) c'est le plus fiable

  if (error) {
    console.error("Erreur Supabase:", error.message);
    alert("Erreur base de données : " + error.message);
  } else {
    // On retire de l'affichage seulement si la DB a dit OK
    setQuotes(prev => prev.filter(q => q.id !== quoteId));
  }
};

  if (error) return <div className="p-8 text-red-500 text-center font-bold">{error}</div>;
  if (!book) return <div className="p-8 text-center animate-pulse text-gray-400">Chargement du livre...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* BARRE DE NAVIGATION HAUTE */}
      <nav className="p-4 bg-white border-b flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <span className="font-bold text-gray-400 uppercase text-xs tracking-widest">Retour à la bibliothèque</span>
      </nav>

      <div className="max-w-3xl mx-auto p-6 space-y-8">
        
        {/* HEADER DU LIVRE */}
        <header className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-4">
          <div className="space-y-1">
            <span className="text-blue-600 text-xs font-black uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full">
              {book.category || "Ma Collection"}
            </span>
            <h1 className="text-4xl font-black text-gray-900 leading-tight">
              {book.title}
            </h1>
            <p className="text-xl text-gray-500 font-medium">{book.author}</p>
          </div>

          <div className="pt-6 space-y-4">
            {/* ZONE SCANNER */}
            <label className={`
                flex items-center justify-center gap-3 w-full py-4 rounded-2xl font-bold transition-all cursor-pointer
                ${isScanning ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'}
            `}>
                {isScanning ? (
                <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyse en cours...
                </>
                ) : (
                <>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Scanner une page
                </>
                )}
                <input type="file" accept="image/*" onChange={handleScan} className="hidden" disabled={isScanning} />
            </label>

            {/* ZONE MANUELLE */}
            <div className="relative group">
                <textarea 
                placeholder="Ou tapez une citation manuellement..."
                value={manualQuote}
                onChange={(e) => setManualQuote(e.target.value)}
                className="w-full p-4 pr-16 rounded-2xl border-2 border-gray-100 focus:border-blue-200 outline-none transition-all resize-none min-h-[100px] text-gray-700 font-serif"
                />
                <button 
                onClick={saveManualQuote}
                disabled={!manualQuote.trim() || isSavingManual}
                className={`
                    absolute right-3 bottom-3 p-2 rounded-xl transition-all
                    ${manualQuote.trim() ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-300'}
                `}
                >
                {isSavingManual ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                )}
                </button>
            </div>
            </div>
        </header>

        {/* LISTE DES CITATIONS */}
        <div className="space-y-6">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em] pl-4">
            Citations Extraites ({quotes.length})
          </h2>
          
          <div className="grid gap-4">
            {quotes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-400 italic">
                Aucun scan pour le moment...
              </div>
            ) : (
              quotes.map((q) => (
  <article 
    key={q.id} 
    className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group relative"
  >
    {/* BOUTON SUPPRIMER */}
    <button 
      onClick={() => deleteQuote(q.id)}
      className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
      title="Supprimer la citation"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
      </svg>
    </button>

    <p className="font-serif text-xl text-gray-800 leading-relaxed italic pr-8">
      {q.content}
    </p>
    
    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-end">
      <span className="text-[10px] font-bold text-gray-300 uppercase">
        EXTRAIT LE {new Date(q.created_at).toLocaleDateString('fr-FR')}
      </span>
    </div>
  </article>
))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}