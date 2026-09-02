
import React, { useState, useEffect } from 'react';
import { Menu, User, LogIn, X, LogOut, Sparkles } from 'lucide-react';
import { UserRole, AppView } from '../types';
import { supabase } from '../supabaseClient';

const getImlrUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

// Resolution robuste du nom d'affichage utilisateur
const getDisplayName = (user: any, role: UserRole): string => {
  if (role === UserRole.ADMIN) return 'Administrateur';
  if (role === UserRole.GUEST) return 'Invité';
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

interface NavbarProps {
  currentUserRole: UserRole;
  onChangeView: (view: AppView) => void;
  toggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUserRole, onChangeView, toggleSidebar }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const loadUserData = async (session: any) => {
      if (session?.user) {
        try {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
          setUser({ ...session.user, ...(profile || {}) });
        } catch (e) {
          setUser(session.user);
        }
      } else {
        setUser(null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserData(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Détermination du nom à afficher
  const displayName = getDisplayName(user, currentUserRole);

  // Détermination de l'avatar
  const userAvatarUrl = (user?.avatar_url && currentUserRole === UserRole.USER)
    ? getImlrUrl(user.avatar_url)
    : null;

  const handleNav = (view?: AppView) => {
    if (view) onChangeView(view);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    onChangeView(AppView.LANDING);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white/90 backdrop-blur-md border-b border-emerald-100/80 sticky top-0 z-50 text-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => handleNav(currentUserRole === UserRole.GUEST ? AppView.LANDING : (currentUserRole === UserRole.ADMIN ? AppView.ADMIN_DASHBOARD : AppView.USER_DASHBOARD))}
          >
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-slate-900 font-display flex items-center">
                225 <span className="text-emerald-700 ml-1.5 font-extrabold">Chrétien</span>
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Sparkles size={10} className="mr-0.5 text-emerald-700" /> FOI
                </span>
              </span>
            </div>
          </div>

          {/* Desktop Menu - Landing */}
          {currentUserRole === UserRole.GUEST && (
            <div className="hidden md:flex items-center space-x-7">
              <button onClick={() => onChangeView(AppView.LANDING)} className="text-slate-600 hover:text-emerald-700 font-medium transition text-sm">Accueil</button>
              <button onClick={() => onChangeView(AppView.LANDING)} className="text-slate-600 hover:text-emerald-700 font-medium transition text-sm">Fonctionnalités</button>
              <button onClick={() => onChangeView(AppView.LANDING)} className="text-slate-600 hover:text-emerald-700 font-medium transition text-sm">Tarifs</button>
              <div className="h-4 w-px bg-slate-200 mx-1"></div>
              <button
                onClick={() => onChangeView(AppView.AUTH_LOGIN)}
                className="text-emerald-700 font-semibold hover:text-emerald-800 hover:bg-emerald-50 px-3.5 py-2 rounded-xl transition text-sm"
              >
                Connexion
              </button>
              <button
                onClick={() => onChangeView(AppView.AUTH_REGISTER)}
                className="btn-emerald-primary px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Rejoindre la communauté
              </button>
            </div>
          )}

          {/* Mobile Menu Button (Hamburger) */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Si connecté, bouton Menu Sidebar (Gauche) */}
            {currentUserRole !== UserRole.GUEST && (
              <button onClick={toggleSidebar} className="p-2 rounded-xl text-slate-700 hover:bg-emerald-50 mr-1 border border-slate-200">
                <Menu className="h-6 w-6" />
              </button>
            )}

            {/* Bouton Menu Navbar (Droite) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-emerald-50 border border-slate-200 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6 text-emerald-700" /> : (currentUserRole === UserRole.GUEST ? <Menu className="h-6 w-6 text-emerald-700" /> :
                <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-emerald-600">
                  {userAvatarUrl ? <img src={userAvatarUrl} className="h-full w-full object-cover" /> : <User className="h-full w-full p-1 text-emerald-700" />}
                </div>
              )}
            </button>
          </div>

          {/* Logged In User Menu (Desktop) */}
          {currentUserRole !== UserRole.GUEST && (
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-emerald-50/80 px-3.5 py-1.5 rounded-full border border-emerald-100">
                <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden border-2 border-emerald-600 shadow-xs">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="bg-emerald-100 w-full h-full flex items-center justify-center text-emerald-700">
                      <User size={18} />
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-600 font-medium">
                  Bonjour, <span className="font-bold text-emerald-900">{displayName}</span>
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-xl font-semibold flex items-center transition border border-red-100"
              >
                <LogOut size={15} className="mr-1.5" /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-emerald-100 absolute top-16 left-0 right-0 shadow-2xl z-40 animate-in slide-in-from-top-2">
          {currentUserRole === UserRole.GUEST ? (
            <div className="px-4 pt-3 pb-5 space-y-2.5">
              <button onClick={() => handleNav(AppView.LANDING)} className="block w-full text-left px-4 py-3 rounded-xl text-base font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">Accueil</button>
              <button onClick={() => handleNav(AppView.LANDING)} className="block w-full text-left px-4 py-3 rounded-xl text-base font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">Fonctionnalités</button>
              <button onClick={() => handleNav(AppView.LANDING)} className="block w-full text-left px-4 py-3 rounded-xl text-base font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">Tarifs</button>
              <div className="border-t border-slate-100 my-2"></div>
              <button
                onClick={() => handleNav(AppView.AUTH_LOGIN)}
                className="block w-full text-center px-4 py-3 rounded-xl text-base font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              >
                Connexion
              </button>
              <button
                onClick={() => handleNav(AppView.AUTH_REGISTER)}
                className="block w-full text-center px-4 py-3 rounded-xl text-base font-bold text-white btn-emerald-primary shadow-md"
              >
                S'inscrire gratuitement
              </button>
            </div>
          ) : (
            <div className="px-4 pt-4 pb-4 space-y-4">
              <div className="flex items-center px-3 pb-4 border-b border-slate-100">
                <div className="h-10 w-10 rounded-full flex items-center justify-center overflow-hidden border-2 border-emerald-600 mr-3 shadow-xs">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="bg-emerald-100 w-full h-full flex items-center justify-center text-emerald-700">
                      <User size={20} />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{displayName}</p>
                  <p className="text-xs text-emerald-700 font-semibold">{currentUserRole === UserRole.ADMIN ? 'Administrateur' : 'Membre Chrétien'}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center text-left px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="mr-3 h-5 w-5 text-red-600" />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
