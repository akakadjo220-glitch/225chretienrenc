import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, Flame, Plus, Sparkles, Search, Send, 
  MessageSquare, Lock, Loader, RefreshCw, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export interface PrayerIntention {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatar?: string;
  authorParish?: string;
  isAnonymous: boolean;
  category: 'DISCERNMENT' | 'HEALTH' | 'FAMILY' | 'WORK' | 'THANKSGIVING';
  title: string;
  content: string;
  candleCount: number;
  commentsCount: number;
  hasInterceded: boolean;
  createdAt: string;
  createdDate: string;
}

export interface PrayerComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string; badgeBg: string }> = {
  ALL: { label: 'Toutes', icon: '🙏', color: 'bg-slate-100 text-slate-800 border-slate-200', badgeBg: 'bg-slate-100 text-slate-700' },
  DISCERNMENT: { label: 'Discernement', icon: '💍', color: 'bg-amber-100 text-amber-900 border-amber-300', badgeBg: 'bg-amber-50 text-amber-800 border-amber-200' },
  HEALTH: { label: 'Santé & Guérison', icon: '🌿', color: 'bg-emerald-100 text-emerald-900 border-emerald-300', badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  FAMILY: { label: 'Famille & Foyer', icon: '🏡', color: 'bg-blue-100 text-blue-900 border-blue-300', badgeBg: 'bg-blue-50 text-blue-800 border-blue-200' },
  WORK: { label: 'Projet & Travail', icon: '💼', color: 'bg-purple-100 text-purple-900 border-purple-300', badgeBg: 'bg-purple-50 text-purple-800 border-purple-200' },
  THANKSGIVING: { label: 'Action de Grâces', icon: '✨', color: 'bg-rose-100 text-rose-900 border-rose-300', badgeBg: 'bg-rose-50 text-rose-800 border-rose-200' }
};

const getImlrUrl = (path?: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

const formatTimeAgo = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 2) return "À l'instant";
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return 'Récemment';
  }
};

