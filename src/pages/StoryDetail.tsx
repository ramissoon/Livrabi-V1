import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { doc, collection, query, orderBy, onSnapshot, addDoc, setDoc, updateDoc, increment, getDoc, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { Story, Paragraph } from "../types";
import { Heart, Users, Bell, ArrowLeft, PlusCircle, GitBranch, Send, MessageSquare, ChevronRight, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export const StoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [story, setStory] = useState<Story | null>(null);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [branchingFrom, setBranchingFrom] = useState<Paragraph | null>(null);

  // For the "official" path view
  const [viewMode, setViewMode] = useState<"official" | "explore">("official");

  useEffect(() => {
    if (!id) return;

    const unsubscribeStory = onSnapshot(doc(db, "stories", id), (doc) => {
      if (doc.exists()) {
        setStory({ id: doc.id, ...doc.data() } as Story);
      } else {
        toast.error("Histoire introuvable.");
        navigate("/");
      }
    });

    const unsubscribeParagraphs = onSnapshot(query(collection(db, "stories", id, "paragraphs"), orderBy("createdAt", "asc")), (snapshot) => {
      setParagraphs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Paragraph)));
      setLoading(false);
    });

    return () => {
      unsubscribeStory();
      unsubscribeParagraphs();
    };
  }, [id]);

  // Calculate the official path: starting from root, follow the first child at each level
  const officialPath = useMemo(() => {
    const path: Paragraph[] = [];
    let currentParentId: string | null = null;

    while (true) {
      const children = paragraphs.filter(p => p.parentId === currentParentId);
      if (children.length === 0) break;

      // The official one is the one with isOfficial = true (the first one created at that level for that parent)
      const official = children.find(p => p.isOfficial) || children[0];
      path.push(official);
      currentParentId = official.id;
    }

    return path;
  }, [paragraphs]);

  // Current active path (if exploring a branch)
  const [currentPath, setCurrentPath] = useState<Paragraph[]>([]);

  useEffect(() => {
    if (viewMode === "official") {
      setCurrentPath(officialPath);
    }
  }, [viewMode, officialPath]);

  const handleAddParagraph = async (parentId: string | null, isBranch: boolean = false) => {
    if (!user || !profile) {
      toast.error("Connectez-vous pour contribuer !");
      return;
    }

    if (!newContent.trim()) {
      toast.error("Le contenu ne peut pas être vide.");
      return;
    }

    if (story?.isClosed) {
      toast.error("Cette histoire est clôturée.");
      return;
    }

    setIsSubmitting(true);
    try {
      const parent = paragraphs.find(p => p.id === parentId);
      const level = parent ? parent.level + 1 : 0;

      // Check if this is the first child for this parent to mark as official
      const siblings = paragraphs.filter(p => p.parentId === parentId);
      const isOfficial = siblings.length === 0;

      const paragraphRef = doc(collection(db, "stories", id!, "paragraphs"));
      const now = new Date().toISOString();

      await setDoc(paragraphRef, {
        id: paragraphRef.id,
        storyId: id,
        content: newContent,
        authorId: user.uid,
        authorPseudo: profile.pseudo,
        createdAt: now,
        parentId: parentId,
        isOfficial: isOfficial,
        level: level,
      });

      // Update story stats
      const updates: any = {
        contributorsCount: increment(1),
      };
      await updateDoc(doc(db, "stories", id!), updates);

      // Update global stats
      await updateDoc(doc(db, "stats", "global"), {
        publishedParagraphs: increment(1)
      });

      toast.success(isBranch ? "Embranchement créé !" : "Paragraphe ajouté !");
      setNewContent("");
      setBranchingFrom(null);
      setActiveParentId(null);

      // If it was a branch, switch to explore mode and show the new path
      if (!isOfficial) {
        setViewMode("explore");
        // Rebuild path for the new branch
        const newPath: Paragraph[] = [];
        let curr: Paragraph | undefined = { id: paragraphRef.id, parentId, content: newContent, authorPseudo: profile.pseudo, createdAt: now, level, isOfficial, storyId: id!, authorId: user.uid };
        while (curr) {
          newPath.unshift(curr);
          curr = paragraphs.find(p => p.id === curr?.parentId);
        }
        setCurrentPath(newPath);
      }
    } catch (error: any) {
      toast.error("Erreur : " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLike = async () => {
    if (!user || !profile || !story) return;

    const isLiked = profile.likedStories.includes(story.id);
    const userRef = doc(db, "users", user.uid);
    const storyRef = doc(db, "stories", story.id);

    try {
      if (isLiked) {
        await updateDoc(userRef, { likedStories: profile.likedStories.filter(id => id !== story.id) });
        await updateDoc(storyRef, { likesCount: increment(-1) });
        await updateDoc(doc(db, "stats", "global"), { totalLikes: increment(-1) });
      } else {
        await updateDoc(userRef, { likedStories: [...profile.likedStories, story.id] });
        await updateDoc(storyRef, { likesCount: increment(1) });
        await updateDoc(doc(db, "stats", "global"), { totalLikes: increment(1) });
        toast.success("Histoire aimée !");
      }
    } catch (error) {
      toast.error("Erreur lors du like.");
    }
  };

  const toggleFollow = async () => {
    if (!user || !profile || !story) return;

    const isFollowed = profile.followedStories.includes(story.id);
    const userRef = doc(db, "users", user.uid);
    const storyRef = doc(db, "stories", story.id);

    try {
      if (isFollowed) {
        await updateDoc(userRef, { followedStories: profile.followedStories.filter(id => id !== story.id) });
        await updateDoc(storyRef, { followersCount: increment(-1) });
      } else {
        await updateDoc(userRef, { followedStories: [...profile.followedStories, story.id] });
        await updateDoc(storyRef, { followersCount: increment(1) });
        toast.success("Vous suivez maintenant cette histoire !");
      }
    } catch (error) {
      toast.error("Erreur lors du suivi.");
    }
  };

  if (loading || !story) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const lastParagraph = currentPath[currentPath.length - 1];
  const branchesAtLast = paragraphs.filter(p => p.parentId === (lastParagraph?.parentId || null) && p.id !== lastParagraph?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour aux histoires
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Story Info & Stats */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl shadow-primary/5 border border-gray-100">
            <img src={story.imageUrl} alt={story.title} className="w-full h-64 object-cover" referrerPolicy="no-referrer" />
            <div className="p-8">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">
                {story.category}
              </span>
              <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">{story.title}</h1>
              <p className="text-sm text-gray-400 mb-6 italic">Initié par {story.authorPseudo}</p>

              <div className="flex items-center gap-6 py-6 border-y border-gray-50">
                <button onClick={toggleLike} className={cn("flex flex-col items-center gap-1 transition-colors", profile?.likedStories.includes(story.id) ? "text-red-500" : "text-gray-400 hover:text-red-500")}>
                  <Heart className={cn("w-6 h-6", profile?.likedStories.includes(story.id) && "fill-current")} />
                  <span className="text-xs font-bold">{story.likesCount}</span>
                </button>
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <Users className="w-6 h-6" />
                  <span className="text-xs font-bold">{story.contributorsCount}</span>
                </div>
                <button onClick={toggleFollow} className={cn("flex flex-col items-center gap-1 transition-colors", profile?.followedStories.includes(story.id) ? "text-primary" : "text-gray-400 hover:text-primary")}>
                  <Bell className={cn("w-6 h-6", profile?.followedStories.includes(story.id) && "fill-current")} />
                  <span className="text-xs font-bold">{story.followersCount}</span>
                </button>
              </div>

              <div className="mt-8 space-y-4">
                <button onClick={() => setViewMode("official")} className={cn("w-full py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all", viewMode === "official" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-gray-50 text-gray-400 hover:bg-gray-100")}>
                  Version Officielle
                </button>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                  <div className="h-[1px] flex-grow bg-gray-100" />
                  Ou explorer les branches
                  <div className="h-[1px] flex-grow bg-gray-100" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* List some branches if available */}
                  {paragraphs.filter(p => !p.isOfficial).slice(0, 4).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setViewMode("explore");
                        const newPath: Paragraph[] = [];
                        let curr: Paragraph | undefined = p;
                        while (curr) {
                          newPath.unshift(curr);
                          curr = paragraphs.find(prev => prev.id === curr?.parentId);
                        }
                        setCurrentPath(newPath);
                      }}
                      className="p-2 bg-gray-50 rounded-lg text-[10px] text-gray-500 hover:bg-primary/5 hover:text-primary transition-all text-left truncate"
                    >
                      Branch: {p.authorPseudo}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: The Story Content */}
        <div className="lg:col-span-2 space-y-12">
          <div className="story-paper">
            <div className="space-y-12">
              {currentPath.map((p, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={p.id}
                  className="group relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Paragraphe {idx + 1}</span>
                    <span className="text-[10px] text-gray-300 font-mono">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: fr })}</span>
                  </div>
                  <p className="text-xl leading-relaxed font-serif text-gray-800 first-letter:text-4xl first-letter:font-bold first-letter:mr-1 first-letter:float-left">
                    {p.content}
                  </p>
                  <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-medium text-gray-400 italic">Écrit par {p.authorPseudo}</span>
                    {idx > 0 && (
                      <button
                        onClick={() => {
                          setBranchingFrom(paragraphs.find(prev => prev.id === p.parentId) || null);
                          setActiveParentId(p.parentId);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-accent hover:underline"
                      >
                        <GitBranch className="w-3 h-3" />
                        Créer un embranchement ici
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Action Area */}
              {!story.isClosed && (
                <div className="pt-12 border-t border-gray-100">
                  {branchingFrom ? (
                    <div className="bg-accent/5 p-6 rounded-2xl border border-accent/20 mb-8">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-accent uppercase tracking-widest flex items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          Nouvel embranchement
                        </h3>
                        <button onClick={() => { setBranchingFrom(null); setActiveParentId(null); }} className="text-xs text-gray-400 hover:text-accent">Annuler</button>
                      </div>
                      <p className="text-xs text-gray-500 mb-4 italic">Vous écrivez une suite alternative au paragraphe de {branchingFrom.authorPseudo}...</p>
                      <textarea
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        className="w-full bg-white border border-accent/20 rounded-xl p-4 text-sm focus:ring-2 focus:ring-accent/20 outline-none min-h-[150px]"
                        placeholder="Quelle est votre version de l'histoire ?"
                      />
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleAddParagraph(activeParentId, true)}
                          disabled={isSubmitting}
                          className="bg-accent text-white px-6 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2"
                        >
                          <Send className="w-4 h-4" />
                          {isSubmitting ? "Publication..." : "Publier l'embranchement"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                        <PlusCircle className="w-4 h-4" />
                        Proposer une suite
                      </h3>
                      <textarea
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-6 text-lg font-serif focus:bg-white focus:ring-2 focus:ring-primary/10 outline-none transition-all min-h-[200px]"
                        placeholder="Et ensuite ?..."
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleAddParagraph(lastParagraph.id)}
                          disabled={isSubmitting}
                          className="btn-primary px-8 py-3 text-lg flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                          <Send className="w-5 h-5" />
                          {isSubmitting ? "Publication..." : "Publier ma suite"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {story.isClosed && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 font-serif italic">Cette histoire est terminée. Merci à tous les contributeurs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
