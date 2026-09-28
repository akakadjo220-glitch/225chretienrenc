import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BookOpen, Sparkles, Check, Loader, ArrowRight, Quote, Heart, Church, Flame } from 'lucide-react';

interface OnboardingBioProps {
  onComplete: () => void;
}

interface SpiritualPrompt {
  category: string;
  icon: string;
  text: string;
}

const SPIRITUAL_PROMPTS: SpiritualPrompt[] = [
  {
    category: 'Foi & Valeurs',
    icon: '🕊️',
    text: "Attiré(e) par une vie centrée sur Christ, la prière et la foi sont les piliers de mes décisions."
  },
  {
    category: 'Église & Service',
    icon: '⛪',
    text: "Engagé(e) dans ma paroisse/église, j'aime particulièrement la louange et le service fraternel."
  },
  {
    category: 'Vision du couple',
    icon: '💍',
    text: "Je recherche une personne qui craint Dieu pour grandir ensemble dans la foi et bâtir un foyer solide."
  },
  {
    category: 'Verset de cœur',
    icon: '📖',
    text: "Mon verset de référence : « Confie-toi en l'Éternel de tout ton cœur » (Proverbes 3:5)."
  },
  {
    category: 'Personnalité',
    icon: '✨',
    text: "De nature joyeuse et bienveillante, j'aime les moments simples en famille et les discussions profondes."
  }
];

const COMPLETE_EXAMPLE = "Chrétien(ne) engagé(e) et souriant(e), j'aime la louange, la lecture et les moments conviviaux en famille. Je recherche une personne qui craint Dieu pour avancer ensemble dans la foi, avec respect et joie de vivre.";

export const OnboardingBio: React.FC<OnboardingBioProps> = ({ onComplete }) => {
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Pré-remplir si déjà existant
        supabase
          .from('profiles')
          .select('bio')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.bio) {
              setBio(data.bio);
            }
          });
      }
    });
  }, []);

  const handleApplyPrompt = (promptText: string) => {
    setBio((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return promptText;
      }
      return `${trimmed}\n\n${promptText}`;
    });
    setFeedbackNotice("Amorce ajoutée ! Vous pouvez la personnaliser.");
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleUseCompleteExample = () => {
    setBio(COMPLETE_EXAMPLE);
    setFeedbackNotice("Exemple inséré ! N'hésitez pas à l'adapter à vos mots.");
    setTimeout(() => setFeedbackNotice(null), 3500);
  };

  const handleSubmit = async () => {
    const cleanBio = bio.trim();
    if (!user || cleanBio.length < 15) return;
    setIsSaving(true);
    try {
      // 🛡️ RÈGLE CHRÉTIENNE STRICTE (AUCUN CHOIX MANUEL) :
      // Homme cherche obligatoirement Femme, Femme cherche obligatoirement Homme
      const { data: profileData } = await supabase
        .from('profiles')
        .select('gender')
        .eq('id', user.id)
        .maybeSingle();

      const userGender = profileData?.gender || 'M';
      const requiredLookingFor = userGender === 'M' ? 'F' : 'M';

      const { error } = await supabase
        .from('profiles')
        .update({
          bio: cleanBio,
          looking_for: requiredLookingFor,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      onComplete();
    } catch (error) {
      console.error("Erreur sauvegarde biographie:", error);
      alert("Une erreur est survenue lors de l'enregistrement de votre présentation.");
    } finally {
      setIsSaving(false);
    }
  };

  const charCount = bio.trim().length;
  const isMinMet = charCount >= 15;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-8 animate-in fade-in duration-500">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">

        {/* Header avec indicateur d'étape */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 sm:p-8 text-center text-white relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-4 border border-white/20">
            <span>Étape 2 sur 2</span>
            <span className="opacity-60">•</span>
            <span>Présentation finale</span>
          </div>

          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/30 shadow-inner">
            <BookOpen className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold mb-2 tracking-tight">
            Votre Présentation Chrétienne
          </h1>
          <p className="text-emerald-100 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
            Partagez ce qui fait vibrer votre foi, vos centres d'intérêt et votre vision du couple pour susciter des échanges authentiques.
          </p>
        </div>

        {/* Barre de progression visuelle (Étape 2/2 = 100%) */}
        <div className="w-full bg-slate-100 h-1.5">
          <div className="bg-emerald-500 h-1.5 transition-all duration-500" style={{ width: '100%' }}></div>
        </div>

        {/* Corps principal */}
        <div className="p-6 sm:p-8">

          {/* Section Amorces / Suggestions rapides */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Besoin d'inspiration ? Cliquez pour démarrer :
              </label>
              <button
                type="button"
                onClick={handleUseCompleteExample}
                className="text-xs text-emerald-700 font-semibold hover:text-emerald-800 underline transition-colors"
              >
                Modèle complet
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SPIRITUAL_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPrompt(prompt.text)}
                  className="text-left p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/60 hover:border-emerald-300 hover:shadow-sm transition-all duration-200 group flex items-start gap-2.5"
                >
                  <span className="text-lg leading-none mt-0.5">{prompt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                      {prompt.category}
                    </span>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug mt-0.5">
                      "{prompt.text}"
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {feedbackNotice && (
              <div className="mt-2.5 p-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200 flex items-center gap-2 animate-in fade-in duration-300">
                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{feedbackNotice}</span>
              </div>
            )}
          </div>

          {/* Zone de saisie Texte libre */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide">
                Ma biographie / Témoignage
              </label>
              <span className={`text-xs font-semibold ${isMinMet ? 'text-emerald-600' : 'text-slate-400'}`}>
                {charCount} / 500 caractères {isMinMet && '✓'}
              </span>
            </div>

            <div className="relative">
              <textarea
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 500))}
                placeholder="Ex : Je suis passionné(e) par la foi chrétienne, la musique et ma famille. Je recherche quelqu'un de sincère avec qui marcher dans la paix du Christ..."
                className="w-full border-2 border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl p-3.5 text-slate-800 text-sm sm:text-base leading-relaxed resize-none transition-all placeholder:text-slate-400"
              />
              <Quote className="absolute right-3 bottom-3 w-5 h-5 text-slate-200 pointer-events-none" />
            </div>

            {/* Conseils sous la zone */}
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>💡 Minimum 15 caractères recommandés.</span>
              {!isMinMet && charCount > 0 && (
                <span className="text-amber-600 font-medium">
                  Encore {15 - charCount} caractère(s)
                </span>
              )}
            </div>
          </div>

          {/* Bouton de validation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-400 text-center sm:text-left order-2 sm:order-1">
              Vous pourrez modifier votre biographie à tout moment depuis votre profil.
            </p>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isMinMet || isSaving}
              className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 order-1 sm:order-2 ${isMinMet
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-[1.02] shadow-emerald-600/20 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                }`}
            >
              {isSaving ? (
                <>
                  <Loader className="animate-spin w-5 h-5" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <span>Enregistrer et commencer les rencontres</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </div>

        {/* Footer rassurant */}
        <div className="bg-slate-50 px-6 py-3.5 text-center border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Heart className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          <span>Une biographie sincère augmente de 85% vos chances d'affinité spirituelle.</span>
        </div>

      </div>
    </div>
  );
};
