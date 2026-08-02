
import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, MapPin, Loader, Info, ExternalLink, Users, CheckCircle, Video, Clock, Star, Crown, Zap } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AppEvent } from '../types';
import { SpeedDate } from './SpeedDate';

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

// ─── Compute next Speed Date evening (every Thursday at 20:00 Abidjan time) ──
function getNextSpeedDateEvening(): Date {
    const now = new Date();
    // Abidjan = UTC+0 (no DST). Next Thursday 20:00 UTC.
    const day = now.getUTCDay(); // 0=Sun, 4=Thu
    const daysUntilThursday = (4 - day + 7) % 7 || 7;
    const next = new Date(now);
    next.setUTCDate(now.getUTCDate() + daysUntilThursday);
    next.setUTCHours(20, 0, 0, 0);
    return next;
}

function formatCountdown(ms: number): { hours: string; minutes: string; seconds: string } {
    if (ms <= 0) return { hours: '00', minutes: '00', seconds: '00' };
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return {
        hours: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        seconds: s.toString().padStart(2, '0'),
    };
}

export const Events: React.FC = () => {
    const [events, setEvents] = useState<AppEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // event_id -> { count, isAttending, attendees: [{id, avatar}] }
    const [attendanceMap, setAttendanceMap] = useState<Record<string, { count: number; isAttending: boolean; attendees: { id: string; avatar: string; name: string }[] }>>({});
    const [loadingEventId, setLoadingEventId] = useState<string | null>(null);

    // Speed Date state
    const [showSpeedDate, setShowSpeedDate] = useState(false);
    const [speedDateEventId, setSpeedDateEventId] = useState('00000000-0000-0000-0000-000000000000');
    const [countdown, setCountdown] = useState({ hours: '00', minutes: '00', seconds: '00' });
    const [realStats, setRealStats] = useState({ attendeesCount: 0, matchesLastWeek: 0 });
    const [isAdminSpeedDateActive, setIsAdminSpeedDateActive] = useState<boolean>(true);
    const nextSpeedDate = useMemo(() => getNextSpeedDateEvening(), []);

    // Countdown ticker
    useEffect(() => {
        const tick = () => {
            const ms = nextSpeedDate.getTime() - Date.now();
            setCountdown(formatCountdown(ms));
        };
        tick();
        const iv = window.setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, [nextSpeedDate]);

    // Check admin speed date toggle from Supabase DB and ensure speed date event exists in DB
    useEffect(() => {
        const fetchSpeedDateSettings = async () => {
            try {
                const { data } = await supabase.from('system_settings').select('value').eq('key', 'admin_speed_date_active').maybeSingle();
                if (data && data.value !== undefined) {
                    setIsAdminSpeedDateActive(data.value === true);
                } else {
                    setIsAdminSpeedDateActive(true);
                }
            } catch (e) {
                setIsAdminSpeedDateActive(true);
            }
        };
        fetchSpeedDateSettings();

        const ensureSpeedDateEventExists = async () => {
            try {
                await supabase.from('events').upsert({
                    id: '00000000-0000-0000-0000-000000000000',
                    title: 'Soirée Virtuelle Chrétienne',
                    date: nextSpeedDate.toISOString(),
                    location: 'En ligne (Vidéo)',
                    description: 'Soirée de speed dating virtuel chrétien.'
                }, { onConflict: 'id' });
            } catch (e) {
                console.error("Failed to ensure speed date event exists", e);
            }
        };
        ensureSpeedDateEventExists();
    }, [nextSpeedDate]);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setCurrentUserId(session.user.id);
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                setCurrentUser(profile);
            }
        };
        init();
    }, []);

    const fetchStats = async () => {
        try {
            // Count registered users for the speed date event from event_attendees
            const { count: aCount } = await supabase
                .from('event_attendees')
                .select('*', { count: 'exact', head: true })
                .eq('event_id', '00000000-0000-0000-0000-000000000000');
            
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { count: mCount } = await supabase
                .from('matches')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', sevenDaysAgo.toISOString());

            setRealStats({
                attendeesCount: aCount || 0,
                matchesLastWeek: mCount || 0
            });
        } catch (err) {
            console.error("Erreur stats", err);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const { data: records, error } = await supabase.from('events').select('*').order('date').limit(50);
                if (error) throw error;
                const mappedEvents: AppEvent[] = (records || []).map((record: any) => ({
                    id: record.id,
                    title: record.title,
                    date: record.date,
                    location: record.location,
                    description: record.description,
                    link: record.link
                }));
                setEvents(mappedEvents);

                // Fetch attendance for all events including speed date event
                const allEventIds = [...mappedEvents.map(e => e.id), '00000000-0000-0000-0000-000000000000'];
                await fetchAllAttendance(allEventIds);
            } catch (err) {
                console.log("Erreur chargement événements", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, [currentUserId]);

    const fetchAllAttendance = async (eventIds: string[]) => {
        try {
            const { data } = await supabase
                .from('event_attendees')
                .select('event_id, user_id, profiles!event_attendees_user_id_fkey(id, full_name, avatar_url)')
                .in('event_id', eventIds);

            const map: Record<string, { count: number; isAttending: boolean; attendees: { id: string; avatar: string; name: string }[] }> = {};
            (data || []).forEach((row: any) => {
                if (!map[row.event_id]) map[row.event_id] = { count: 0, isAttending: false, attendees: [] };
                map[row.event_id].count++;
                const profile = row.profiles;
                if (profile) {
                    map[row.event_id].attendees.push({
                        id: profile.id,
                        avatar: profile.avatar_url ? getImlrUrl(profile.avatar_url) : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || '')}&background=random`,
                        name: profile.full_name || ''
                    });
                }
                if (currentUserId && row.user_id === currentUserId) {
                    map[row.event_id].isAttending = true;
                }
            });
            setAttendanceMap(map);
        } catch (e) {
            console.log('Erreur chargement participants', e);
        }
    };

    const handleToggleAttendance = async (eventId: string) => {
        if (!currentUserId) { alert('Connectez-vous pour vous inscrire.'); return; }
        setLoadingEventId(eventId);
        const current = attendanceMap[eventId];
        const isCurrentlyAttending = current?.isAttending ?? false;

        try {
            if (isCurrentlyAttending) {
                await supabase.from('event_attendees').delete().match({ event_id: eventId, user_id: currentUserId });
            } else {
                await supabase.from('event_attendees').insert({ event_id: eventId, user_id: currentUserId });
            }
            await fetchAllAttendance([eventId]);

            // If it's the speed date event, update the stats too!
            if (eventId === '00000000-0000-0000-0000-000000000000') {
                await fetchStats();
            }
        } catch (e) {
            console.error('Erreur inscription événement', e);
        } finally {
            setLoadingEventId(null);
        }
    };

    const nextDate = nextSpeedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const nextTime = nextSpeedDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-emerald-600" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ── 🌟 SOIRÉE VIRTUELLE CHRÉTIENNE — Hero Card ── */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.4),transparent_60%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(16,185,129,0.2),transparent_60%)]" />

                {/* Floating orbs */}
                <div className="absolute top-4 right-8 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
                <div className="absolute bottom-4 left-8 w-24 h-24 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

                <div className="relative p-6 md:p-8">
                    {/* Badge */}
                    <div className="inline-flex items-center bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full text-xs font-bold text-white mb-4 gap-1.5">
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                        EXCLUSIF · Chaque Jeudi
                    </div>

                    <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 leading-tight">
                        ✨ Soirées Virtuelles<br className="hidden md:block" /> Chrétiennes
                    </h2>
                    <p className="text-purple-200 text-sm mb-6 max-w-sm">
                        10 mini-conversations vidéo de 3 min avec des célibataires chrétiens de votre communauté. Like mutuel = Match permanent ! 🙏
                    </p>

                    {/* Countdown */}
                    <div className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-4 mb-6 inline-block">
                        <p className="text-white/50 text-[10px] uppercase tracking-widest mb-2 font-bold">Prochaine soirée — {nextDate} à {nextTime}</p>
                        <div className="flex items-center gap-3">
                            {[
                                { label: 'Heures', value: countdown.hours },
                                { label: 'Min', value: countdown.minutes },
                                { label: 'Sec', value: countdown.seconds },
                            ].map(({ label, value }, i) => (
                                <React.Fragment key={label}>
                                    <div className="text-center">
                                        <div className="text-3xl font-black text-white tabular-nums">{value}</div>
                                        <div className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">{label}</div>
                                    </div>
                                    {i < 2 && <div className="text-white/40 text-2xl font-bold">:</div>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Stats row */}
                    {/* Admin Status Alert */}
                    {!isAdminSpeedDateActive && (
                        <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs font-semibold rounded-2xl p-4 flex items-center gap-2 mb-6 animate-pulse">
                            <Info size={16} className="text-red-400 flex-shrink-0" />
                            <span>Cette fonctionnalité est temporairement désactivée par l'administrateur.</span>
                        </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mb-6 text-xs text-white/60">
                        <span className="flex items-center gap-1">
                            <Users size={12} />
                            {realStats.attendeesCount} inscrit{realStats.attendeesCount > 1 ? 's' : ''} ce soir
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                            <Star size={12} className="text-amber-400" />
                            {realStats.matchesLastWeek} match{realStats.matchesLastWeek > 1 ? 's' : ''} la semaine dernière
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-emerald-300">🔥 Places limitées</span>
                    </div>

                    {/* CTA */}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                        {isAdminSpeedDateActive ? (
                            <>
                                <button
                                    id="btn-join-soiree-virtuelle"
                                    onClick={() => setShowSpeedDate(true)}
                                    className="flex items-center justify-center gap-2 bg-white text-purple-900 hover:bg-purple-50 font-extrabold py-3.5 px-6 rounded-2xl shadow-xl transition hover:scale-[1.02] active:scale-95 text-sm"
                                >
                                    <Video size={18} />
                                    Rejoindre la Soirée
                                </button>
                                
                                <button
                                    onClick={() => handleToggleAttendance('00000000-0000-0000-0000-000000000000')}
                                    disabled={loadingEventId === '00000000-0000-0000-0000-000000000000'}
                                    className={`flex items-center justify-center gap-2 font-bold py-3.5 px-5 rounded-2xl border transition text-sm ${
                                        attendanceMap['00000000-0000-0000-0000-000000000000']?.isAttending
                                            ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 hover:bg-red-500/20 hover:border-red-400 hover:text-red-300'
                                            : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                    }`}
                                >
                                    {loadingEventId === '00000000-0000-0000-0000-000000000000' ? (
                                        <Loader size={16} className="animate-spin" />
                                    ) : attendanceMap['00000000-0000-0000-0000-000000000000']?.isAttending ? (
                                        <span>✓ Inscrit(e)</span>
                                    ) : (
                                        <span>S'inscrire à la Soirée</span>
                                    )}
                                </button>
                            </>
                        ) : (
                            <button
                                disabled
                                className="flex items-center justify-center gap-2 bg-slate-700 text-slate-400 font-bold py-3.5 px-6 rounded-2xl text-sm cursor-not-allowed"
                            >
                                <Video size={18} />
                                Indisponible
                            </button>
                        )}
                        
                        <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
                            <Crown size={14} className="text-amber-400" />
                            <span className="text-white/70 text-xs font-bold text-amber-300">Membres Premium 👑</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Regular Events Header ── */}
            <div className="relative rounded-2xl overflow-hidden bg-emerald-900 shadow-lg">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511818966892-d7d671e672a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center opacity-40"></div>
                <div className="relative p-8 md:p-12 text-white">
                    <div className="inline-flex items-center bg-emerald-600/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold mb-4">
                        <Calendar size={14} className="mr-2" />
                        AGENDA PAROISSIAL
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Vie de la Communauté</h1>
                    <p className="text-emerald-100 max-w-lg">
                        Retraites, veillées de prière, messes des jeunes... Retrouvez tous les temps forts et rencontrez des membres de la communauté qui y participeront aussi.
                    </p>
                </div>
            </div>

            {/* Events List */}
            <div className="grid gap-6">
                {events.length > 0 ? (
                    events.map(event => {
                        const eventDate = new Date(event.date);
                        const day = eventDate.getDate();
                        const month = eventDate.toLocaleString('fr-FR', { month: 'short' }).toUpperCase();
                        const attendance = attendanceMap[event.id] || { count: 0, isAttending: false, attendees: [] };
                        const isLoadingThis = loadingEventId === event.id;

                        return (
                            <div key={event.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition group">
                                {/* Date Badge */}
                                <div className="bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-6 flex flex-row md:flex-col items-center justify-center md:w-32 flex-shrink-0 group-hover:bg-emerald-50 transition-colors">
                                    <span className="text-3xl font-black text-slate-800 group-hover:text-emerald-600">{day}</span>
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest ml-2 md:ml-0 md:mt-1 group-hover:text-emerald-500">{month}</span>
                                </div>

                                {/* Content */}
                                <div className="p-6 flex-1">
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">{event.title}</h3>
                                    <div className="flex items-center text-slate-500 text-sm mb-4">
                                        <MapPin size={16} className="mr-1 text-emerald-500" />
                                        {event.location}
                                        <span className="mx-2">•</span>
                                        <span>{eventDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                        {event.description}
                                    </p>

                                    {/* Attendee Avatars */}
                                    {attendance.count > 0 && (
                                        <div className="flex items-center mb-4">
                                            <div className="flex -space-x-2 mr-2">
                                                {attendance.attendees.slice(0, 5).map(att => (
                                                    <img
                                                        key={att.id}
                                                        src={att.avatar}
                                                        alt={att.name}
                                                        title={att.name}
                                                        className="h-7 w-7 rounded-full border-2 border-white object-cover"
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-sm text-slate-600 font-medium flex items-center">
                                                <Users size={14} className="mr-1 text-emerald-500" />
                                                {attendance.count} membre{attendance.count > 1 ? 's' : ''} de la communauté {attendance.count > 1 ? 'y vont' : 'y va'}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex flex-wrap items-center gap-3">
                                        <button
                                            onClick={() => handleToggleAttendance(event.id)}
                                            disabled={isLoadingThis}
                                            className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition shadow-sm ${attendance.isAttending
                                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                } disabled:opacity-50`}
                                        >
                                            {isLoadingThis ? (
                                                <Loader size={14} className="animate-spin mr-1.5" />
                                            ) : attendance.isAttending ? (
                                                <CheckCircle size={14} className="mr-1.5" />
                                            ) : (
                                                <span className="mr-1.5">🙋</span>
                                            )}
                                            {attendance.isAttending ? "J'y vais ✓" : "J'y vais !"}
                                        </button>

                                        {event.link ? (
                                            <a
                                                href={event.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center text-emerald-600 font-bold text-sm hover:underline hover:text-emerald-700 transition"
                                            >
                                                En savoir plus <ExternalLink size={14} className="ml-1" />
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 text-sm italic cursor-not-allowed">
                                                Aucun lien d'inscription
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
                        <div className="bg-slate-50 p-4 rounded-full inline-flex mb-4">
                            <Info className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Aucun événement à venir</h3>
                        <p className="text-slate-500 mt-2">Le calendrier est vide pour le moment.</p>
                    </div>
                )}
            </div>

            {/* Speed Date Modal */}
            {showSpeedDate && (
                <SpeedDate
                    eventId={speedDateEventId}
                    eventTitle="Soirée Virtuelle Chrétienne"
                    eventDate={nextSpeedDate}
                    currentUserGender={currentUser?.gender || 'M'}
                    currentUserName={currentUser?.full_name || 'Vous'}
                    currentUserAvatar={currentUser?.avatar_url ? getImlrUrl(currentUser.avatar_url) : ''}
                    isPremium={currentUser?.is_premium || false}
                    onClose={() => setShowSpeedDate(false)}
                />
            )}
        </div>
    );
};