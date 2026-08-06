import React, { useState } from 'react';
import { Sparkles, Flame, ShieldCheck, HeartHandshake, Users, Zap, CheckCircle, ArrowRight, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 z-10 animate-in zoom-in-95 duration-300 text-left my-8">
        
        {/* HEADER GLAMOUR */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 p-6 text-white relative overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-3xl">💎</span>
            <h2 className="text-xl font-extrabold">Guide des Points & Crédits</h2>
          </div>
          <p className="text-xs text-emerald-200 leading-relaxed">
            Comprenez comment accumuler vos Points de Confiance et les convertir en visibilité Spotlight.
          </p>

          {/* SOLDE EN DIRECT */}
          <div className="mt-4 flex items-center justify-between bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15">
            <div>
              <p className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-200">Votre Solde Actuel</p>
              <p className="text-sm font-black text-white">
                💎 <span className="text-amber-300 font-mono text-base">{currentPoints}</span> Points • ⚡ <span className="text-amber-300 font-mono text-base">{currentCredits}</span> Crédits
              </p>
            </div>
            
            <button
              onClick={handleConvertPoints}
              disabled={!canConvert || isConverting}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs transition shadow-md flex items-center gap-1.5 ${
                canConvert
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 shadow-amber-500/20 cursor-pointer animate-pulse'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              <Zap size={14} className="fill-current" />
              <span>{isConverting ? 'Conversion...' : `Convertir (${pointsPerSpotlight} Pts ➔ 1 ⚡)`}</span>
            </button>
          </div>
        </div>

        {/* CORPS DE L'EXPLICATION */}
        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          
          {/* SECTION 1 : LES POINTS */}
          <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-200/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">💎</span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">1. Les Points de Confiance & Engagement</h3>
                <p className="text-[11px] text-emerald-800 font-medium">La monnaie de fidélité et d'assiduité spirituelle de l'utilisateur.</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-emerald-100 text-xs text-slate-700">
              <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">Comment les gagner ? (100% Gratuit) :</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100">
                  <Flame size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Connexion quotidienne</strong> : +10 pts / jour (Série de Foi)</span>
                </div>
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Vérification CNI & Vidéo</strong> : +100 pts bonus</span>
                </div>
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100">
                  <HeartHandshake size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Intention ou Intercession</strong> : +15 pts sur le Cercle de Prières</span>
                </div>
                <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-emerald-100">
                  <Users size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Parrainage d'ami(e)s</strong> : +150 pts par ami invité</span>
                </div>
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
              <strong>À quoi ils servent ?</strong> Récompensent les membres sérieux. Vous pouvez convertir vos points accumulés pour obtenir des <strong>Crédits Spotlight gratuits</strong> ({pointsPerSpotlight} pts = 1 Boost) sans dépenser d'argent !
            </div>
          </div>

          {/* SECTION 2 : LES CREDITS SPOTLIGHT */}
          <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200/80 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">2. Les Crédits Spotlight (Boost de Paroisse)</h3>
                <p className="text-[11px] text-amber-800 font-medium">Jeton d'action immédiate pour la visibilité des rencontres.</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-amber-100 text-xs text-slate-700">
              <div className="bg-white p-3 rounded-xl border border-amber-100 leading-relaxed">
                <strong>À quoi ils servent ?</strong> 1 Crédit Spotlight propulse votre profil en <strong>toute première position</strong> en tête de la liste des célibataires de votre paroisse/ville pendant <strong>30 minutes</strong> avec un halo doré lumineux 🌟.
              </div>

              <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider pt-1">Comment les obtenir ? :</p>
              <ul className="space-y-1.5 text-[11px] text-slate-700 pl-1">
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
          <div className="bg-slate-900 text-white p-4 rounded-2xl text-xs space-y-1.5">
            <p className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">💡 En résumé :</p>
            <p>• Les <strong>Points</strong> s'accumulent au fil du temps par la fidélité, la présence et la prière 💎</p>
            <p>• Les <strong>Crédits Spotlight</strong> sont dépensés pour mettre votre profil en vedette pendant 30 minutes ⚡</p>
          </div>

        </div>

        {/* FOOTER ACTION */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl transition"
          >
            Fermer le guide
          </button>

          <button
            onClick={handleConvertPoints}
            disabled={!canConvert || isConverting}
            className={`px-5 py-2.5 rounded-xl font-extrabold text-xs transition flex items-center gap-2 shadow-md ${
              canConvert
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
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
