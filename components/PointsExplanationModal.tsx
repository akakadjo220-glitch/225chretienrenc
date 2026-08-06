import React, { useState } from 'react';
import { Flame, ShieldCheck, HeartHandshake, Users, Zap, CheckCircle, ArrowRight, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { User } from '../types';

interface PointsExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onPointsUpdated?: (newPoints: number, newCredits: number) => void;
  pointsPerSpotlight?: number;
}

export const PointsExplanationModal: React.FC<PointsExplanationModalProps> = ({
  isOpen,
  onClose,
  user,
  onPointsUpdated,
  pointsPerSpotlight = 50
}) => {
  const [isConverting, setIsConverting] = useState(false);

  if (!isOpen || !user) return null;

  const currentPoints = user.points ?? 150;
  const currentCredits = (user as any).credits ?? 3;
  const canConvert = currentPoints >= pointsPerSpotlight;

  const handleConvertPoints = async () => {
    if (!canConvert) {
      alert(`Vous avez besoin d'au moins ${pointsPerSpotlight} points pour obtenir 1 crédit Spotlight.`);
      return;
    }

    setIsConverting(true);
    const updatedPoints = currentPoints - pointsPerSpotlight;
    const updatedCredits = currentCredits + 1;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          points: updatedPoints,
          credits: updatedCredits
        })
        .eq('id', user.id);

      if (error) throw error;

      if (onPointsUpdated) {
        onPointsUpdated(updatedPoints, updatedCredits);
      }

      alert(`🎉 Félicitations ! Vous avez converti ${pointsPerSpotlight} Points en 1 Crédit Spotlight ⚡ avec succès.`);
    } catch (e: any) {
      alert("Erreur lors de la conversion : " + (e.message || "Problème réseau"));
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* ARRIÈRE-PLAN SOMBRE FLOU */}
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />

      {/* BOÎTE MODALE HYPER INTUITIVE */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 z-10 animate-in zoom-in-95 duration-200 text-left">
        
        {/* EN-TÊTE FIXE ET COMPACT */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 p-4 sm:p-5 text-white shrink-0 relative">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded-full transition cursor-pointer"
            title="Fermer"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2 mb-1 pr-8">
            <span className="text-2xl">💎</span>
            <h2 className="text-base sm:text-lg font-black tracking-tight">Guide des Points & Crédits</h2>
          </div>
          <p className="text-[11px] sm:text-xs text-emerald-200 leading-snug">
            Cumulez des Points de Confiance et convertissez-les en Crédits Spotlight.
          </p>

          {/* CARTE SOLDE ET CONVERSION RAPIDE */}
          <div className="mt-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div>
              <p className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-200">Votre Solde Actuel</p>
              <p className="text-xs sm:text-sm font-black text-white">
                💎 <span className="text-amber-300 font-mono text-sm sm:text-base">{currentPoints}</span> Points • ⚡ <span className="text-amber-300 font-mono text-sm sm:text-base">{currentCredits}</span> Crédits
              </p>
            </div>
            
            <button
              onClick={handleConvertPoints}
              disabled={!canConvert || isConverting}
              className={`px-3.5 py-2 rounded-xl font-black text-[11px] sm:text-xs transition shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap ${
                canConvert
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 cursor-pointer shadow-amber-500/20 active:scale-95'
                  : 'bg-white/15 text-white/40 cursor-not-allowed'
              }`}
            >
              <Zap size={14} className="fill-current" />
              <span>{isConverting ? '...' : `Convertir (${pointsPerSpotlight} Pts ➔ 1 ⚡)`}</span>
            </button>
          </div>
        </div>

        {/* CORPS DU TEXTE DÉROULANT FLUIDE */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-slate-800">
          
          {/* SECTION 1 : LES POINTS */}
          <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl">💎</span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">1. Les Points de Confiance & Engagement</h3>
                <p className="text-[10px] sm:text-[11px] text-emerald-800 font-semibold">La monnaie de fidélité et d'assiduité spirituelle de l'utilisateur.</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-emerald-100/80 text-xs">
              <p className="font-bold text-slate-800 uppercase text-[9px] sm:text-[10px] tracking-wider">Comment les gagner ? (100% Gratuit) :</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                  <Flame size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Connexion quotidienne</strong> : +10 pts / jour (Série de Foi)</span>
                </div>
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                  <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Vérification CNI & Vidéo</strong> : +100 pts bonus</span>
                </div>
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                  <HeartHandshake size={15} className="text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Intention ou Intercession</strong> : +15 pts sur le Cercle de Prières</span>
                </div>
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100 shadow-2xs">
                  <Users size={15} className="text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Parrainage d'ami(e)s</strong> : +150 pts par ami invité</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed">
              <strong>À quoi ils servent ?</strong> Récompensent les membres sérieux. Vous pouvez convertir vos points accumulés pour obtenir des <strong>Crédits Spotlight gratuits</strong> ({pointsPerSpotlight} pts = 1 Boost) sans dépenser d'argent !
            </div>
          </div>

          {/* SECTION 2 : LES CREDITS SPOTLIGHT */}
          <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl">⚡</span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">2. Les Crédits Spotlight (Boost de Paroisse)</h3>
                <p className="text-[10px] sm:text-[11px] text-amber-800 font-semibold">Jeton d'action immédiate pour la visibilité des rencontres.</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-amber-100/80 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-amber-100 text-[11px] text-amber-950 leading-relaxed">
                <strong>À quoi ils servent ?</strong> 1 Crédit Spotlight propulse votre profil en <strong>toute première position</strong> en tête de la liste des célibataires de votre paroisse/ville pendant <strong>30 minutes</strong> avec un halo doré lumineux 🌟.
              </div>

              <p className="font-bold text-slate-800 uppercase text-[9px] sm:text-[10px] tracking-wider pt-1">Comment les obtenir ? :</p>
              <ul className="space-y-1.5 text-[11px] text-slate-700 pl-0.5">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-amber-600 shrink-0" />
                  <span>🎁 <strong>1 Boost gratuit offert chaque semaine</strong> à tous les membres.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-amber-600 shrink-0" />
                  <span>💎 <strong>En convertissant vos Points accumulés</strong> ({pointsPerSpotlight} points = 1 Boost).</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-amber-600 shrink-0" />
                  <span>💳 <strong>En les achetant directement</strong> ou via un Don Libre de soutien à la plateforme.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* RESUME FINAL */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl text-[11px] space-y-1">
            <p className="font-bold text-amber-400 uppercase tracking-wider text-[9px]">💡 En résumé :</p>
            <p>• Les <strong>Points</strong> s'accumulent au fil du temps par la fidélité et la prière 💎</p>
            <p>• Les <strong>Crédits Spotlight</strong> sont dépensés pour mettre votre profil en vedette ⚡</p>
          </div>

        </div>

        {/* PIED DE PAGE FIXE AVEC BOUTONS PROPRES */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200/80 shrink-0 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-800 px-3 py-2 rounded-xl transition cursor-pointer"
          >
            Fermer
          </button>

          <button
            onClick={handleConvertPoints}
            disabled={!canConvert || isConverting}
            className={`px-4 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
              canConvert
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Convertir mes Points ({pointsPerSpotlight} Pts)</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
};
