import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, where, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Story, CATEGORIES } from "../types";
import { Heart, Users, Bell, Search, Filter, Plus } from "lucide-react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

export const Home: React.FC = () => {
  const [stories, setStories] = useState<Story[]>([]);
  const [filter, setFilter] = useState<"likes" | "contributors" | "followers" | "recent">("recent");
  const [category, setCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = query(collection(db, "stories"));

    if (filter === "likes") q = query(q, orderBy("likesCount", "desc"));
    else if (filter === "contributors") q = query(q, orderBy("contributorsCount", "desc"));
    else if (filter === "followers") q = query(q, orderBy("followersCount", "desc"));
    else q = query(q, orderBy("createdAt", "desc"));

    if (category !== "All") q = query(q, where("category", "==", category));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter, category]);

  const filteredStories = useMemo(() => {
    return stories.filter(story => 
      story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      story.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stories, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-serif font-bold text-primary mb-2">Découvrez des histoires</h1>
          <p className="text-gray-500 text-lg">Le monde est une page blanche. Écrivons-la ensemble.</p>
        </div>
        <Link to="/create" className="flex items-center gap-3 bg-accent text-white px-8 py-4 rounded-full text-lg font-bold shadow-lg shadow-accent/20 hover:scale-105 transition-transform">
          <Plus className="w-6 h-6" />
          Commencer une histoire
        </Link>
      </div>

      <div className="relative mb-8 max-w-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une histoire par titre ou catégorie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg"
        />
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <button onClick={() => setFilter("recent")} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", filter === "recent" ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-primary")}>Plus récentes</button>
        <button onClick={() => setFilter("likes")} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", filter === "likes" ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-primary")}>Plus aimées 🔥</button>
        <button onClick={() => setFilter("contributors")} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", filter === "contributors" ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-primary")}>Plus de contributeurs 👥</button>
        <button onClick={() => setFilter("followers")} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", filter === "followers" ? "bg-primary text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-primary")}>Plus suivies ⚡</button>
      </div>

      <div className="flex gap-2 mb-12 overflow-x-auto pb-4 no-scrollbar">
        <button onClick={() => setCategory("All")} className={cn("whitespace-nowrap px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest", category === "All" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>Toutes</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} className={cn("whitespace-nowrap px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest", category === cat ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200")}>{cat}</button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100" />
          ))}
        </div>
      ) : filteredStories.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
          <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-serif font-bold text-gray-400">Aucune histoire trouvée</h3>
          <p className="text-gray-400">{searchQuery ? "Essayez d'autres mots clés." : "Soyez le premier à en créer une !"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredStories.map((story, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={story.id}
              className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:shadow-primary/5 transition-all flex flex-col"
            >
              <Link to={`/story/${story.id}`} className="relative h-48 overflow-hidden">
                <img
                  src={story.imageUrl || "https://picsum.photos/seed/livrabi/800/600"}
                  alt={story.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary">
                    {story.category}
                  </span>
                </div>
              </Link>
              <div className="p-6 flex flex-col flex-grow">
                <Link to={`/story/${story.id}`}>
                  <h3 className="text-xl font-serif font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">{story.title}</h3>
                </Link>
                <p className="text-sm text-gray-400 mb-6 italic">Par {story.authorPseudo}</p>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Heart className="w-4 h-4" />
                      <span className="text-xs font-medium">{story.likesCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-medium">{story.contributorsCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Bell className="w-4 h-4" />
                      <span className="text-xs font-medium">{story.followersCount}</span>
                    </div>
                  </div>
                  <Link to={`/story/${story.id}`} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">Lire suite</Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const BookOpen = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);
