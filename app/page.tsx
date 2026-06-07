"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase'; 
import Image from 'next/image';
import Link from 'next/link';
import { Html5QrcodeScanner } from 'html5-qrcode';

// --- INTERFACES & TYPES ---
interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail: string;
    };
  };
}

interface Book {
  id: string;
  title: string;
  author: string | null;
  category: string;
  cover_url: string | null;
  created_at: string;
}

export default function Home() {
  // --- 1. ETATS (STATES) ---
  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState("Tous");
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newCategory, setNewCategory] = useState("Non classe");
  const [newCoverUrl, setNewCoverUrl] = useState("");

  const [suggestions, setSuggestions] = useState<GoogleBook[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const categories = ["Tous", "Roman", "Philosophie", "Psychologie", "Technique"];

  // --- 2. LOGIQUE ET FONCTIONS (ORDONNEES POUR EVITER LES ERREURS) ---

  // Action pour chercher un livre par son code barre (ISBN)
  const fetchBookByISBN = async (isbn: string) => {
    setIsSearching(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
      const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const info = data.items[0].volumeInfo;
        setNewTitle(info.title);
        setNewAuthor(info.authors ? info.authors[0] : "Auteur inconnu");
        const thumb = info.imageLinks?.thumbnail?.replace('http://', 'https://');
        setNewCoverUrl(thumb || "");
      } else {
        alert("Aucun ouvrage trouve pour ce code barre.");
      }
    } catch (error) {
      console.error("Erreur recherche ISBN:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // Gestion de la camera pour l'iPhone
  useEffect(() => {
    if (!cameraActive) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 260, height: 140 }, 
        aspectRatio: 1.777778 
      },
      false
    );

    scanner.render(
      (decodedText) => {
        fetchBookByISBN(decodedText);
        scanner.clear().then(() => setCameraActive(false)).catch(console.error);
      },
      () => { /* Echecs de scan silencieux pendant la mise au point */ }
    );

    return () => {
      scanner.clear().catch(err => console.error("Erreur destruction camera", err));
    };
  }, [cameraActive]);

  // Chargement initial des donnees et clic exterieur
  useEffect(() => {
    const loadBooks = async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) setBooks(data as Book[]);
    };

    loadBooks();
    
    const handleClickOutside = () => setShowSuggestions(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Recherche par texte (Titre)
  const fetchBookInfo = (title: string) => {
    if (title.length < 3) {
      setSuggestions([]);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsSearching(true);

    timeoutRef.current = setTimeout(async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;
        const url = `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&langRestrict=fr&maxResults=5&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        setSuggestions(data.items || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Erreur recherche titre:", error);
      } finally {
        setIsSearching(false);
      }
    }, 600);
  };

  // Selection de la suggestion dans la liste
  const selectBook = (book: GoogleBook) => {
    const info = book.volumeInfo;
    setNewTitle(info.title);
    setNewAuthor(info.authors ? info.authors[0] : "Auteur inconnu");
    const thumb = info.imageLinks?.thumbnail?.replace('http://', 'https://');
    setNewCoverUrl(thumb || "");
    setShowSuggestions(false);
  };

  // Soumission finale vers la base de donnees Supabase
  const handleAddBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const { data, error } = await supabase
      .from('books')
      .insert([{ 
        title: newTitle, 
        author: newAuthor, 
        category: newCategory, 
        cover_url: newCoverUrl 
      }])
      .select()
      .single();

    if (!error && data) {
      setBooks([data as Book, ...books]);
      setNewTitle("");
      setNewAuthor("");
      setNewCoverUrl("");
      setNewCategory("Non classe");
      setIsAdding(false);
    } else {
      console.error("Erreur base de donnees:", error);
    }
  };

  const filteredBooks = activeTab === "Tous" 
    ? books 
    : books.filter(b => b.category === activeTab);

  // --- 3. RENDU VISUEL (JSX) ---
  return (
    <main className="max-w-6xl mx-auto p-6 min-h-screen bg-gray-50/30">
      
      {/* En-tete */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Ma Bibliotheque</h1>
        <button 
          onClick={() => { setIsAdding(!isAdding); setCameraActive(false); }}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 active:scale-98 transition-all"
        >
          {isAdding ? "Fermer" : "Ajouter un livre"}
        </button>
      </div>

      {/* Formulaire */}
      {isAdding && (
        <div className="mb-12 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-100/50 border border-gray-100">
          
          {/* Scanner */}
          <div className="mb-8">
            {!cameraActive ? (
              <button
                type="button"
                onClick={() => setCameraActive(true)}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-md shadow-indigo-100 active:scale-95 transition-all"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316A2.192 2.192 0 0 0 14.513 4H9.487c-.49 0-.953.243-1.219.664l-.82 1.317Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                Scanner avec le capteur de votre iPhone
              </button>
            ) : (
              <div className="bg-gray-900 rounded-3xl p-4 overflow-hidden shadow-inner max-w-md mx-auto">
                <div id="reader" className="w-full overflow-hidden rounded-2xl bg-black"></div>
                <button
                  type="button"
                  onClick={() => setCameraActive(false)}
                  className="mt-4 w-full bg-white/10 hover:bg-white/20 text-white text-sm font-semibold py-2 rounded-xl transition-all"
                >
                  Annuler le scan
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleAddBook} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Input Titre */}
            <div className="relative">
              <label className="block text-sm font-bold mb-2 ml-1 text-gray-500">Titre</label>
              <div className="relative flex items-center">
                <input 
                  value={newTitle}
                  onChange={(e) => { setNewTitle(e.target.value); fetchBookInfo(e.target.value); }}
                  className="w-full p-4 rounded-2xl bg-gray-50 border-none ring-2 ring-gray-100 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="Saisir le titre"
                  required
                />
                {isSearching && <div className="absolute right-4 animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />}
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                  {suggestions.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => selectBook(book)}
                      className="w-full flex items-center gap-4 p-3 hover:bg-blue-50 text-left border-b border-gray-50 last:border-none"
                    >
                      <div className="relative w-10 h-14 flex-shrink-0 bg-gray-50 rounded shadow-sm overflow-hidden">
                        {book.volumeInfo.imageLinks?.thumbnail ? (
                          <Image 
                            src={book.volumeInfo.imageLinks.thumbnail.replace('http://', 'https://')} 
                            alt="" 
                            fill 
                            className="object-cover" 
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-sm truncate text-gray-900">{book.volumeInfo.title}</p>
                        <p className="text-xs text-gray-500 truncate">{book.volumeInfo.authors?.[0] || "Auteur inconnu"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input Auteur */}
            <div>
              <label className="block text-sm font-bold mb-2 ml-1 text-gray-500">Auteur</label>
              <input 
                value={newAuthor}
                onChange={e => setNewAuthor(e.target.value)}
                className="w-full p-4 rounded-2xl bg-gray-50 border-none ring-2 ring-gray-100 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                placeholder="Nom du redacteur"
              />
            </div>

            {/* Selecteur Categories */}
            <div>
              <label className="block text-sm font-bold mb-2 ml-1 text-gray-500">Categorie</label>
              <select 
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="w-full p-4 rounded-2xl bg-gray-50 border-none ring-2 ring-gray-100 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              >
                {categories.slice(1).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Validation */}
            <div className="flex items-end">
              <button type="submit" className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-black active:scale-98 transition-all shadow-xl shadow-gray-200">
                Ajouter definitivement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === cat 
              ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
              : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredBooks.map((book) => (
          <Link href={`/livre/${book.id}`} key={book.id} className="group">
            <div className="h-[430px] bg-white rounded-[2rem] border border-gray-100 shadow-sm group-hover:shadow-xl group-hover:-translate-y-1.5 transition-all duration-300 flex flex-col overflow-hidden relative">
              
              <div className="h-2/3 w-full bg-gray-50 relative overflow-hidden">
                {book.cover_url ? (
                  <Image 
                    src={book.cover_url} 
                    alt={book.title} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105" 
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-4xl font-bold">
                    {book.title[0]}
                  </div>
                )}
                <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-black uppercase rounded-full shadow-sm text-gray-800 tracking-wider">
                  {book.category}
                </div>
              </div>

              <div className="p-6 flex flex-col justify-between flex-grow">
                <div>
                  <h3 className="text-lg font-black text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{book.title}</h3>
                  <p className="text-gray-400 text-sm font-medium mt-1">{book.author || "Auteur inconnu"}</p>
                </div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-gray-300 border-t border-gray-50 pt-3 flex justify-between">
                  <span>Ajoute le</span>
                  <span>{new Date(book.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

            </div>
          </Link>
        ))}
      </div>

    </main>
  );
}