export const IntercessionCircle: React.FC = () => {
  const [prayers, setPrayers] = useState<PrayerIntention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPrayerModal, setShowNewPrayerModal] = useState(false);

  // Formulaire d'intention
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<'DISCERNMENT' | 'HEALTH' | 'FAMILY' | 'WORK' | 'THANKSGIVING'>('DISCERNMENT');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Commentaires / Mots de soutien de prière
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, PrayerComment[]>>({});
  const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState<string | null>(null);

  // 1. Charger l'utilisateur courant
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(({ data }) => {
          setCurrentUser({ ...session.user, ...data });
        });
      }
    });
  }, []);

  // 2. Charger les intentions réelles depuis Supabase
  const loadPrayers = async () => {
    setIsLoading(true);
    try {
      const { data: records, error } = await supabase
        .from('forum_posts')
        .select('*, author:profiles!author_id(id, full_name, name, avatar_url, parish)')
        .or('category.eq.Intercession,category.eq.Prière')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Récupérer les bougies / likes de l'utilisateur connecté
      let userIntercededPostIds: string[] = [];
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const { data: likes } = await supabase
            .from('forum_likes')
            .select('post_id')
            .eq('user_id', session.user.id);
          if (likes) {
            userIntercededPostIds = likes.map((l: any) => l.post_id);
          }
        } catch (e) {
          console.log('Impossible de charger les bougies:', e);
        }
      }

      const mapped: PrayerIntention[] = (records || []).map((r: any) => {
        const rawTags = (r.tags || '').split(',');
        let cat: 'DISCERNMENT' | 'HEALTH' | 'FAMILY' | 'WORK' | 'THANKSGIVING' = 'DISCERNMENT';
        if (rawTags.includes('HEALTH')) cat = 'HEALTH';
        else if (rawTags.includes('FAMILY')) cat = 'FAMILY';
        else if (rawTags.includes('WORK')) cat = 'WORK';
        else if (rawTags.includes('THANKSGIVING')) cat = 'THANKSGIVING';
        else if (rawTags.includes('DISCERNMENT')) cat = 'DISCERNMENT';

        const isAnon = rawTags.includes('ANONYMOUS');

        return {
          id: r.id,
          authorId: r.author_id,
          authorName: isAnon ? 'Frère / Sœur Anonyme' : (r.author?.full_name || r.author?.name || 'Membre Chrétien'),
          authorAvatar: isAnon ? undefined : (r.author?.avatar_url ? getImlrUrl(r.author.avatar_url) : undefined),
          authorParish: isAnon ? undefined : r.author?.parish,
          isAnonymous: isAnon,
          category: cat,
          title: r.title || 'Intention de prière',
          content: r.content || '',
          candleCount: Math.max(1, Number(r.likes_count) || 0),
          commentsCount: Number(r.comments_count) || 0,
          hasInterceded: userIntercededPostIds.includes(r.id),
          createdAt: formatTimeAgo(r.created_at),
          createdDate: r.created_at
        };
      });

      setPrayers(mapped);
    } catch (err) {
      console.error('Erreur chargement cercle intercession:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Écoute temps réel Supabase
  useEffect(() => {
    loadPrayers();

    const channel = supabase.channel('intercession_realtime_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, (payload: any) => {
        if (payload.new && (payload.new.category === 'Intercession' || payload.new.category === 'Prière')) {
          loadPrayers();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'forum_posts' }, (payload: any) => {
        const updated = payload.new;
        if (updated) {
          setPrayers(prev => prev.map(p => p.id === updated.id ? { 
            ...p, 
            candleCount: Number(updated.likes_count) || p.candleCount,
            commentsCount: Number(updated.comments_count) || p.commentsCount 
          } : p));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 4. Allumer / Éteindre une bougie d'intercession
  const handleIntercede = async (id: string) => {
    if (!currentUser) {
      alert("Veuillez vous connecter pour vous joindre à la prière fraternelle.");
      return;
    }

    const targetPrayer = prayers.find(p => p.id === id);
    if (!targetPrayer) return;

    const willIntercede = !targetPrayer.hasInterceded;
    const updatedCount = willIntercede ? targetPrayer.candleCount + 1 : Math.max(1, targetPrayer.candleCount - 1);

    // Mise à jour optimiste
    setPrayers(prev => prev.map(p => p.id === id ? {
      ...p,
      candleCount: updatedCount,
      hasInterceded: willIntercede
    } : p));

    if (willIntercede) {
      setToastMessage("🕯️ Votre prière a été élevée vers le Seigneur !");
      setTimeout(() => setToastMessage(null), 3000);
    }

    try {
      if (willIntercede) {
        await supabase.from('forum_likes').insert({ post_id: id, user_id: currentUser.id });
      } else {
        await supabase.from('forum_likes').delete().match({ post_id: id, user_id: currentUser.id });
      }

      await supabase.from('forum_posts').update({ likes_count: updatedCount }).eq('id', id);
    } catch (e) {
      console.error("Erreur lors de l'enregistrement de l'intercession:", e);
    }
  };

  // 5. Déposer une nouvelle intention
  const handleCreatePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (!currentUser) {
      alert("Veuillez vous connecter pour déposer votre intention de prière.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tagList = [category];
      if (isAnonymous) tagList.push('ANONYMOUS');

      const { data, error } = await supabase.from('forum_posts').insert({
        author_id: currentUser.id,
        title: title.trim(),
        content: content.trim(),
        category: 'Intercession',
        tags: tagList.join(','),
        likes_count: 1,
        comments_count: 0
      }).select().single();

      if (error) throw error;

      // Bougie initiale de l'auteur
      if (data?.id) {
        await supabase.from('forum_likes').insert({ post_id: data.id, user_id: currentUser.id });
      }

      setTitle('');
      setContent('');
      setIsAnonymous(false);
      setShowNewPrayerModal(false);
      setToastMessage("✨ Votre intention a été déposée avec succès !");
      setTimeout(() => setToastMessage(null), 3500);
      
      loadPrayers();
    } catch (err: any) {
      alert("Erreur lors de la publication : " + (err.message || "Problème réseau"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Charger les commentaires / encouragements d'une intention
  const toggleComments = async (postId: string) => {
    const isNowExpanded = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: isNowExpanded }));

    if (isNowExpanded && !commentsMap[postId]) {
      setLoadingCommentsPostId(postId);
      try {
        const { data, error } = await supabase
          .from('forum_comments')
          .select('*, author:profiles!author_id(id, full_name, name, avatar_url)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;

        const mappedComments: PrayerComment[] = (data || []).map((c: any) => ({
          id: c.id,
          postId: c.post_id,
          authorId: c.author_id,
          authorName: c.author?.full_name || c.author?.name || 'Membre Chrétien',
          authorAvatar: c.author?.avatar_url ? getImlrUrl(c.author.avatar_url) : undefined,
          content: c.content,
          createdAt: formatTimeAgo(c.created_at)
        }));

        setCommentsMap(prev => ({ ...prev, [postId]: mappedComments }));
      } catch (err) {
        console.error('Erreur chargement commentaires:', err);
      } finally {
        setLoadingCommentsPostId(null);
      }
    }
  };

  // 7. Envoyer un mot de soutien / prière
  const handleSendComment = async (postId: string) => {
    const inputVal = commentInputMap[postId]?.trim();
    if (!inputVal) return;

    if (!currentUser) {
      alert("Veuillez vous connecter pour laisser un mot de soutien.");
      return;
    }

    setSubmittingCommentPostId(postId);
    try {
      const { data, error } = await supabase
        .from('forum_comments')
        .insert({
          post_id: postId,
          author_id: currentUser.id,
          content: inputVal
        })
        .select('*, author:profiles!author_id(id, full_name, name, avatar_url)')
        .single();

      if (error) throw error;

      const newC: PrayerComment = {
        id: data.id,
        postId: data.post_id,
        authorId: data.author_id,
        authorName: data.author?.full_name || data.author?.name || 'Moi',
        authorAvatar: data.author?.avatar_url ? getImlrUrl(data.author.avatar_url) : undefined,
        content: data.content,
        createdAt: "À l'instant"
      };

      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newC]
      }));

      setCommentInputMap(prev => ({ ...prev, [postId]: '' }));

      const targetP = prayers.find(p => p.id === postId);
      if (targetP) {
        const newCount = (targetP.commentsCount || 0) + 1;
        await supabase.from('forum_posts').update({ comments_count: newCount }).eq('id', postId);
        setPrayers(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: newCount } : p));
      }
    } catch (e: any) {
      alert("Erreur envoi message : " + (e.message || "Problème réseau"));
    } finally {
      setSubmittingCommentPostId(null);
    }
  };

  const filteredPrayers = prayers.filter(p => {
    const matchesCategory = activeCategory === 'ALL' || p.category === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalCandles = prayers.reduce((acc, p) => acc + p.candleCount, 0);

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 pb-28 sm:pb-36 space-y-4 animate-in fade-in duration-300">
      
      {/* TOAST DE CONFIRMATION */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/40 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <Sparkles className="text-amber-300 shrink-0" size={18} />
          <span className="text-xs sm:text-sm font-extrabold">{toastMessage}</span>
        </div>
      )}

      {/* BANNIÈRE COMPACTE DU CERCLE D'INTERCESSION */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white rounded-3xl p-4 sm:p-6 shadow-md relative overflow-hidden text-left border border-amber-400/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-amber-100 font-extrabold text-[11px] uppercase tracking-wider">
              <Sparkles size={13} className="text-amber-200" />
              <span>Cercle d'Intercession</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white font-display">
              Soutien par la Prière Fraternelle 🙏
            </h2>
            <p className="text-amber-100 text-xs max-w-lg leading-relaxed">
              Déposez vos intentions et portez vos frères et sœurs dans la prière d'un même accord.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            {/* Stat Global */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/20 text-center flex-1 sm:flex-none">
              <div className="flex items-center justify-center gap-1 text-amber-200">
                <Flame size={16} className="fill-amber-300 text-amber-300" />
                <span className="text-base font-black text-white">{totalCandles}</span>
              </div>
              <p className="text-[9px] uppercase font-bold text-amber-100 tracking-wider">Prières</p>
            </div>

            <button
              onClick={() => setShowNewPrayerModal(true)}
              className="bg-white hover:bg-amber-50 text-amber-900 font-black px-4 py-2.5 rounded-2xl shadow-sm transition transform active:scale-95 flex items-center justify-center gap-1.5 text-xs cursor-pointer whitespace-nowrap flex-1 sm:flex-none"
            >
              <Plus size={16} className="text-amber-600 font-bold" />
              <span>Déposer une Intention</span>
            </button>
          </div>
        </div>
      </div>

      {/* RECHERCHE ET FILTRES PAR CATÉGORIES */}
      <div className="space-y-2.5">
        {/* Barre de Recherche & Bouton Actualiser */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Rechercher une intention, un prénom..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-8 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={loadPrayers}
            title="Actualiser"
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-amber-700 rounded-2xl transition cursor-pointer shadow-2xs shrink-0"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin text-amber-600' : ''} />
          </button>
        </div>

        {/* Filtres d'onglets horizontaux */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {Object.entries(CATEGORY_LABELS).map(([key, cat]) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1 border cursor-pointer ${
                  isActive
                    ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LISTE DES INTENTIONS */}
      {isLoading && prayers.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs">
          <Loader size={30} className="animate-spin mx-auto text-amber-600 mb-2.5" />
          <p className="text-xs font-bold text-slate-700">Chargement des intentions...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 text-left">
          {filteredPrayers.length > 0 ? (
            filteredPrayers.map(p => {
              const catInfo = CATEGORY_LABELS[p.category] || CATEGORY_LABELS.DISCERNMENT;
              const isCommentsOpen = !!expandedComments[p.id];
              const commentsList = commentsMap[p.id] || [];

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between space-y-3 relative"
                >
                  {/* EN-TÊTE DE LA CARTE : SOIGNÉ ET PARFAITEMENT DISPOSÉ */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {p.isAnonymous || !p.authorAvatar ? (
                        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-extrabold text-sm flex items-center justify-center border border-amber-200 shrink-0">
                          🙏
                        </div>
                      ) : (
                        <img 
                          src={p.authorAvatar} 
                          alt={p.authorName} 
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" 
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                            {p.authorName}
                          </p>
                          {p.isAnonymous && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold shrink-0">
                              Anonyme
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate whitespace-nowrap">
                          {p.createdAt} {p.authorParish ? `• ${p.authorParish}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shrink-0 whitespace-nowrap ${catInfo.badgeBg}`}>
                      {catInfo.icon} {catInfo.label}
                    </span>
                  </div>

                  {/* TITRE ET CONTENU */}
                  <div className="space-y-1.5">
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug font-display">
                      {p.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/90 p-3 rounded-xl border border-slate-100 italic">
                      "{p.content}"
                    </p>
                  </div>

                  {/* PIED DE CARTE : DISPOSITION FLUIDE */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        {/* Badge Prières */}
                        <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 px-2.5 py-1 rounded-xl border border-amber-200/70 font-extrabold">
                          <Flame size={14} className={`text-amber-500 ${p.hasInterceded ? 'fill-amber-400 animate-pulse' : ''}`} />
                          <span>{p.candleCount}</span>
                          <span className="hidden sm:inline font-bold text-amber-800/80">prières</span>
                        </div>

                        {/* Bouton Mots de soutien */}
                        <button
                          onClick={() => toggleComments(p.id)}
                          className="text-slate-500 hover:text-slate-800 font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition flex items-center gap-1 text-[11px] sm:text-xs cursor-pointer whitespace-nowrap"
                        >
                          <MessageSquare size={13} />
                          <span>{p.commentsCount || 0}</span>
                          <span className="hidden sm:inline">soutien(s)</span>
                          {isCommentsOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>

                      {/* Bouton Action J'intercède */}
                      <button
                        onClick={() => handleIntercede(p.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer transform active:scale-95 shadow-2xs whitespace-nowrap ${
                          p.hasInterceded
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        <span>🕯️</span>
                        <span>{p.hasInterceded ? 'Intercédé !' : "J'intercède"}</span>
                      </button>
                    </div>

                    {/* SECTION COMMENTAIRES / MOTS DE SOUTIEN */}
                    {isCommentsOpen && (
                      <div className="pt-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                        {loadingCommentsPostId === p.id ? (
                          <div className="py-2 text-center text-xs text-slate-400">
                            <Loader size={13} className="animate-spin inline mr-1" /> Chargement...
                          </div>
                        ) : (
                          <>
                            {commentsList.length > 0 ? (
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {commentsList.map(c => (
                                  <div key={c.id} className="bg-slate-50 p-2 rounded-xl text-xs space-y-0.5">
                                    <div className="flex items-center justify-between text-slate-500 text-[10px]">
                                      <span className="font-extrabold text-slate-800">{c.authorName}</span>
                                      <span>{c.createdAt}</span>
                                    </div>
                                    <p className="text-slate-700 leading-snug">{c.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic py-0.5">
                                Aucun mot de soutien pour le moment.
                              </p>
                            )}

                            {/* Formulaire de mot de soutien */}
                            <div className="flex gap-1.5 pt-1">
                              <input
                                type="text"
                                value={commentInputMap[p.id] || ''}
                                onChange={e => setCommentInputMap(prev => ({ ...prev, [p.id]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleSendComment(p.id)}
                                placeholder="Écrire un mot de prière..."
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              <button
                                onClick={() => handleSendComment(p.id)}
                                disabled={submittingCommentPostId === p.id || !commentInputMap[p.id]?.trim()}
                                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                {submittingCommentPostId === p.id ? <Loader size={12} className="animate-spin" /> : <Send size={12} />}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 text-slate-400 space-y-3 shadow-2xs">
              <HeartHandshake size={42} className="mx-auto text-amber-400 mb-1" />
              <h4 className="text-base font-bold text-slate-800">Aucune intention de prière trouvée</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Soyez le premier à déposer une intention ou modifiez vos filtres de recherche.
              </p>
              <button
                onClick={() => setShowNewPrayerModal(true)}
                className="mt-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-5 py-2.5 rounded-2xl text-xs shadow-sm transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus size={15} />
                <span>Déposer une intention maintenant</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Espaceur de fin de liste pour garantir un défilement complet et aéré au-dessus de la barre mobile */}
      <div className="h-20 sm:h-24 w-full shrink-0 pointer-events-none" aria-hidden="true" />

      {/* MODALE DE DÉPÔT D'INTENTION RÉELLE */}
      {showNewPrayerModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowNewPrayerModal(false)} />

          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-100 text-left my-auto max-h-[90dvh] flex flex-col">
            <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🙏</span>
                <h3 className="text-base sm:text-lg font-black text-white font-display">Déposer une Intention de Prière</h3>
              </div>
              <button onClick={() => setShowNewPrayerModal(false)} className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePrayer} className="p-4 sm:p-6 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catégorie d'Intention
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 font-semibold cursor-pointer"
                >
                  <option value="DISCERNMENT">💍 Discernement Amoureux & Mariage</option>
                  <option value="HEALTH">🌿 Santé & Guérison</option>
                  <option value="FAMILY">🏡 Famille & Foyer</option>
                  <option value="WORK">💼 Projet & Travail</option>
                  <option value="THANKSGIVING">✨ Action de Grâces</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Titre de votre sujet de prière
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Discernement pour un projet de mariage..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Détail & Explication de l'intention
                </label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Partagez votre intention afin que nous priions d'un même accord..."
                  rows={4}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 leading-relaxed font-medium"
                />
              </div>

              {/* Toggle Anonymat */}
              <div className="flex items-center justify-between p-3 bg-amber-50/80 border border-amber-200 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                    <Lock size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-amber-900">Déposer anonymement</p>
                    <p className="text-[10px] text-amber-700">Masque votre prénom et photo sur le mur d'intercession.</p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={e => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-amber-300 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold rounded-2xl shadow-md transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
              >
                {isSubmitting ? (
                  <>
                    <Loader size={15} className="animate-spin" />
                    <span>Publication en cours...</span>
                  </>
                ) : (
                  <>
                    <span>🕯️</span>
                    <span>Publier mon intention sur le Cercle</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
