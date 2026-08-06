import React, { useState, useEffect } from 'react';
import { DashboardTab, AppView } from '../types';
import { Heart, MessageCircle, Users, BookOpen, User, Home, X, Calendar, Lock, Shield, WifiOff, Star, Sparkles, Zap, Flame, Trophy, HeartHandshake } from 'lucide-react';
import { Matches } from './Matches';
import { Forum } from './Forum';
import { Vocation } from './Vocation';
import { Messages } from './Messages';
import { Profile } from './Profile';
import { Events } from './Events';
import { LikesYou } from './LikesYou';
import { SpeedDate } from './SpeedDate';
import { IntercessionCircle } from './IntercessionCircle';
import { supabase } from '../supabaseClient';
import { updateDailyStreak } from '../utils/streakManager';
import { PointsExplanationModal } from './PointsExplanationModal';

const getImlrUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

// Custom warm Christian greetings based on time of day
const getChristianGreeting = (name: string) => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return `Doux matin sous la grâce divine, ${name} 🌅`;
  } else if (hour >= 12 && hour < 18) {
    return `Bel après-midi dans la paix du Christ, ${name} 🕊️`;
  } else {
    return `Douce soirée guidée par le Saint-Esprit, ${name} ✨`;
  }
};

// Tab titles and descriptions for page headers
const TAB_HEADERS: Record<DashboardTab, { title: string; subtitle: string }> = {
  [DashboardTab.FEED]: {
    title: 'Fil d\'actualité',
    subtitle: 'Découvrez les dernières publications de la communauté.'
  },
  [DashboardTab.MATCHES]: {
    title: 'Portail des Rencontres',
    subtitle: 'Découvrez des profils de célibataires chrétiens engagés partageant votre foi.'
  },
  [DashboardTab.SPEED_DATE]: {
    title: 'Speed Date Chrétien ⚡',
    subtitle: 'Rencontres éclair & salons vidéo pour faire connaissance en direct dans la foi.'
  },
  [DashboardTab.LIKES_YOU]: {
    title: 'Ils vous Aiment',
    subtitle: 'Découvrez les personnes qui apprécient votre profil et souhaitent faire connaissance.'
  },
  [DashboardTab.EVENTS]: {
    title: 'Activités & Événements',
    subtitle: 'Prenez part aux pèlerinages, retraites et soirées de la jeunesse chrétienne.'
  },
  [DashboardTab.FORUM]: {
    title: 'Le Parvis de Discussion',
    subtitle: 'Partagez vos réflexions spirituelles, interrogez la communauté et grandissez ensemble.'
  },
  [DashboardTab.VOCATION]: {
    title: 'Espace Vocationnel',
    subtitle: 'Discernez l\'appel du Seigneur pour le mariage chrétien, le pastorat ou la mission.'
  },
  [DashboardTab.MESSAGES]: {
    title: 'Messagerie Privée',
    subtitle: 'Échanges fraternels et sincères pour apprendre à vous connaître dans la foi.'
  },
  [DashboardTab.PRAYERS]: {
    title: 'Cercle d\'Intercession 🙏',
    subtitle: 'Déposez vos intensions de prière et allumez une bougie virtuelle pour vos frères et sœurs.'
  },
  [DashboardTab.PROFILE]: {
    title: 'Mon Espace & Engagement',
    subtitle: 'Gérez vos préférences, votre confession chrétienne et vos documents de vérification.'
  },
  // Placeholders to satisfy typescript type mappings if needed
  [DashboardTab.STATS]: { title: 'Statistiques', subtitle: '' },
  [DashboardTab.USERS]: { title: 'Membres', subtitle: '' },
  [DashboardTab.VERIFICATION]: { title: 'Vérifications', subtitle: '' },
  [DashboardTab.MODERATION]: { title: 'Modération', subtitle: '' },
  [DashboardTab.PARISHES]: { title: 'Paroisses', subtitle: '' },
  [DashboardTab.PRIESTS]: { title: 'Accompagnateurs', subtitle: '' },
  [DashboardTab.SUBSCRIPTIONS]: { title: 'Abonnements', subtitle: '' },
  [DashboardTab.PAYMENTS]: { title: 'Paiements', subtitle: '' }
};

