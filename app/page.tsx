"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase'; 
import Image from 'next/image';
import Link from 'next/link';

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: { thumbnail: string };
  };
}

interface Book {
  id: string;
  title: string;
  author: string | null;
  category: string;
  cover_url: string | null;
}

export default function Home() {
  // --- ETATS ---
  const [books, setBooks] = useState<Book[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newCategory, setNewCategory] = useState("Roman");
  const [newCoverUrl, setNewCoverUrl] = useState("");

  const [suggestions, setSuggestions] = useState<GoogleBook[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    const loadBooks = async () => {
      const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false });
      if (data) setBooks(data as Book[]);
    };
    loadBooks();

    const closeMenu = () => setShowSuggestions(false);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // --- RECHERCHE GOOGLE BOOKS ---
  const searchBookByTitle = (title: string) => {
    setNewTitle(title);
    if (title.length < 3) {
      setSuggestions([]);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsSearching(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
        const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}&langRestrict=fr&maxResults=5&key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        setSuggestions(data.items || []);
        setShowSuggestions(true);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 500); // Recherche 500ms après l'arrêt de la saisie
  };

  // --- SELECTIONNER UN LIVRE ---
  const selectSuggestion = (book: GoogleBook) => {
    const info = book.volumeInfo;
    setNewTitle(info.title);
    setNewAuthor(info.authors ? info.authors[0] : "Auteur inconnu");
    const img = info.imageLinks?.thumbnail?.replace('http://', 'https://');
    setNewCoverUrl(img || "");
    setShowSuggestions(false);
  };

  // --- ENREGISTRER DANS SUPABASE ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const { data } = await supabase
      .from('books')
      .insert([{ title: newTitle, author: newAuthor, category: newCategory, cover_url: newCoverUrl }])
      .select()
      .single();

    if (data) {
      setBooks([data as Book, ...books]);
      // Reset
      setNewTitle("");
      setNewAuthor("");
      setNewCoverUrl("");
      setIsAdding(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-4 min-h-screen bg-gray-50 text-gray-900">
      
      {/* Header */}
      <div className="flex justify-between items-center my-6">
        <h1 className="text-2xl font-black tracking-tight">Ma Reserve</h1>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm"
        >
          {isAdding ? "Annuler" : "Ajouter un livre"}
        </button>
      </div>

      {/* Formulaire simplifie */}
      {isAdding && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 space-y-4">
          
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Titre du livre</label>
            <div className="relative flex items-center">
              <input 
                value={newTitle}
                onChange={(e) => searchBookByTitle(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-xl outline-none focus:bg-white border border-transparent focus:border-blue-500 transition-all text-sm"
                placeholder="Tapez le titre ou scannez la couverture"
                required
              />
              {isSearching && <div className="absolute right-3 animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />}
            </div>

            {/* Suggestions de recherche */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {suggestions.map((book) => (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => selectSuggestion(book)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 text-left border-b border-gray-100 last:border-none"
                  >
                    <div className="relative w-8 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                      {book.volumeInfo.imageLinks?.thumbnail && (
                        <Image src={book.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://')} alt="" fill className="object-cover" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-xs truncate">{book.volumeInfo.title}</p>
                      <p className="text-[10px] text-gray-500 truncate">{book.volumeInfo.authors?.[0] || "Auteur inconnu"}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Auteur</label>
            <input 
              value={newAuthor}
              onChange={e => setNewAuthor(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent text-sm"
              placeholder="Nom de l'auteur"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Categorie</label>
              <select 
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-xl outline-none text-sm bg-white"
              >
                <option value="Roman">Roman</option>
                <option value="Philosophie">Philosophie</option>
                <option value="Psychologie">Psychologie</option>
                <option value="Technique">Technique</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-blue-700">
                Enregistrer le livre
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Grille de livres super propre */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {books.map((book) => (
          <Link href={`/livre/${book.id}`} key={book.id} className="group bg-white rounded-2xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-72">
            <div className="relative h-44 w-full bg-gray-50 rounded-xl overflow-hidden mb-2">
              {book.cover_url ? (
                <Image src={book.cover_url} alt={book.title} fill sizes="30vw" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center font-bold text-gray-400">{book.title[0]}</div>
              )}
            </div>
            <div className="flex flex-col justify-between flex-grow">
              <h2 className="text-xs font-bold text-gray-900 line-clamp-2 leading-tight">{book.title}</h2>
              <p className="text-[10px] text-blue-600 font-semibold truncate mt-1">{book.author || "Auteur inconnu"}</p>
            </div>
          </Link>
        ))}
      </div>

    </main>
  );
}