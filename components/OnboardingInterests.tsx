
import React, { useState, useEffect } from 'react';
import { AVAILABLE_INTERESTS } from '../constants';
import { supabase } from '../supabaseClient';
import { Check, Heart, Loader } from 'lucide-react';

interface OnboardingInterestsProps {
  onComplete: () => void;
}

export const OnboardingInterests: React.FC<OnboardingInterestsProps> = ({ onComplete }) => {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
    });
  }, []);

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await supabase.from('profiles').update({
        interests: selectedInterests.join(',')
      }).eq('id', user.id);
      // IMPORTANT : On déclenche le callback qui va maintenant rediriger vers ONBOARDING_PREFERENCES dans App.tsx
      onComplete();
    } catch (error) {
      console.error("Erreur sauvegarde intérêts", error);
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
            <Heart className="h-8 w-8 text-white" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Bienvenue dans la famille !</h1>
          <p className="text-emerald-100 text-lg">
            Votre profil est vérifié. Apprenons à mieux vous connaître.
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-2 text-center">Qu'est-ce qui vous passionne ?</h2>
          <p className="text-slate-500 text-center mb-8 max-w-md mx-auto">
            Sélectionnez au moins 3 centres d'intérêt pour nous aider à vous proposer des profils compatibles.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {AVAILABLE_INTERESTS.map((interest) => {
              const isSelected = selectedInterests.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2 flex items-center ${isSelected
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-800 scale-105 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                >
                  {isSelected && <Check size={14} className="mr-1.5" />}
                  {interest}
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={selectedInterests.length < 3 || isSaving}
              className={`w-full sm:w-auto px-10 py-3 rounded-xl font-bold text-lg shadow-lg transition-all transform ${selectedInterests.length >= 3
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
              {isSaving ? (
                <span className="flex items-center"><Loader className="animate-spin mr-2" /> Enregistrement...</span>
              ) : (
                `Continuer (${selectedInterests.length}/3)`
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-8 py-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-400">Ces informations seront affichées sur votre profil.</p>
        </div>

      </div>
    </div>
  );
};
