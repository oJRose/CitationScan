export interface Book {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface Quote {
  id: string;
  book_id: string;
  content: string;
  created_at: string;
}

export interface OpenLibraryBook {
  title: string;
  author_name?: string[];
  cover_i?: number;
  key: string;
}

export interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail: string;
    };
  };
}