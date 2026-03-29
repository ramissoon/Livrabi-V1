import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, setDoc, updateDoc, increment } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { CATEGORIES, Category } from "../types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BookOpen, Image as ImageIcon, Type, PenTool } from "lucide-react";
import { toast } from "sonner";

const storySchema = z.z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères"),
  category: z.string().min(1, "Veuillez choisir une catégorie"),
  firstParagraph: z.string().min(20, "Le premier paragraphe doit faire au moins 20 caractères"),
});

type StoryForm = z.infer<typeof storySchema>;

export const CreateStory: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<StoryForm>({
    resolver: zodResolver(storySchema),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0]);
      setImagePreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const onSubmit = async (data: StoryForm) => {
    if (!user || !profile) {
      toast.error("Vous devez être connecté pour créer une histoire.");
      return;
    }

    setLoading(true);
    try {
      let imageUrl = "";
      if (imageFile) {
        const storageRef = ref(storage, `stories/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(storageRef);
      } else {
        // Default logo if no image
        imageUrl = "https://picsum.photos/seed/livrabi/800/600";
      }

      // 1. Create Story
      const storyRef = doc(collection(db, "stories"));
      const storyId = storyRef.id;

      // 2. Create First Paragraph
      const paragraphRef = doc(collection(db, "stories", storyId, "paragraphs"));
      const paragraphId = paragraphRef.id;

      const now = new Date().toISOString();

      await setDoc(storyRef, {
        id: storyId,
        title: data.title,
        category: data.category,
        imageUrl,
        authorId: user.uid,
        authorPseudo: profile.pseudo,
        createdAt: now,
        isClosed: false,
        likesCount: 0,
        contributorsCount: 1,
        followersCount: 0,
        firstParagraphId: paragraphId,
      });

      await setDoc(paragraphRef, {
        id: paragraphId,
        storyId,
        content: data.firstParagraph,
        authorId: user.uid,
        authorPseudo: profile.pseudo,
        createdAt: now,
        parentId: null,
        isOfficial: true,
        level: 0,
      });

      // Update stats
      await updateDoc(doc(db, "stats", "global"), {
        activeStories: increment(1),
        publishedParagraphs: increment(1),
      }).catch(() => {
        setDoc(doc(db, "stats", "global"), {
          totalUsers: 1,
          activeStories: 1,
          publishedParagraphs: 1,
          totalLikes: 0
        });
      });

      toast.success("Histoire créée avec succès !");
      navigate(`/story/${storyId}`);
    } catch (error: any) {
      toast.error("Erreur lors de la création : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl shadow-primary/5 border border-gray-100">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">Nouvelle Histoire</h1>
          <p className="text-gray-500">Posez la première pierre de votre univers.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Titre de l'histoire</label>
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input {...register("title")} className="input-field pl-10" placeholder="Un titre inoubliable..." />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter italic">Attention : Le titre ne pourra pas être changé</p>
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Catégorie</label>
                <select {...register("category")} className="input-field appearance-none bg-white">
                  <option value="">Choisir une catégorie</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Illustration (Optionnel)</label>
              <div className="relative group h-48 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary transition-colors overflow-hidden">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <span className="text-xs font-medium">Cliquez pour uploader</span>
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-tighter italic">Par défaut, le logo de Livrabi sera utilisé</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-widest">Premier Paragraphe</label>
            <div className="relative">
              <PenTool className="absolute left-3 top-4 w-5 h-5 text-gray-400" />
              <textarea {...register("firstParagraph")} rows={8} className="input-field pl-10 pt-3 resize-none" placeholder="Il était une fois..." />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter italic">Ce paragraphe sera le socle de l'histoire</p>
            {errors.firstParagraph && <p className="text-red-500 text-xs mt-1">{errors.firstParagraph.message}</p>}
          </div>

          <div className="pt-6 flex justify-end">
            <button type="submit" disabled={loading} className="btn-primary px-12 py-4 text-lg shadow-lg shadow-primary/20">
              {loading ? "Création en cours..." : "Publier l'histoire"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
