import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Heart, Users, BookOpen, Calendar, ShieldCheck,
  ChevronDown, ChevronUp, Sparkles, Check, ArrowRight,
  Lock, Flame, UserCheck, Star, Church, Award, MessageCircle,
  Play, Pause, Volume2, VolumeX
} from 'lucide-react';
import { AppView } from '../types';

interface LandingPageProps {
  onNavigate: (view: AppView) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  // --- ÉTATS DU SIMULATEUR DE COMPATIBILITÉ ---
  const [simulatorStep, setSimulatorStep] = useState(1);
  const [simName, setSimName] = useState('');
  const [simGender, setSimGender] = useState<'M' | 'F'>('M');
  const [simLookingFor, setSimLookingFor] = useState<'M' | 'F'>('F');
  const [simDenomination, setSimDenomination] = useState('Évangélique');
  const [simInterest, setSimInterest] = useState('Louange');
  const [progress, setProgress] = useState(0);
  const [simulatorResult, setSimulatorResult] = useState<any>(null);

  // --- ÉTATS DU TOGGLE DE TARIF ---
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'semiannual' | 'annual'>('monthly');

  // --- ÉTATS DE L'ACCORDÉON FAQ ---
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // --- ÉTATS DU LECTEUR VIDÉO HERO ---
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Accélération de la vitesse de lecture vidéo (x1.35)
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.35;
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // --- LOGIQUE DU CALCUL DU SIMULATEUR ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (simulatorStep === 3) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              const matchedProfiles = [
                {
                  name: 'Grace Émmanuella',
                  age: 24,
                  location: 'Abidjan, Cocody',
                  parish: 'St-Jean Cocody',
                  denomination: 'Catholique',
                  bio: 'Passionnée de chorale et d\'action caritative. Je recherche un frère en Christ pour marcher ensemble.',
                  imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&h=300&q=80',
                  matchPct: 96,
                },
                {
                  name: 'Marc-Aurèle K.',
                  age: 28,
                  location: 'Abidjan, Yopougon',
                  parish: 'AD Yopougon',
                  denomination: 'Évangélique',
                  bio: 'Prédicateur de jeunesse, passionné de théologie, de sport et d\'étude biblique. Fonder un foyer saint.',
                  imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&h=300&q=80',
                  matchPct: 94,
                },
                {
                  name: 'Esther Koffi',
                  age: 25,
                  location: 'Bouaké',
                  parish: 'Temple Canaan',
                  denomination: 'Méthodiste',
                  bio: 'Institutrice douce, dévouée pour l\'école du dimanche. J\'aime la randonnée et le chant.',
                  imageUrl: 'https://images.unsplash.com/photo-1523824921871-d6f1a15151f1?auto=format&fit=crop&w=300&h=300&q=80',
                  matchPct: 91,
                }
              ];
              const matched = simLookingFor === 'F'
                ? (simDenomination === 'Catholique' ? matchedProfiles[0] : matchedProfiles[2])
                : matchedProfiles[1];

              setSimulatorResult(matched);
              setSimulatorStep(4);
            }, 600);
            return 100;
          }
          return prev + 5;
        });
      }, 80);
    }
    return () => clearInterval(interval);
  }, [simulatorStep, simLookingFor, simDenomination]);

  const startSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simName.trim()) return;
    setSimulatorStep(2);
  };

  const nextSimulationStep = () => {
    setSimulatorStep(3);
  };

  const resetSimulator = () => {
    setSimName('');
    setSimulatorStep(1);
    setSimulatorResult(null);
    setProgress(0);
  };

  // --- TARIFS DYNAMIQUES ---
  const getPrice = () => {
    switch (billingPeriod) {
      case 'monthly':
        return { amount: '1 500', period: 'mois', save: null };
      case 'semiannual':
        return { amount: '7 500', period: '6 mois', save: 'Économisez 16%' };
      case 'annual':
        return { amount: '12 000', period: 'an', save: 'Économisez 33%' };
    }
  };

  const activePrice = getPrice();

  // --- QUESTIONS FAQ ---
  const faqData = [
    {
      q: "L'application est-elle ouverte aux protestants et évangéliques ?",
      a: "Absolument ! Initialement catholique, 225 Chrétien est aujourd'hui une plateforme pleinement œcuménique. Elle accueille chaleureusement tous les chrétiens de Côte d'Ivoire : Catholiques, Évangéliques, Méthodistes, Baptistes et Assemblées de Dieu, unis par la même foi en Jésus-Christ."
    },
    {
      q: "Comment garantissez-vous le sérieux et la sécurité des profils ?",
      a: "La sécurité est notre priorité spirituelle. Chaque profil passe par une double vérification obligatoire : validation d'une preuve d'appartenance chrétienne (certificat de baptême, lettre de recommandation pastorale ou engagement d'église) et une vérification vidéo en direct (liveness test)."
    },
    {
      q: "Que signifie la section 'Discernement & Vocation' ?",
      a: "Nous croyons que chaque vie chrétienne est un appel. En plus des rencontres en vue du saint mariage, notre espace Vocation propose des guides de discernement, des ressources inspirantes, et des contacts directs avec des pasteurs, prêtres et conseillers spirituels qualifiés."
    },
    {
      q: "Comment fonctionne le Simulateur de Compatibilité ?",
      a: "Notre simulateur exclusif croise vos valeurs fondamentales, votre confession, vos centres d'intérêt spirituels et vos engagements d'église pour estimer une compatibilité théologique, humaine et pratique."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen relative overflow-hidden pb-20 font-sans">
      {/* Halo lumineux d'arrière-plan */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-100/50 via-emerald-50/20 to-transparent pointer-events-none blur-3xl"></div>

      {/* ----------------------------------------------------------------------
          1. HERO SECTION AVEC ANIMATION VIDÉO EN ARRIÈRE-PLAN (GUI.MARKETING STYLE)
         ---------------------------------------------------------------------- */}
      <header className="relative min-h-[640px] lg:min-h-[720px] flex items-center pt-12 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 my-4 rounded-3xl overflow-hidden shadow-2xl border border-emerald-500/30 bg-emerald-950/20">

        {/* ARRIÈRE-PLAN VIDÉO DYNAMIQUE BIEN VISIBLE (/Public/videoh.mp4) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-900">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            onPlay={(e) => { e.currentTarget.playbackRate = 1.35; }}
            onLoadedMetadata={(e) => { e.currentTarget.playbackRate = 1.35; }}
            className="w-full h-full object-cover object-[35%_center] sm:object-center scale-105 sm:scale-100 transition-all duration-700 opacity-95"
          >
            <source src="/Public/videoh.mp4" type="video/mp4" />
            <source src="/videoh.mp4" type="video/mp4" />
            <source src="Public/videoh.mp4" type="video/mp4" />
          </video>

          {/* Overlays Verts Très Transparents pour laisser voir la vidéo en arrière-plan */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-emerald-900/15 to-emerald-950/40 pointer-events-none"></div>
          <div className="absolute inset-0 bg-emerald-950/15 backdrop-blur-[0.5px] pointer-events-none"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent pointer-events-none"></div>

          {/* Subtile grille géométrique */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98110_1px,transparent_1px),linear-gradient(to_bottom,#10b98110_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none"></div>
        </div>

        {/* CONTENU HERO SURPLOMBANT LA VIDÉO */}
        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-8">

          {/* Colonne Gauche: Titre & Appel à l'action */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">

            {/* Badge Pill Supérieur (Style Blanc Lumineux & Émeraude) */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 border border-emerald-200 text-slate-800 text-xs sm:text-sm font-semibold backdrop-blur-md shadow-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
              </span>
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>La 1ère plateforme chrétienne ivoirienne</span>
              <span className="bg-emerald-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide shadow-xs">100% Sécurisé</span>
            </div>

            {/* Titre Principal avec ombres de contraste sur vidéo */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight font-display text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              <span className="block text-white">
                Unis par la Foi,
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-emerald-300 to-white mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Bâtir un Foyer Saint.
              </span>
            </h1>

            {/* Sous-titre avec ombre portée lisible */}
            <p className="text-base sm:text-lg text-slate-100 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
              Rencontres sérieuses, discernement de la vocation amoureuse et communion fraternelle en Côte d'Ivoire &amp; Diaspora.
              Ouvert aux <strong className="text-emerald-300 font-semibold underline decoration-emerald-400/50 underline-offset-4">Catholiques, Évangéliques, Protestants, Méthodistes et Baptistes</strong>.
            </p>

            {/* Boutons d'action principaux */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
              <button
                onClick={() => onNavigate(AppView.AUTH_REGISTER)}
                className="btn-emerald-primary px-8 py-4 rounded-xl flex items-center justify-center gap-2 group text-base font-bold shadow-xl shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <span>Rejoindre la communauté</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => {
                  const simEl = document.getElementById('simulator-section');
                  simEl?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-4 rounded-xl bg-white/90 hover:bg-white border border-emerald-200 text-emerald-800 font-semibold flex items-center justify-center gap-2 text-base backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Simuler la compatibilité</span>
              </button>
            </div>

            {/* Badges de confiance Blancs & Émeraude */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4 text-slate-800 text-xs font-semibold">
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-200 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Profils Chrétiens Vérifiés</span>
              </div>
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-200 shadow-sm">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Vérification Vidéo IA</span>
              </div>
              <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-emerald-200 shadow-sm">
                <Lock className="w-4 h-4 text-emerald-600" />
                <span>Respect &amp; Rigueur</span>
              </div>
            </div>
          </div>

          {/* Colonne Droite: Showcase Card GUI.marketing Blanc Lumineux */}
          <div className="lg:col-span-5 relative w-full max-w-[420px] mx-auto">
            {/* Carte Showcase Centrale */}
            <div className="relative rounded-3xl overflow-hidden p-6 bg-white/92 backdrop-blur-xl border-2 border-emerald-500/30 shadow-2xl space-y-5 animate-float-slow">
              
              {/* Badge d'en-tête de carte */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <Church className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-extrabold text-white uppercase tracking-wider">Union Bénie</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-sm">
                  Fonder un Foyer ↗
                </span>
              </div>

              {/* Contenu principal de la carte avec écritures en Blanc */}
              <div className="space-y-3 text-center py-2">
                <p className="text-xs text-white font-extrabold tracking-wide uppercase drop-shadow-sm">Une rencontre selon le cœur de Dieu</p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight font-display drop-shadow-md">
                  Trouvez un partenaire qui <br />
                  <span className="italic font-serif text-white font-normal drop-shadow-md">partage votre foi &amp; vos valeurs.</span>
                </h3>
                <p className="text-xs text-white leading-relaxed px-2 font-medium drop-shadow-xs">
                  <strong className="text-white font-bold">225 Chrétien</strong> transforme votre recherche en un chemin béni et sécurisé vers le mariage en Christ.
                </p>
              </div>

              {/* Bouton principal de la carte en Vert Émeraude */}
              <button
                onClick={() => onNavigate(AppView.AUTH_REGISTER)}
                className="w-full py-4 px-6 rounded-full btn-emerald-primary text-white font-extrabold text-sm flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] shadow-lg shadow-emerald-600/25 group"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
                <span>Rejoindre 225 Chrétien</span>
              </button>

              {/* Cartes flottantes superposées de démonstration de profils (Fonds en blanc) */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div className="bg-white backdrop-blur-md rounded-xl p-2.5 border border-amber-400/40 flex items-center gap-2 shadow-md">
                  <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&h=150&q=80" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 shadow-sm" />
                  <div className="text-left overflow-hidden">
                    <p className="text-[11px] font-extrabold text-amber-500 truncate drop-shadow-xs">Grace E. (26a)</p>
                    <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5 fill-current text-emerald-600" /> 95% Match
                    </p>
                  </div>
                </div>

                <div className="bg-white backdrop-blur-md rounded-xl p-2.5 border border-amber-400/40 flex items-center gap-2 shadow-md">
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="w-9 h-9 rounded-full object-cover border-2 border-amber-400 shadow-sm" />
                  <div className="text-left overflow-hidden">
                    <p className="text-[11px] font-extrabold text-amber-500 truncate drop-shadow-xs">Michel O. (29a)</p>
                    <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                      <Heart className="w-2.5 h-2.5 fill-current text-emerald-600" /> 88% Match
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* BOUTONS D'ACTION FLOTTANTS BAS DE PAGE (FOND BLANC LUMINEUX) */}
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center items-center gap-3 px-4 flex-wrap">
          <button
            onClick={() => {
              const simEl = document.getElementById('simulator-section');
              simEl?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 rounded-full bg-amber-400 text-amber-950 font-bold text-xs flex items-center gap-1.5 shadow-lg hover:bg-amber-300 transition-all hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Simulateur IA Chrétien</span>
          </button>

          <button
            onClick={togglePlay}
            className="px-4 py-2 rounded-full bg-white/95 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-md hover:bg-emerald-50 transition-all hover:scale-105 border border-emerald-200"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 text-emerald-700" /> : <Play className="w-3.5 h-3.5 fill-current text-emerald-700" />}
            <span>{isPlaying ? 'Pause Animation' : 'Animer'}</span>
          </button>

          <button
            onClick={toggleMute}
            className="px-4 py-2 rounded-full bg-white/95 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-md hover:bg-emerald-50 transition-all hover:scale-105 border border-emerald-200"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isMuted ? 'Mode Muet' : 'Son On'}</span>
          </button>
        </div>

      </header>

      {/* ----------------------------------------------------------------------
          2. COMPATIBILITY SIMULATOR SECTION
         ---------------------------------------------------------------------- */}
      <section id="simulator-section" className="py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10">
        <div className="text-center space-y-3 mb-10">
          <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider bg-emerald-100/80 px-3 py-1 rounded-full">Test interactif gratuit</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-slate-900">
            Simulez Votre <span className="text-emerald-700">Compatibilité Chrétienne</span>
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-sm sm:text-base">
            Découvrez en quelques clics si des célibataires partageant vos valeurs spirituelles et votre confession vous correspondent.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-100 shadow-xl relative">

          {/* Stepper */}
          <div className="flex justify-between items-center mb-8 max-w-md mx-auto">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${simulatorStep === step
                  ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md'
                  : simulatorStep > step
                    ? 'bg-emerald-800 text-white'
                    : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                  {step === 4 && simulatorStep === 4 ? <Check className="w-4 h-4 stroke-[3]" /> : step}
                </div>
                {step < 4 && (
                  <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-500 ${simulatorStep > step ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}></div>
                )}
              </div>
            ))}
          </div>

          {/* Étape 1 */}
          {simulatorStep === 1 && (
            <form onSubmit={startSimulation} className="space-y-6 max-w-lg mx-auto">
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800">Quel est votre prénom ?</label>
                <input
                  type="text"
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="Ex: Christian, Marie, Emmanuel..."
                  className="w-full p-4 rounded-xl input-premium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">Vous êtes :</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSimGender('M')}
                      className={`flex-1 p-3.5 rounded-xl border font-semibold text-sm transition-all min-h-[48px] ${simGender === 'M'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      Homme
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimGender('F')}
                      className={`flex-1 p-3.5 rounded-xl border font-semibold text-sm transition-all min-h-[48px] ${simGender === 'F'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      Femme
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-800">Vous recherchez :</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSimLookingFor('F')}
                      className={`flex-1 p-3.5 rounded-xl border font-semibold text-sm transition-all min-h-[48px] ${simLookingFor === 'F'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      Une Femme
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimLookingFor('M')}
                      className={`flex-1 p-3.5 rounded-xl border font-semibold text-sm transition-all min-h-[48px] ${simLookingFor === 'M'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      Un Homme
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full btn-emerald-primary py-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold min-h-[48px]"
              >
                <span>Continuer la simulation</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {/* Étape 2 */}
          {simulatorStep === 2 && (
            <div className="space-y-6 max-w-lg mx-auto">
              <h3 className="text-lg font-bold text-emerald-800 text-center">Ravi de vous connaître, {simName} !</h3>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800">Votre Confession Chrétienne :</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {['Catholique', 'Évangélique', 'Méthodiste', 'Baptiste', 'Assemblées de Dieu', 'Autre Christianisme'].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => setSimDenomination(denom)}
                      className={`p-3 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${simDenomination === denom
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      {denom}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-800">Votre engagement principal :</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Louange', 'Étude Biblique', 'Chorale', 'Bénévolat', 'Théologie', 'Prière'].map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => setSimInterest(interest)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border transition-all min-h-[44px] ${simInterest === interest
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={nextSimulationStep}
                className="w-full btn-emerald-primary py-4 rounded-xl flex items-center justify-center gap-2 text-base font-bold"
              >
                <span>Calculer la compatibilité spirituelle</span>
                <Flame className="w-5 h-5 text-amber-300 animate-pulse" />
              </button>
            </div>
          )}

          {/* Étape 3 */}
          {simulatorStep === 3 && (
            <div className="text-center py-10 space-y-6 max-w-md mx-auto">
              <div className="relative inline-flex items-center justify-center">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin"></div>
                <Heart className="absolute w-7 h-7 text-emerald-600 fill-current animate-pulse" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900">Analyse de compatibilité...</h3>
                <p className="text-xs text-slate-500">Recherche de célibataires chrétiens en Côte d'Ivoire.</p>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="text-emerald-700 font-bold text-sm">{progress}% complété</span>
            </div>
          )}

          {/* Étape 4 */}
          {simulatorStep === 4 && simulatorResult && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center space-y-1">
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" /> Compatibilité Trouvée !
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 font-display">Un profil hautement compatible correspond à vos critères !</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50 border border-emerald-100 rounded-2xl p-6 items-center">
                <div className="md:col-span-4 flex justify-center">
                  <div className="relative w-36 h-36 rounded-full overflow-hidden border-4 border-emerald-600 shadow-md">
                    <img
                      src={simulatorResult.imageUrl}
                      alt={simulatorResult.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                      <Heart className="w-3 h-3 fill-current" /> {simulatorResult.matchPct}%
                    </div>
                  </div>
                </div>

                <div className="md:col-span-8 space-y-3 text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h4 className="text-xl font-bold text-slate-900">{simulatorResult.name} • {simulatorResult.age} ans</h4>
                    <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      {simulatorResult.denomination}
                    </span>
                  </div>

                  <p className="text-slate-600 text-sm italic">
                    "{simulatorResult.bio}"
                  </p>

                  <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-slate-600">
                    <div>⛪ Paroisse/Temple : <strong className="text-slate-900">{simulatorResult.parish}</strong></div>
                    <div>📍 Ville : <strong className="text-slate-900">{simulatorResult.location}</strong></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => onNavigate(AppView.AUTH_REGISTER)}
                  className="btn-emerald-primary px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <span>Créer mon compte pour contacter</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={resetSimulator}
                  className="btn-emerald-outline px-6 py-3.5 rounded-xl text-sm font-semibold"
                >
                  Refaire le test
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          3. FEATURE GRID SECTION (PILIERS)
         ---------------------------------------------------------------------- */}
      <section className="py-20 bg-slate-100/70 border-y border-emerald-100/60 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <span className="text-emerald-700 font-bold text-xs tracking-widest uppercase bg-emerald-100 px-3 py-1 rounded-full">Engagement & Valeurs</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-slate-900">
              Bâtir des Foyers Solides en Christ
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-base">
              Découvrez des fonctionnalités conçues pour allier authenticité spirituelle et rencontres sincères.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Rencontres Sincères</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Des profils vérifiés avec rigueur pour privilégier l'honnêteté, le respect et la foi partagée.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Vocation & Discernement</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Ressources spirituelles et orientation pour mieux appréhender le mariage et l'engagement chrétien.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Forum & Communion</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Échanges fraternels, partage de témoignages et soutien dans la prière entre frères et sœurs.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Événements Chrétiens</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Participez aux concerts, conférences, veillées et activités de groupe inter-églises en Côte d'Ivoire.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          4. PRICING SECTION
         ---------------------------------------------------------------------- */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto relative z-10">
        <div className="text-center space-y-3 mb-12">
          <span className="text-emerald-700 font-bold text-xs uppercase tracking-wider bg-emerald-100 px-3 py-1 rounded-full">Transparence Totale</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-slate-900">
            Un Accès Simple Pour <span className="text-emerald-700">Soutenir le Projet</span>
          </h2>
          <p className="text-slate-600 max-w-xl mx-auto text-base">
            Notre abonnement accessible garantit un espace d'échanges modéré et sécurisé.
          </p>

          <div className="inline-flex p-1.5 rounded-full bg-slate-200/80 border border-slate-300 mt-4">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${billingPeriod === 'monthly'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingPeriod('semiannual')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${billingPeriod === 'semiannual'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Semestriel (-16%)
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${billingPeriod === 'annual'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Annuel (-33%)
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-3xl p-8 border-2 border-emerald-600 text-center shadow-xl relative">
            <div className="inline-block bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              Formule Complète
            </div>

            <h3 className="text-2xl font-bold text-slate-900 font-display">Abonnement Fraternité</h3>

            <div className="mt-4 flex justify-center items-baseline">
              <span className="text-5xl font-extrabold text-emerald-700 tracking-tight">
                {activePrice.amount}
              </span>
              <span className="ml-1.5 text-sm text-slate-500 font-semibold">FCFA / {activePrice.period}</span>
            </div>

            <ul className="mt-8 space-y-3.5 text-left border-y border-slate-100 py-6 text-slate-700 text-sm">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Accès illimité aux profils vérifiés</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Messagerie privée sécurisée</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Ressources de discernement spirituel</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Participation aux événements exclusifs</span>
              </li>
            </ul>

            <button
              onClick={() => onNavigate(AppView.AUTH_REGISTER)}
              className="mt-8 w-full btn-emerald-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-base shadow-md"
            >
              <span>Commencer maintenant</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
              <Lock className="w-3.5 h-3.5" /> Paiement sécurisé Wave, Orange Money, MTN, CB
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------
          5. FAQ SECTION
         ---------------------------------------------------------------------- */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto relative z-10 border-t border-slate-200">
        <div className="text-center space-y-3 mb-10">
          <h2 className="text-3xl font-extrabold tracking-tight font-display text-slate-900">
            Foire Aux Questions (FAQ)
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Des réponses claires à vos questions les plus fréquentes.
          </p>
        </div>

        <div className="space-y-3">
          {faqData.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-emerald-100/80 overflow-hidden shadow-xs"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-5 text-left font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                >
                  <span className="text-base sm:text-lg">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0 ml-2" />
                  )}
                </button>

                {isOpen && (
                  <div className="p-5 pt-0 border-t border-slate-100 text-slate-600 text-sm leading-relaxed bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-center text-xs text-slate-500 py-10 border-t border-slate-200 max-w-7xl mx-auto px-4 mt-12 rounded-t-3xl shadow-xs">
        <p>© 2026 225 Chrétien. Plateforme réservée à la communauté chrétienne de Côte d'Ivoire et de la diaspora.</p>
        <p className="mt-1 font-semibold text-emerald-800">"Bâtis sur la pierre angulaire qui est le Christ." — Éphésiens 2:20</p>
      </footer>
    </div>
  );
};
