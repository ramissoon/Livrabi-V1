import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { BookOpen, LogOut, Shield, User as UserIcon, PlusCircle } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            <span className="text-2xl font-serif font-bold tracking-tight text-primary">Livrabi</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/create" className="hidden md:flex items-center gap-2 btn-primary">
                  <PlusCircle className="w-4 h-4" />
                  Créer une histoire
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="p-2 text-gray-500 hover:text-primary transition-colors" title="Administration">
                    <Shield className="w-6 h-6" />
                  </Link>
                )}
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{profile?.pseudo}</span>
                </div>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="w-6 h-6" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-primary">Connexion</Link>
                <Link to="/signup" className="btn-primary text-sm">Inscription</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export const Footer: React.FC = () => {
  const { profile } = useAuth();

  return (
    <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-gray-400 text-sm">© 2026 Livrabi - Co-création d'histoires</p>
        {profile?.favoriteWord && (
          <p className="mt-4 text-xs font-mono text-gray-300 uppercase tracking-widest">
            Ton mot préféré : <span className="text-primary/50">{profile.favoriteWord}</span>
          </p>
        )}
      </div>
    </footer>
  );
};
