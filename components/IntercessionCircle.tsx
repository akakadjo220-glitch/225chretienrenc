import React, { useState, useEffect } from 'react';
import { HeartHandshake, Flame, Plus, Sparkles, Filter, Search, Shield, Send, CheckCircle2, MessageSquare, User, Lock, Heart } from 'lucide-react';
import { supabase } from '../supabaseClient';

export interface PrayerIntention {
  id: string;
  authorName: string;
  authorAvatar?: string;
  isAnonymous: boolean;
  category: 'DISCERNMENT' | 'HEALTH' | 'FAMILY' | 'WORK' | 'THANKSGIVING';
  title: string;
  content: string;
  candleCount: number;
  hasInterceded?: boolean;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  ALL: { label: 'Toutes les intentions', icon: '🙏', color: 'bg-slate-100 text-slate-800' },
  DISCERNMENT: { label: 'Discernement Amoureux', icon: '💍', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  HEALTH: { label: 'Santé & Guérison', icon: '🌿', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  FAMILY: { label: 'Famille & Foyer', icon: '🏡', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  WORK: { label: 'Projet & Travail', icon: '💼', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  THANKSGIVING: { label: 'Action de Grâces', icon: '✨', color: 'bg-rose-100 text-rose-800 border-rose-200' }
};

const INITIAL_PRAYERS: PrayerIntention[] = [
  {
    id: 'p-1',
    authorName: 'Sœur Marie-Ange',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    isAnonymous: false,
    category: 'DISCERNMENT',
    title: "Prière pour le discernement du mariage chrétien",
    content: "Je demande le soutien du cercle d'intercession afin que le Seigneur guide mes pas vers une rencontre sainte, bâtie sur la foi et l'amour sincère.",
    candleCount: 24,
    createdAt: 'Il y a 2 heures'
  },
  {
    id: 'p-2',
    authorName: 'Frère Anonyme',
    isAnonymous: true,
    category: 'HEALTH',
    title: "Guérison et bénédiction pour ma mère hospitalisée",
    content: "Merci de porter ma mère dans vos prières quotidiennes. Que la grâce du Christ touche son corps et lui apporte un prompt rétablissement.",
    candleCount: 42,
    createdAt: 'Il y a 5 heures'
  },
  {
    id: 'p-3',
    authorName: 'Jean-Philippe K.',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    isAnonymous: false,
    category: 'THANKSGIVING',
    title: "Action de grâces pour une nouvelle opportunité pro",
    content: "Gloire à Dieu ! Après des mois d'attente et de prières, le Seigneur a ouvert une porte professionnelle inespérée. Merci pour vos prières !",
    candleCount: 56,
    createdAt: 'Hier'
  }
];

export const IntercessionCircle: React.FC = () => {
  const [prayers, setPrayers] = useState<PrayerIntention[]>(INITIAL_PRAYERS);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPrayerModal, setShowNewPrayerModal] = useState(false);

  // Formulaire d'intention
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'DISCERNMENT' | 'HEALTH' | 'FAMILY' | 'WORK' | 'THANKSGIVING'>('DISCERNMENT');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleIntercede = (id: string) => {
    setPrayers(prev => prev.map(p => {
      if (p.id === id) {
        const hasAlready = p.hasInterceded;
        return {
          ...p,
          candleCount: hasAlready ? p.candleCount - 1 : p.candleCount + 1,
          hasInterceded: !hasAlready
        };
      }
      return p;
    }));
  };

  const handleCreatePrayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newPrayerItem: PrayerIntention = {
        id: `p-${Date.now()}`,
        authorName: isAnonymous ? 'Frère / Sœur Anonyme' : 'Membre Chrétien',
        isAnonymous,
        category,
        title: title.trim(),
        content: content.trim(),
        candleCount: 1,
        hasInterceded: true,
        createdAt: 'À l\'instant'
      };

      setPrayers([newPrayerItem, ...prayers]);
      setTitle('');
      setContent('');
      setIsAnonymous(false);
      setIsSubmitting(false);
      setShowNewPrayerModal(false);
    }, 400);
  };

