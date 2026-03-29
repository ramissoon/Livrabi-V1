export type UserRole = "admin" | "user";

export interface UserProfile {
  uid: string;
  pseudo: string;
  favoriteWord: string;
  role: UserRole;
  createdAt: string;
  followedStories: string[];
  likedStories: string[];
}

export interface Story {
  id: string;
  title: string;
  category: string;
  imageUrl?: string;
  authorId: string;
  authorPseudo: string;
  createdAt: string;
  isClosed: boolean;
  likesCount: number;
  contributorsCount: number;
  followersCount: number;
  firstParagraphId: string;
}

export interface Paragraph {
  id: string;
  storyId: string;
  content: string;
  authorId: string;
  authorPseudo: string;
  createdAt: string;
  parentId: string | null;
  isOfficial: boolean;
  level: number;
}

export interface GlobalStats {
  totalUsers: number;
  activeStories: number;
  publishedParagraphs: number;
  totalLikes: number;
}

export const CATEGORIES = [
  "Fantasy",
  "Thriller",
  "Romance",
  "Science-fiction",
  "Aventure",
  "Mystère",
  "Horreur",
  "Historique",
  "Poésie",
  "Autre",
] as const;

export type Category = (typeof CATEGORIES)[number];