interface UserDashboardProps {
  currentView?: AppView;
  onChangeView?: (view: AppView) => void;
  isMobileSidebarOpen?: boolean;
  onCloseMobileSidebar?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ currentView, onChangeView, isMobileSidebarOpen, onCloseMobileSidebar }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.MATCHES);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Synchronisation dynamique de l'onglet actif avec la vue globale
  useEffect(() => {
    if (currentView === AppView.SPEED_DATE) setActiveTab(DashboardTab.SPEED_DATE);
    else if (currentView === AppView.LIKES_YOU) setActiveTab(DashboardTab.LIKES_YOU);
    else if (currentView === AppView.MESSAGES) setActiveTab(DashboardTab.MESSAGES);
    else if (currentView === AppView.FORUM) setActiveTab(DashboardTab.FORUM);
    else if (currentView === AppView.PROFILE) setActiveTab(DashboardTab.PROFILE);
    else if (currentView === AppView.USER_DASHBOARD) setActiveTab(DashboardTab.MATCHES);
  }, [currentView]);

  // Global counts for badges
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [newLikesCount, setNewLikesCount] = useState(0);
  const [showPointsModal, setShowPointsModal] = useState(false);

  // Profile data
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 🔥 GESTION DE LA SÉRIE DE FOI (DAILY STREAK)
  const [streakCount, setStreakCount] = useState<number>(1);

  useEffect(() => {
    const initUser = async (session: any) => {
      if (session?.user) {
        try {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          setCurrentUser({ ...session.user, ...(profile || {}) });

          // Mettre à jour la série de foi quotidienne
          const streakInfo = await updateDailyStreak(session.user.id);
          setStreakCount(streakInfo.streakCount);
        } catch (e) {
          setCurrentUser(session.user);
        }
      } else {
        setCurrentUser(null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      initUser(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      initUser(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const resolveUserName = (user: any): string => {
    if (!user) return 'Mon Profil';

    if (user.full_name && user.full_name.trim() && user.full_name.trim() !== 'Membre Chrétien') return user.full_name.trim();
    if (user.name && user.name.trim() && user.name.trim() !== 'Membre Chrétien') return user.name.trim();
    if (user.first_name || user.last_name) {
      const combined = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      if (combined) return combined;
    }

    const metadata = user.user_metadata || user.raw_user_meta_data;
    if (metadata) {
      if (metadata.full_name && metadata.full_name.trim()) return metadata.full_name.trim();
      if (metadata.name && metadata.name.trim()) return metadata.name.trim();
      if (metadata.first_name || metadata.last_name) {
        const combined = `${metadata.first_name || ''} ${metadata.last_name || ''}`.trim();
        if (combined) return combined;
      }
    }

    if (user.phone) {
      return `Membre (${user.phone})`;
    }

    if (user.email && !user.email.startsWith('wa_')) {
      const handle = user.email.split('@')[0];
      const formatted = handle.split(/[\._\-]/).map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
      if (formatted) return formatted;
    } else if (user.email && user.email.startsWith('wa_')) {
      const cleanNum = user.email.split('@')[0].replace('wa_', '');
      if (cleanNum) return `Membre (+${cleanNum})`;
    }

    return 'Mon Profil';
  };

  const userName = resolveUserName(currentUser);
  const userAvatar = currentUser?.avatar_url
    ? getImlrUrl(currentUser.avatar_url)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=10b981&color=fff`;
  const isPremium = currentUser?.is_premium || false;
  const isVerified = currentUser?.verification_status === 'VERIFIED';

  // Online/Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch count real-time badges
  useEffect(() => {
    if (!currentUser) return;

    const fetchCounts = async () => {
      try {
        // Messages unread
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', currentUser.id)
          .eq('read', false);
        setTotalUnreadCount(msgCount || 0);

        // Likes received
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('to_user_id', currentUser.id)
          .eq('type', 'like');
        setNewLikesCount(likesCount || 0);

      } catch (e) { }
    };

    fetchCounts();

    const channel = supabase.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, () => {
        setTotalUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, (payload: any) => {
        if (payload.new.read) fetchCounts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    if (tab !== DashboardTab.MESSAGES) setSelectedContactId(null);
    if (onCloseMobileSidebar) onCloseMobileSidebar();

    if (onChangeView) {
      if (tab === DashboardTab.SPEED_DATE) onChangeView(AppView.SPEED_DATE);
      else if (tab === DashboardTab.LIKES_YOU) onChangeView(AppView.LIKES_YOU);
      else if (tab === DashboardTab.MESSAGES) onChangeView(AppView.MESSAGES);
      else if (tab === DashboardTab.FORUM) onChangeView(AppView.FORUM);
      else if (tab === DashboardTab.PROFILE) onChangeView(AppView.PROFILE);
      else if (tab === DashboardTab.MATCHES) onChangeView(AppView.USER_DASHBOARD);
    }
  };

  const handleLikeProcessed = () => {
    setNewLikesCount(prev => Math.max(0, prev - 1));
  };

  const renderContent = () => {
    switch (activeTab) {
      case DashboardTab.MATCHES:
        // --- SUBLIME LOCKED SCREEN FOR UNVERIFIED USERS ---
        if (!isVerified) {
          return (
            <div className="flex flex-col items-center justify-center text-center px-5 pt-8 pb-10 sm:pt-10 sm:pb-12 sm:px-8 my-4 sm:my-6 animate-in fade-in zoom-in duration-500 relative bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-xl max-w-2xl mx-auto">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-4 sm:p-5 rounded-full mb-4 sm:mb-6 relative shadow-lg shadow-amber-500/25 shrink-0 mt-2">
                <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full border-2 border-amber-500 shadow-md">
                  <Lock className="h-4 w-4 text-emerald-700" />
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">Porte du Discernement</h3>
              <p className="text-slate-500 max-w-md mb-6 sm:mb-8 text-xs sm:text-sm leading-relaxed px-2">
                Afin de préserver la pureté et le sérieux des démarches au sein de la communauté <strong>225 Chrétien</strong>, l'accès à l'espace Rencontres requiert une validation de compte.
              </p>

              {/* État d'Onboarding Checkpoints */}
              <div className="w-full max-w-md bg-slate-50/80 rounded-2xl p-3.5 sm:p-4 border border-slate-100 mb-6 space-y-2.5 text-left">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Statut d'intégration</p>

                {/* 1. Informations Profil */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/50 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-emerald-100 text-emerald-700 font-bold rounded-full flex items-center justify-center text-xs">✓</span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">Informations de profil de base</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase">Validé</span>
                </div>

                {/* 2. Certificat ou Recommandation */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/50 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 font-bold rounded-full flex items-center justify-center text-xs ${currentUser?.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : currentUser?.verification_status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                      {currentUser?.verification_status === 'VERIFIED' ? '✓' : '2'}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">Certificat de baptême ou lettre</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${currentUser?.verification_status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : currentUser?.verification_status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                    {currentUser?.verification_status === 'VERIFIED' ? 'Validé' : currentUser?.verification_status === 'PENDING' ? 'En cours' : 'À fournir'}
                  </span>
                </div>

                {/* 3. Liveness video proof */}
                <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/50 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <span className={`w-6 h-6 font-bold rounded-full flex items-center justify-center text-xs ${currentUser?.liveness_verified ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {currentUser?.liveness_verified ? '✓' : '3'}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">Preuve vidéo de liveness</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${currentUser?.liveness_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                    {currentUser?.liveness_verified ? 'Validé' : 'À fournir'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleTabChange(DashboardTab.PROFILE)}
                className="bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition transform flex items-center gap-2 text-xs sm:text-sm mb-2"
              >
                <User size={18} />
                Compléter ma demande de vérification
              </button>
            </div>
          );
        }
        return <Matches onGoToMessages={(contactId) => {
          if (contactId) setSelectedContactId(contactId);
          handleTabChange(DashboardTab.MESSAGES);
        }} />;
      case DashboardTab.SPEED_DATE:
        return <SpeedDate />;
      case DashboardTab.LIKES_YOU:
        return <LikesYou onLikeProcessed={handleLikeProcessed} onGoToMessages={(contactId) => {
          if (contactId) setSelectedContactId(contactId);
          handleTabChange(DashboardTab.MESSAGES);
        }} />;
      case DashboardTab.FORUM:
        return <Forum />;
      case DashboardTab.PRAYERS:
        return <IntercessionCircle />;
      case DashboardTab.EVENTS:
        return <Events />;
      case DashboardTab.VOCATION:
        return <Vocation />;
      case DashboardTab.MESSAGES:
        return <Messages initialContactId={selectedContactId} />;
      case DashboardTab.PROFILE:
        return <Profile />;
      default:
        return <Matches onGoToMessages={(contactId) => {
          if (contactId) setSelectedContactId(contactId);
          setActiveTab(DashboardTab.MESSAGES);
        }} />;
    }
  };

  const CHRISTIAN_VERSES = [
    { text: "L'amour est patient, il est plein de bonté. Il n'est point envieux ; l'amour ne se vante point, il ne s'enfle point d'orgueil.", ref: "1 Corinthiens 13:4-5" },
    { text: "Nous savons, du reste, que toutes choses concourent au bien de ceux qui aiment Dieu.", ref: "Romains 8:28" },
    { text: "Marchez dans l'amour, à l'exemple de Christ, qui nous a aimés et qui s'est livré lui-même à Dieu.", ref: "Éphésiens 5:2" },
    { text: "Revêtez-vous de l'amour, qui est le lien de la perfection. Et que la paix de Christ règne dans vos cœurs.", ref: "Colossiens 3:14-15" },
    { text: "Confie-toi en l'Éternel de tout ton cœur, et ne t'appuie pas sur ton intelligence.", ref: "Proverbes 3:5" },
    { text: "Que le Seigneur dirige vos cœurs vers l'amour de Dieu et la patience de Christ.", ref: "2 Thessaloniciens 3:5" }
  ];

  const currentVerse = CHRISTIAN_VERSES[new Date().getDate() % CHRISTIAN_VERSES.length];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-white via-slate-50/50 to-emerald-50/10">
      <div className="p-6">
        <div className="flex items-center mb-6 pb-4 border-b border-slate-100">
          <img src={userAvatar} alt="Profile" className="h-12 w-12 rounded-full object-cover mr-3 border-2 border-emerald-500 shadow-md shadow-emerald-500/10" />
          <div className="overflow-hidden flex-1">
            <p className="font-bold text-slate-800 truncate text-sm" title={userName}>{userName}</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isPremium ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                {isPremium ? 'Premium' : 'Standard'}
              </span>
              {isVerified && <Shield size={12} className="text-emerald-500" fill="currentColor" />}
            </div>
          </div>
        </div>

        {/* 🔥 BADGE SÉRIE DE FOI (DAILY FAITH STREAK) */}
        <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-amber-500/20 border border-amber-300/40 text-left flex items-center justify-between animate-in zoom-in duration-300">
          <div className="flex items-center space-x-2.5">
            <div className="bg-white/20 p-2 rounded-xl shrink-0">
              <Flame size={18} className="text-amber-100 fill-amber-200 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-100">Série de Foi</p>
              <p className="text-xs font-black text-white">{streakCount} {streakCount > 1 ? 'Jours consécutifs' : 'Premier jour'}</p>
            </div>
          </div>
          <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-full backdrop-blur-md">🔥</span>
        </div>

        {/* 💎 SOLDE DE POINTS & CRÉDITS */}
        <div
          onClick={() => setShowPointsModal(true)}
          className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md border border-emerald-500/30 text-left flex items-center justify-between cursor-pointer hover:opacity-95 transition"
        >
          <div className="flex items-center space-x-2.5">
            <div className="bg-white/20 p-2 rounded-xl shrink-0">
              <span className="text-base">💎</span>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100">Solde de Points</p>
              <p className="text-xs font-black text-white">{currentUser?.points ?? 150} Pts • {currentUser?.credits ?? 3} Crédits</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPointsModal(true);
            }}
            className="text-[10px] font-bold bg-white text-emerald-800 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition shadow-sm cursor-pointer whitespace-nowrap"
          >
            Guide & Conversion
          </button>
        </div>
        <nav className="space-y-1.5">
          <SidebarItem
            icon={<Heart size={18} />}
            label="Rencontres"
            active={activeTab === DashboardTab.MATCHES}
            onClick={() => handleTabChange(DashboardTab.MATCHES)}
            locked={!isVerified}
          />
          <SidebarItem
            icon={<Zap size={18} />}
            label="Speed Date"
            active={activeTab === DashboardTab.SPEED_DATE}
            onClick={() => handleTabChange(DashboardTab.SPEED_DATE)}
          />
          <SidebarItem
            icon={<Star size={18} />}
            label="Ils vous aiment"
            active={activeTab === DashboardTab.LIKES_YOU}
            onClick={() => handleTabChange(DashboardTab.LIKES_YOU)}
            badgeCount={newLikesCount}
          />
          <SidebarItem
            icon={<Calendar size={18} />}
            label="Événements"
            active={activeTab === DashboardTab.EVENTS}
            onClick={() => handleTabChange(DashboardTab.EVENTS)}
          />
          <SidebarItem
            icon={<Users size={18} />}
            label="Forum & Communauté"
            active={activeTab === DashboardTab.FORUM}
            onClick={() => handleTabChange(DashboardTab.FORUM)}
          />
          <SidebarItem
            icon={<HeartHandshake size={18} className="text-amber-500" />}
            label="Cercle d'Intercession 🙏"
            active={activeTab === DashboardTab.PRAYERS}
            onClick={() => handleTabChange(DashboardTab.PRAYERS)}
          />
          <SidebarItem
            icon={<BookOpen size={18} />}
            label="Vocation"
            active={activeTab === DashboardTab.VOCATION}
            onClick={() => handleTabChange(DashboardTab.VOCATION)}
          />
          <SidebarItem
            icon={<MessageCircle size={18} />}
            label="Messages"
            active={activeTab === DashboardTab.MESSAGES}
            onClick={() => handleTabChange(DashboardTab.MESSAGES)}
            badgeCount={totalUnreadCount}
          />
          <SidebarItem
            icon={<User size={18} />}
            label="Mon Profil"
            active={activeTab === DashboardTab.PROFILE}
            onClick={() => handleTabChange(DashboardTab.PROFILE)}
          />
        </nav>
      </div>

      {/* Méditation Divine Card - Ultra Sublime Gold & Emerald */}
      <div className="mt-auto p-4 pt-3 pb-28 md:pb-6 border-t border-slate-100/80 shrink-0">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white p-4 shadow-xl border border-amber-400/50 group hover:border-amber-400 transition-all duration-300">
          
          {/* Subtle background glow & light beam */}
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-400/20 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />

          {/* Header Badge */}
          <div className="flex items-center justify-between mb-2 relative z-10">
            <div className="flex items-center space-x-1.5 bg-amber-400/20 px-2.5 py-1 rounded-full border border-amber-400/40 shadow-xs">
              <Sparkles size={12} className="text-amber-300 animate-pulse shrink-0" />
              <span className="text-[10px] text-amber-200 font-extrabold uppercase tracking-widest">Méditation Divine</span>
            </div>
            <BookOpen size={14} className="text-emerald-300/70" />
          </div>

          {/* Verse Content */}
          <div className="relative z-10 my-2">
            <p className="text-[11px] sm:text-xs text-emerald-50/95 italic leading-relaxed font-serif font-medium drop-shadow-xs">
              « {currentVerse.text} »
            </p>
          </div>

          {/* Scripture Reference Tag */}
          <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-emerald-800/60 relative z-10">
            <span className="text-[9px] text-emerald-300/80 font-semibold tracking-wider uppercase">Parole de Foi</span>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-400/40 shadow-xs">
              📖 {currentVerse.ref}
            </span>
          </div>

        </div>
      </div>
    </div>
  );

  const isMatchesTab = activeTab === DashboardTab.MATCHES;
  const currentTabHeader = TAB_HEADERS[activeTab] || { title: 'Tableau de Bord', subtitle: '' };

  return (
    <div className="flex-1 min-h-0 bg-slate-50 md:pl-64 relative flex flex-col overflow-hidden">

      {/* OFFLINE BANNER */}
      {isOffline && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs text-center py-2 px-4 z-30 flex-shrink-0 flex items-center justify-center gap-1.5 shadow-md">
          <WifiOff size={14} className="animate-pulse" />
          <span className="font-semibold">Mode hors-ligne activé. Certaines données peuvent ne pas être à jour.</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-slate-200/60 flex-col z-20 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay & Drawer */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCloseMobileSidebar} />
      </div>

      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-end p-4 border-b border-slate-100">
          <button onClick={onCloseMobileSidebar} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>
        <div className="h-[calc(100%-60px)] overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 w-full overflow-x-hidden flex flex-col ${isMatchesTab && isVerified ? 'h-full overflow-y-hidden relative' : 'overflow-y-auto'}`}>

        {/* Dynamic Premium Header inside Main Area */}
        {!isMatchesTab && (
          <div className="px-4 pt-6 md:px-8 max-w-4xl w-full mx-auto animate-in fade-in duration-300 flex-shrink-0">
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-950 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden mb-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative">
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">
                  {getChristianGreeting(userName.split(' ')[0])}
                </p>
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">{currentTabHeader.title}</h2>
                <p className="text-xs text-emerald-100/90 mt-1 max-w-xl font-medium">{currentTabHeader.subtitle}</p>
              </div>
            </div>
          </div>
        )}

        <div className={`max-w-4xl mx-auto p-3 pt-2 md:p-8 w-full flex-1 min-h-0 ${isMatchesTab ? 'h-full flex flex-col pb-32 md:pb-[90px]' : 'pb-32 md:pb-8'}`}>
          {renderContent()}
        </div>
      </main>

      {/* MODALE EXPLICATION & CONVERSION DES POINTS 💎 */}
      <PointsExplanationModal
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
        user={currentUser}
        onPointsUpdated={(newPts, newCreds) => setCurrentUser((prev: any) => prev ? { ...prev, points: newPts, credits: newCreds } : null)}
      />
    </div>
  );
};

