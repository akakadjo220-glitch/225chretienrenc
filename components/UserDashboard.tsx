import React, { useState, useEffect, useRef } from 'react';
import { DashboardTab, AppView } from '../types';
import { Heart, MessageCircle, Users, BookOpen, User, Home, X, Calendar, Lock, Shield, WifiOff, Star, Zap, HeartHandshake, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { Matches } from './Matches';
import { Forum } from './Forum';
import { Vocation } from './Vocation';
import { Messages } from './Messages';
import { Profile } from './Profile';
import { Events } from './Events';
import { LikesYou } from './LikesYou';
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
    return `Douce soirée guidée par le Saint-Esprit, ${name} 🕊️`;
  }
};

// Tab titles and descriptions for page headers
const TAB_HEADERS: Partial<Record<DashboardTab, { title: string; subtitle: string }>> = {
  [DashboardTab.FEED]: {
    title: 'Fil d\'actualité',
    subtitle: 'Découvrez les dernières publications de la communauté.'
  },
  [DashboardTab.MATCHES]: {
    title: 'Portail des Rencontres',
    subtitle: 'Trouvez votre âme sœur chrétienne dans la prière et la foi.'
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
  const mainContentRef = useRef<HTMLElement>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [newLikesCount, setNewLikesCount] = useState(0);
  const [upcomingEventsCount, setUpcomingEventsCount] = useState(0);
  const [isEventsBubbleDismissed, setIsEventsBubbleDismissed] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);

  // Profile data
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 🔥 GESTION DE LA SÉRIE DE FOI (DAILY STREAK)
  const [streakCount, setStreakCount] = useState<number>(1);

  // 📖 RITUEL QUOTIDIEN DE GRÂCE (HOOK MODEL & MÉDITATION)
  const [hasMeditatedToday, setHasMeditatedToday] = useState<boolean>(false);
  const [meditationToast, setMeditationToast] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.id) {
      const todayStr = new Date().toISOString().split('T')[0];
      const isDone = localStorage.getItem(`225_meditated_${todayStr}_${currentUser.id}`) === 'true';
      setHasMeditatedToday(isDone);
    }
  }, [currentUser?.id]);

  const handleMeditationAction = async () => {
    if (hasMeditatedToday || !currentUser?.id) return;
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(`225_meditated_${todayStr}_${currentUser.id}`, 'true');
    setHasMeditatedToday(true);

    const currentPts = currentUser.points ?? 150;
    const newPts = currentPts + 10;
    setCurrentUser((prev: any) => prev ? { ...prev, points: newPts } : null);

    try {
      await supabase.from('profiles').update({ points: newPts }).eq('id', currentUser.id);
    } catch (e) {}

    setMeditationToast('🕊️ Parole méditée avec succès ! Que cette Parole divine illumine vos rencontres et vos pas.');
    setTimeout(() => setMeditationToast(null), 4500);
  };

  // 🎯 CALCUL DE L'EFFET DE PROGRESSION DOTÉE (ENDOWED PROGRESS & ZEIGARNIK)
  const calculateProfileScore = () => {
    let score = 35; // Acquis à l'inscription (Identité & Confession de base)
    const totalPhotos = (currentUser?.avatar_url || currentUser?.avatarUrl ? 1 : 0) + (currentUser?.photos_urls?.length || currentUser?.photos?.length || 0);
    if (totalPhotos >= 3) score += 35;
    else if (totalPhotos === 2) score += 25;
    else if (totalPhotos === 1) score += 15;

    if (currentUser?.liveness_verified || currentUser?.verification_status === 'VERIFIED') score += 30;
    return Math.min(100, score);
  };
  const profileCompletionScore = calculateProfileScore();

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
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=059669&color=fff`;
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
          .select('id', { count: 'exact' })
          .eq('receiver_id', currentUser.id)
          .eq('read', false);
        setTotalUnreadCount(msgCount || 0);

        // Likes received (type = like or superlike)
        const { count: likesCount } = await supabase
          .from('likes')
          .select('id', { count: 'exact' })
          .eq('to_user_id', currentUser.id)
          .in('type', ['like', 'superlike']);
        setNewLikesCount(likesCount || 0);

        // Événements à venir
        const todayDateStr = new Date().toISOString().split('T')[0];
        const { count: eventsCount } = await supabase
          .from('events')
          .select('id', { count: 'exact' })
          .gte('date', todayDateStr);
        setUpcomingEventsCount(eventsCount || 0);

      } catch (e) {
        console.log("Erreur chargement badges notification", e);
      }
    };

    fetchCounts();

    const channel = supabase.channel('public:dashboard_badges')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, () => {
        setTotalUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUser.id}` }, () => {
        fetchCounts();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes', filter: `to_user_id=eq.${currentUser.id}` }, () => {
        setNewLikesCount(prev => prev + 1);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, () => {
        fetchCounts();
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

    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }

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
        // --- CLEAN PRO GREEN & WHITE LOCKED SCREEN FOR UNVERIFIED USERS ---
        if (!isVerified) {
          return (
            <div className="flex flex-col items-center text-center p-5 sm:p-8 mt-4 sm:mt-6 mb-6 bg-[#FAF6EF]/90 backdrop-blur-md rounded-3xl border border-[#D4A359]/40 shadow-xl max-w-lg mx-auto w-full animate-in fade-in duration-300">
              
              {/* Badge Sécurité Sobre */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0D5C3A]/10 border border-[#0D5C3A]/30 text-[#0D5C3A] text-xs font-semibold mb-3">
                <ShieldCheck size={15} className="text-[#0D5C3A]" />
                <span>Espace de Confiance & Vérification</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-extrabold text-[#0D5C3A] font-display tracking-tight mb-1.5">
                Accéder aux Rencontres Chrétiennes
              </h3>

              {/* Jauge de progression sobre */}
              <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 my-3 text-left">
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <UserCheck size={14} className="text-emerald-700" />
                    <span>Progression du profil</span>
                  </span>
                  <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-bold text-[11px]">
                    {profileCompletionScore}%
                  </span>
                </div>

                {/* Barre de progression épurée */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletionScore}%` }}
                  />
                </div>

                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                  {profileCompletionScore >= 70 
                    ? "Plus qu'une étape pour finaliser votre accès aux célibataires chrétiens." 
                    : "Complétez ces étapes pour garantir un espace de rencontre 100% authentique."}
                </p>
              </div>

              {/* Étapes requises */}
              <div className="w-full bg-white rounded-2xl p-3 border border-slate-200/80 mb-4 text-left space-y-2">
                <div className="flex items-center justify-between px-1 mb-1">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Éléments requis</p>
                  <span className="text-xs text-slate-400">3 étapes</span>
                </div>

                {/* 1. Informations Profil */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-800 font-bold rounded-full flex items-center justify-center text-xs shrink-0">✓</span>
                    <span className="text-xs font-medium text-slate-800 truncate">1. Profil de base</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold shrink-0">Validé</span>
                </div>

                {/* 2. Galerie photos */}
                {(() => {
                  const totalPhotos = (currentUser?.avatar_url || currentUser?.avatarUrl ? 1 : 0) + (currentUser?.photos_urls?.length || currentUser?.photos?.length || 0);
                  const isPhotosValid = totalPhotos >= 3 || isVerified;
                  return (
                    <button
                      type="button"
                      onClick={() => handleTabChange(DashboardTab.PROFILE)}
                      className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-100 transition cursor-pointer text-left"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-xs shrink-0 ${isPhotosValid ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                          {isPhotosValid ? '✓' : '2'}
                        </span>
                        <span className="text-xs font-medium text-slate-800 truncate">2. Galerie photos (3 photos)</span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${isPhotosValid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                        {isPhotosValid ? 'Validé' : `${totalPhotos}/3`}
                      </span>
                    </button>
                  );
                })()}

                {/* 3. Liveness video proof */}
                <button
                  type="button"
                  onClick={() => handleTabChange(DashboardTab.PROFILE)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50/50 rounded-xl border border-slate-100 transition cursor-pointer text-left"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <span className={`w-5 h-5 font-bold rounded-full flex items-center justify-center text-xs shrink-0 ${currentUser?.liveness_verified || isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {currentUser?.liveness_verified || isVerified ? '✓' : '3'}
                    </span>
                    <span className="text-xs font-medium text-slate-800 truncate">3. Vérification vidéo (5s)</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold shrink-0 ${currentUser?.liveness_verified || isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                    {currentUser?.liveness_verified || isVerified ? 'Validé' : 'À fournir'}
                  </span>
                </button>
              </div>

              {/* Bouton sobre et direct */}
              <button
                type="button"
                onClick={() => handleTabChange(DashboardTab.PROFILE)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
              >
                <span>Compléter mon profil</span>
                <ArrowRight size={16} />
              </button>

              {/* Rassurance discrète */}
              <p className="text-xs text-slate-400 mt-3 text-center">
                Espace sécurisé et réservé aux membres vérifiés.
              </p>
            </div>
          );
        }
        return <Matches
          onGoToMessages={(contactId) => {
            if (contactId) setSelectedContactId(contactId);
            handleTabChange(DashboardTab.MESSAGES);
          }}
          onGoToProfile={() => handleTabChange(DashboardTab.PROFILE)}
        />;
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
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80">
      <div className="p-5 flex-1 overflow-y-auto">
        {/* User Card */}
        <div className="flex items-center mb-5 pb-4 border-b border-slate-100">
          <img src={userAvatar} alt="Profile" className="h-11 w-11 rounded-full object-cover mr-3 border-2 border-emerald-600 shadow-2xs" />
          <div className="overflow-hidden flex-1">
            <p className="font-bold text-slate-900 truncate text-sm font-display" title={userName}>{userName}</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isPremium ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
                {isPremium ? 'Premium' : 'Standard'}
              </span>
              {isVerified && <Shield size={13} className="text-emerald-600" fill="currentColor" />}
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          <SidebarItem
            icon={<Heart size={18} />}
            label="Rencontres"
            active={activeTab === DashboardTab.MATCHES}
            onClick={() => handleTabChange(DashboardTab.MATCHES)}
            locked={!isVerified}
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
            icon={<HeartHandshake size={18} />}
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

      {/* Verset du jour sobre & discret */}
      <div className="p-4 pt-3 pb-24 md:pb-6 border-t border-slate-100 shrink-0 bg-slate-50/50">
        <div className="p-3.5 bg-white rounded-xl border border-emerald-100/80 text-center">
          <p className="text-[11px] font-medium text-slate-600 italic leading-relaxed">« {currentVerse.text} »</p>
          <span className="text-[10px] font-bold text-emerald-700 mt-1.5 block">— {currentVerse.ref}</span>
        </div>
      </div>
    </div>
  );

  const isMatchesTab = activeTab === DashboardTab.MATCHES;
  const isMatchesTabAndVerified = isMatchesTab && isVerified;
  const currentTabHeader = TAB_HEADERS[activeTab] || { title: 'Tableau de Bord', subtitle: '' };

  return (
    <div className="flex-1 w-full bg-[#FDFBF7] md:pl-64 relative flex flex-col min-h-screen">

      {/* TOAST DE RÉCOMPENSE SPIRITUELLE */}
      {meditationToast && (
        <div className="fixed top-20 right-4 md:right-8 z-50 bg-[#0D5C3A] text-amber-200 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top-3 border border-[#D4A359]/60 font-bold text-xs">
          <span>🕊️</span>
          <span>{meditationToast}</span>
        </div>
      )}

      {/* OFFLINE BANNER */}
      {isOffline && (
        <div className="bg-[#0D5C3A] text-white text-xs text-center py-2 px-4 z-30 flex-shrink-0 flex items-center justify-center gap-1.5 shadow-xs font-semibold">
          <WifiOff size={14} className="animate-pulse text-amber-300" />
          <span>Mode hors-ligne activé. Certaines données peuvent ne pas être à jour.</span>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-amber-200/50 flex-col z-20 shadow-2xs">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay & Drawer */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCloseMobileSidebar} />
      </div>

      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-[280px] max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col rounded-r-2xl overflow-hidden border-r border-amber-200/50 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 px-5 border-b border-amber-200/50 bg-[#0D5C3A] text-white shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm tracking-tight font-display text-amber-200">Navigation 225 Chrétien</span>
          </div>
          <button onClick={onCloseMobileSidebar} className="p-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content Area */}
      <main ref={mainContentRef} className={`flex-1 w-full flex flex-col ${isMatchesTabAndVerified ? 'h-[calc(100dvh-4rem)] overflow-hidden' : ''}`}>
        <div className={`max-w-4xl mx-auto p-3 pt-2 md:p-8 w-full flex-1 ${isMatchesTabAndVerified ? 'h-full flex flex-col pb-28 md:pb-[90px]' : 'pb-36 sm:pb-40 md:pb-16'}`}>
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

// Desktop SidebarItem (Clean Emerald Accent)
const SidebarItem = ({ icon, label, active, onClick, locked, badgeCount }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 text-left cursor-pointer group ${active
      ? 'bg-emerald-700 text-white font-bold shadow-2xs'
      : 'text-slate-700 hover:bg-emerald-50/80 hover:text-emerald-800 font-semibold'
      }`}
  >
    <div className="flex items-center space-x-3 text-xs sm:text-sm min-w-0">
      <div className="relative shrink-0">
        <span className={`transition-transform duration-150 inline-block ${active ? 'text-white' : 'text-slate-500 group-hover:text-emerald-700'}`}>{icon}</span>
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-emerald-800 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[16px] text-center border-2 border-white shadow-2xs">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
      <span className="truncate">{label}</span>
    </div>
    {locked && <Lock size={12} className={active ? 'text-white/80' : 'text-slate-400'} />}
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