  const filteredPrayers = prayers.filter(p => {
    const matchesCategory = activeCategory === 'ALL' || p.category === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCandles = prayers.reduce((acc, p) => acc + p.candleCount, 0);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* BANNIÈRE SUPÉRIEURE DU CERCLE D'INTERCESSION */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden text-left border border-amber-300">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-amber-100 font-extrabold text-xs uppercase tracking-wider mb-3">
              <Sparkles size={14} />
              <span>Cercle d'Intercession Fraternelle</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Soutien par la Prière Quotidienne 🙏
            </h2>
            <p className="text-amber-100 text-xs md:text-sm max-w-xl mt-2 leading-relaxed">
              "Car là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux." — <em>Matthieu 18:20</em>. Deposez vos intentions et allumez une bougie pour vos frères et sœurs.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Stat Global */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 text-center min-w-[140px]">
              <div className="flex items-center justify-center gap-1.5 text-amber-200">
                <Flame size={18} className="fill-amber-300 animate-pulse" />
                <span className="text-xl font-black text-white">{totalCandles}</span>
              </div>
              <p className="text-[10px] uppercase font-bold text-amber-100 tracking-wider">Bougies Allumées</p>
            </div>

            <button
              onClick={() => setShowNewPrayerModal(true)}
              className="bg-white hover:bg-amber-50 text-amber-900 font-extrabold px-5 py-3.5 rounded-2xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={18} className="text-amber-600" />
              <span>Déposer une Intention</span>
            </button>
          </div>
        </div>
      </div>

      {/* RECHERCHE ET FILTRES PAR CATÉGORIES */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filtres d'onglets */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {Object.entries(CATEGORY_LABELS).map(([key, cat]) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Barre de Recherche */}
        <div className="relative min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher une intention..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* LISTE DES INTENTIONS DE PRIÈRE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        {filteredPrayers.length > 0 ? (
          filteredPrayers.map(p => {
            const catInfo = CATEGORY_LABELS[p.category] || CATEGORY_LABELS.DISCERNMENT;

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Header de la Carte */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      {p.isAnonymous || !p.authorAvatar ? (
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center border border-amber-200 shrink-0">
                          🙏
                        </div>
                      ) : (
                        <img src={p.authorAvatar} alt={p.authorName} className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <span>{p.authorName}</span>
                          {p.isAnonymous && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Anonyme</span>}
                        </p>
                        <p className="text-[10px] text-slate-400">{p.createdAt}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${catInfo.color}`}>
                      {catInfo.icon} {catInfo.label}
                    </span>
                  </div>

                  {/* Titre et Contenu */}
                  <h4 className="text-base font-extrabold text-slate-900 leading-snug mb-1.5">
                    {p.title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    "{p.content}"
                  </p>
                </div>

                {/* Footer Action Bougie Virtuelle */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-extrabold">
                    <Flame size={16} className={`text-amber-500 ${p.hasInterceded ? 'fill-amber-400 animate-pulse' : ''}`} />
                    <span>{p.candleCount} {p.candleCount > 1 ? 'Prières élevées' : 'Prière élevée'}</span>
                  </div>

                  <button
                    onClick={() => handleIntercede(p.id)}
                    className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                      p.hasInterceded
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <span>🕯️</span>
                    <span>{p.hasInterceded ? 'Intercédé !' : "J'intercède"}</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200 text-slate-400 space-y-3">
            <HeartHandshake size={48} className="mx-auto text-amber-300 mb-2" />
            <h4 className="text-lg font-bold text-slate-700">Aucune intention de prière trouvée</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Soyez le premier à déposer une intention ou modifiez vos critères de recherche.
            </p>
          </div>
        )}
      </div>

      {/* MODALE DE DÉPÔT D'INTENTION */}
      {showNewPrayerModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowNewPrayerModal(false)} />

          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-100 text-left">
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🙏</span>
                <h3 className="text-lg font-extrabold text-white">Déposer une Intention de Prière</h3>
              </div>
              <button onClick={() => setShowNewPrayerModal(false)} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePrayer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catégorie d'Intention
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="DISCERNMENT">💍 Discernement Amoureux</option>
                  <option value="HEALTH">🌿 Santé & Guérison</option>
                  <option value="FAMILY">🏡 Famille & Foyer</option>
                  <option value="WORK">💼 Projet & Travail</option>
                  <option value="THANKSGIVING">✨ Action de Grâces</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Titre de votre sujet de prière
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Discernement pour un projet de mariage..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Détail & Explication de l'intention
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Partagez votre cœur avec la communauté afin que nous priions d'un même accord..."
                  rows={4}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Toggle Anonymat */}
              <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <Lock size={16} className="text-amber-700 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-900">Déposer anonymement</p>
                    <p className="text-[10px] text-amber-700">Masque votre prénom et photo sur le mur d'intercession.</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 border-amber-300"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-2xl shadow-lg transition text-xs flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'Publication en cours...' : 'Publier mon intention sur le Cercle 🕯️'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