// Desktop SidebarItem
const SidebarItem = ({ icon, label, active, onClick, locked, badgeCount }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 transform active:scale-98 ${active
        ? 'bg-emerald-50/80 text-emerald-700 font-bold shadow-sm border border-emerald-100/50 sidebar-item-active-glow'
        : 'text-slate-600 hover:bg-slate-100/70 hover:translate-x-1'
      }`}
  >
    <div className="flex items-center space-x-3 text-sm">
      <div className="relative">
        <span className={`transition-transform duration-200 ${active ? 'scale-110 text-emerald-600' : 'text-slate-400 group-hover:scale-110'}`}>{icon}</span>
        {badgeCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center border border-white shadow-sm animate-pulse">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
      <span>{label}</span>
    </div>
    {locked && <Lock size={12} className="text-slate-400" />}
  </button>
);

// Mobile MobileNavItem
const MobileNavItem = ({ icon, label, active, onClick, locked, badgeCount }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center relative p-2 px-3 rounded-full transition-all duration-300 transform active:scale-90 ${active ? 'text-emerald-700 bg-emerald-50 scale-105 font-bold' : 'text-slate-500 hover:text-slate-700'
      }`}
  >
    <div className="relative">
      <span className={active ? 'text-emerald-600 animate-heart-pop' : 'text-slate-500'}>{icon}</span>
      {badgeCount > 0 && (
        <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[8px] font-extrabold px-1 py-0.2 rounded-full min-w-[14px] text-center border border-white shadow-sm">
          {badgeCount}
        </span>
      )}
    </div>
    <span className="text-[9px] mt-0.5 tracking-tight">{label}</span>
    {locked && (
      <div className="absolute top-1 right-2.5 bg-slate-100 rounded-full p-0.5 border border-white shadow-sm">
        <Lock size={8} className="text-slate-500" />
      </div>
    )}
  </button>
);
