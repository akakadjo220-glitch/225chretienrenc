
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Search, Loader, CheckCircle } from 'lucide-react';

interface OnboardingPreferencesProps {
  onComplete: () => void;
}

export const OnboardingPreferences: React.FC<OnboardingPreferencesProps> = ({ onComplete }) => {
  const [preference, setPreference] = useState<'M' | 'F' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
  }, []);

  const handleSubmit = async () => {
    if (!user || !preference) return;
    setIsSaving(true);
    try {
      await supabase.from('profiles').update({
        looking_for: preference
      }).eq('id', user.id);
      // Redirection vers le dashboard
      onComplete();
    } catch (error) {
      console.error("Erreur sauvegarde préférence", error);
      alert("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className="bg-emerald-600 p-8 text-center text-white">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Search className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Dernière étape !</h1>
          <p className="text-emerald-100 text-lg">
            Dites-nous qui vous aimeriez rencontrer.
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Je recherche...</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <button
              onClick={() => setPreference('M')}
              className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center h-48 group ${preference === 'M'
                  ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                }`}
            >
              <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">🧔</span>
              <span className={`text-lg font-bold ${preference === 'M' ? 'text-emerald-800' : 'text-slate-600'}`}>Un Homme</span>
              {preference === 'M' && <CheckCircle className="mt-2 text-emerald-600" />}
            </button>

            <button
              onClick={() => setPreference('F')}
              className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center h-48 group ${preference === 'F'
                  ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                }`}
            >
              <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">👩</span>
              <span className={`text-lg font-bold ${preference === 'F' ? 'text-emerald-800' : 'text-slate-600'}`}>Une Femme</span>
              {preference === 'F' && <CheckCircle className="mt-2 text-emerald-600" />}
            </button>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!preference || isSaving}
              className={`w-full sm:w-auto px-12 py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform ${preference
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
              {isSaving ? (
                <span className="flex items-center"><Loader className="animate-spin mr-2" /> Finalisation...</span>
              ) : (
                `Commencer les rencontres`
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400">Ce choix nous permet de vous proposer uniquement des profils correspondants.</p>
        </div>

      </div>
    </div>
  );
};
