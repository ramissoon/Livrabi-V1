import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, increment } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { BookOpen, User as UserIcon, Lock, Heart, Shield } from "lucide-react";
import { toast } from "sonner";

const signupSchema = z.z.object({
  pseudo: z.string().min(3, "Le pseudonyme doit faire au moins 3 caractères"),
  password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
  favoriteWord: z.string().min(2, "Le mot préféré est requis"),
});

type SignupForm = z.infer<typeof signupSchema>;

export const Signup: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      // Check if pseudo already exists
      const q = query(collection(db, "users"), where("pseudo", "==", data.pseudo));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        toast.error("Ce pseudonyme est déjà utilisé.");
        setLoading(false);
        return;
      }

      // Create user with email (pseudo@livrabi.com for simplicity as per doc "inscription légère")
      const email = `${data.pseudo.toLowerCase().replace(/\s/g, "")}@livrabi.com`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, data.password);
      const user = userCredential.user;

      // Check if it's the first user to make them admin
      const usersCountSnapshot = await getDocs(collection(db, "users"));
      const role = usersCountSnapshot.empty ? "admin" : "user";

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        pseudo: data.pseudo,
        favoriteWord: data.favoriteWord,
        role: role,
        createdAt: new Date().toISOString(),
        followedStories: [],
        likedStories: [],
      });

      // Update global stats
      await updateDoc(doc(db, "stats", "global"), {
        totalUsers: increment(1)
      }).catch(() => {
        // If stats doc doesn't exist, create it
        setDoc(doc(db, "stats", "global"), {
          totalUsers: 1,
          activeStories: 0,
          publishedParagraphs: 0,
          totalLikes: 0
        });
      });

      toast.success("Bienvenue sur Livrabi !");
      navigate("/");
    } catch (error: any) {
      toast.error("Erreur lors de l'inscription : " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-primary/5 border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-serif font-bold text-gray-900">Rejoindre Livrabi</h1>
          <p className="text-gray-500 mt-2">Écrivez l'histoire avec nous.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pseudonyme</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input {...register("pseudo")} className="input-field pl-10" placeholder="Ex: VictorHugo" />
            </div>
            {errors.pseudo && <p className="text-red-500 text-xs mt-1">{errors.pseudo.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input {...register("password")} type="password" className="input-field pl-10" placeholder="••••••••" />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Votre mot préféré</label>
            <div className="relative">
              <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input {...register("favoriteWord")} className="input-field pl-10" placeholder="Ex: Éphémère" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Sert à réinitialiser votre mot de passe</p>
            {errors.favoriteWord && <p className="text-red-500 text-xs mt-1">{errors.favoriteWord.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-lg">
            {loading ? "Création..." : "S'inscrire"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Déjà un compte ? <Link to="/login" className="text-primary font-bold hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
};

const loginSchema = z.z.object({
  pseudo: z.string().min(1, "Pseudonyme requis"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryData, setRecoveryData] = useState({ pseudo: "", favoriteWord: "" });
  const [recoveredPassword, setRecoveredPassword] = useState<string | null>(null);

  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const email = `${data.pseudo.toLowerCase().replace(/\s/g, "")}@livrabi.com`;
      await signInWithEmailAndPassword(auth, email, data.password);
      toast.success("Bon retour parmi nous !");
      navigate("/");
    } catch (error: any) {
      toast.error("Erreur de connexion : Vérifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!recoveryData.pseudo || !recoveryData.favoriteWord) {
      toast.error("Veuillez remplir les deux champs.");
      return;
    }

    try {
      const q = query(collection(db, "users"), where("pseudo", "==", recoveryData.pseudo), where("favoriteWord", "==", recoveryData.favoriteWord));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        toast.error("Informations incorrectes.");
      } else {
        toast.success("Informations validées !");
        setRecoveredPassword("Votre mot de passe est celui que vous avez choisi à l'inscription. Si vous l'avez oublié, contactez un admin.");
        // Note: In a real app we would trigger a reset email, but here we follow the "light" doc requirement
      }
    } catch (error) {
      toast.error("Erreur lors de la récupération.");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-primary/5 border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-serif font-bold text-gray-900">Connexion</h1>
          <p className="text-gray-500 mt-2">Reprenez votre plume.</p>
        </div>

        {!showRecovery ? (
          <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pseudonyme</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input {...register("pseudo")} className="input-field pl-10" placeholder="Votre pseudo" />
                </div>
                {errors.pseudo && <p className="text-red-500 text-xs mt-1">{errors.pseudo.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input {...register("password")} type="password" className="input-field pl-10" placeholder="••••••••" />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-lg">
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => setShowRecovery(true)} className="text-xs text-gray-400 hover:text-primary transition-colors">Mot de passe oublié ?</button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-800">Récupération</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pseudonyme</label>
              <input value={recoveryData.pseudo} onChange={e => setRecoveryData({...recoveryData, pseudo: e.target.value})} className="input-field" placeholder="Votre pseudo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Votre mot préféré</label>
              <input value={recoveryData.favoriteWord} onChange={e => setRecoveryData({...recoveryData, favoriteWord: e.target.value})} className="input-field" placeholder="Le mot choisi à l'inscription" />
            </div>
            {recoveredPassword && <div className="p-4 bg-primary/10 rounded-lg text-sm text-primary font-medium">{recoveredPassword}</div>}
            <div className="flex gap-4">
              <button onClick={() => setShowRecovery(false)} className="flex-1 btn-secondary py-2">Retour</button>
              <button onClick={handleRecovery} className="flex-1 btn-primary py-2">Vérifier</button>
            </div>
          </div>
        )}

        <p className="text-center mt-6 text-sm text-gray-500">
          Pas encore de compte ? <Link to="/signup" className="text-primary font-bold hover:underline">S'inscrire</Link>
        </p>
      </div>
    </div>
  );
};
