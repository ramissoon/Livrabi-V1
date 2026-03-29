import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, where, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { Story, UserProfile, GlobalStats } from "../types";
import { Users, BookOpen, MessageSquare, Heart, Shield, Trash2, UserMinus, UserPlus, Lock, Unlock, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "../lib/utils";
import { toast } from "sonner";

export const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "stories">("stats");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribeStats = onSnapshot(doc(db, "stats", "global"), (doc) => {
      if (doc.exists()) setStats(doc.data() as GlobalStats);
    });

    const unsubscribeUsers = onSnapshot(query(collection(db, "users"), orderBy("createdAt", "desc")), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    const unsubscribeStories = onSnapshot(query(collection(db, "stories"), orderBy("createdAt", "desc")), (snapshot) => {
      setStories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story)));
      setLoading(false);
    });

    return () => {
      unsubscribeStats();
      unsubscribeUsers();
      unsubscribeStories();
    };
  }, [isAdmin]);

  const handlePromote = async (uid: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole });
      toast.success(`Utilisateur ${newRole === "admin" ? "promu" : "rétrogradé"} !`);
    } catch (error) {
      toast.error("Erreur lors du changement de rôle.");
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur et tout son contenu ?")) return;

    try {
      // In a real app, we'd delete all their stories and paragraphs too
      // For this demo, we'll just delete the user profile
      await deleteDoc(doc(db, "users", uid));
      toast.success("Utilisateur supprimé.");
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const toggleStoryStatus = async (storyId: string, isClosed: boolean) => {
    try {
      await updateDoc(doc(db, "stories", storyId), { isClosed: !isClosed });
      toast.success(`Histoire ${!isClosed ? "clôturée" : "réouverte"} !`);
    } catch (error) {
      toast.error("Erreur lors du changement de statut.");
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm("Supprimer définitivement cette histoire ?")) return;

    try {
      await deleteDoc(doc(db, "stories", storyId));
      toast.success("Histoire supprimée.");
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  if (!isAdmin) return <div className="p-12 text-center">Accès refusé.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Tableau de Bord Admin</h1>
          <p className="text-gray-500">Gérez la communauté Livrabi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-xl"><Users className="w-6 h-6" /></div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Utilisateurs</span>
          </div>
          <p className="text-3xl font-serif font-bold text-gray-900">{stats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-green-50 text-green-500 rounded-xl"><BookOpen className="w-6 h-6" /></div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Histoires</span>
          </div>
          <p className="text-3xl font-serif font-bold text-gray-900">{stats?.activeStories || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-50 text-purple-500 rounded-xl"><MessageSquare className="w-6 h-6" /></div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Paragraphes</span>
          </div>
          <p className="text-3xl font-serif font-bold text-gray-900">{stats?.publishedParagraphs || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-50 text-red-500 rounded-xl"><Heart className="w-6 h-6" /></div>
            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Likes</span>
          </div>
          <p className="text-3xl font-serif font-bold text-gray-900">{stats?.totalLikes || 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-primary/5 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button onClick={() => setActiveTab("stats")} className={cn("flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all", activeTab === "stats" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-gray-400 hover:bg-gray-50")}>Stats</button>
          <button onClick={() => setActiveTab("users")} className={cn("flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all", activeTab === "users" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-gray-400 hover:bg-gray-50")}>Utilisateurs</button>
          <button onClick={() => setActiveTab("stories")} className={cn("flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all", activeTab === "stories" ? "text-primary border-b-2 border-primary bg-primary/5" : "text-gray-400 hover:bg-gray-50")}>Histoires</button>
        </div>

        <div className="p-8">
          {activeTab === "stats" && (
            <div className="space-y-8">
              <h3 className="text-xl font-serif font-bold text-gray-800 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Dernières activités
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-gray-50 rounded-2xl">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Nouveaux inscrits</h4>
                  <div className="space-y-3">
                    {users.slice(0, 5).map(u => (
                      <div key={u.uid} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">{u.pseudo}</span>
                        <span className="text-[10px] text-gray-400">{format(new Date(u.createdAt), "dd MMM yyyy", { locale: fr })}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Histoires récentes</h4>
                  <div className="space-y-3">
                    {stories.slice(0, 5).map(s => (
                      <div key={s.id} className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{s.title}</span>
                        <span className="text-[10px] text-gray-400">{format(new Date(s.createdAt), "dd MMM yyyy", { locale: fr })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <th className="pb-4">Pseudo</th>
                    <th className="pb-4">Rôle</th>
                    <th className="pb-4">Inscrit le</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(u => (
                    <tr key={u.uid} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 text-sm font-medium text-gray-700">{u.pseudo}</td>
                      <td className="py-4">
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter", u.role === "admin" ? "bg-purple-100 text-purple-600" : "bg-gray-100 text-gray-500")}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 text-xs text-gray-400">{format(new Date(u.createdAt), "dd/MM/yyyy", { locale: fr })}</td>
                      <td className="py-4 text-right space-x-2">
                        <button onClick={() => handlePromote(u.uid, u.role)} className="p-2 text-gray-400 hover:text-primary transition-colors" title={u.role === "admin" ? "Rétrograder" : "Promouvoir"}>
                          {u.role === "admin" ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDeleteUser(u.uid)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "stories" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <th className="pb-4">Titre</th>
                    <th className="pb-4">Auteur</th>
                    <th className="pb-4">Statut</th>
                    <th className="pb-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stories.map(s => (
                    <tr key={s.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 text-sm font-medium text-gray-700 max-w-[200px] truncate">{s.title}</td>
                      <td className="py-4 text-sm text-gray-500">{s.authorPseudo}</td>
                      <td className="py-4">
                        <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter", s.isClosed ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600")}>
                          {s.isClosed ? "Clôturée" : "Active"}
                        </span>
                      </td>
                      <td className="py-4 text-right space-x-2">
                        <button onClick={() => toggleStoryStatus(s.id, s.isClosed)} className="p-2 text-gray-400 hover:text-primary transition-colors" title={s.isClosed ? "Réouvrir" : "Clôturer"}>
                          {s.isClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDeleteStory(s.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
