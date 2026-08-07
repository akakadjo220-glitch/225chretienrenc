
import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, MapPin, Loader, Info, ExternalLink, Users, CheckCircle, Video, Clock, Star, Crown } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { AppEvent } from '../types';

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

export const Events: React.FC = () => {
    const [events, setEvents] = useState<AppEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // event_id -> { count, isAttending, attendees: [{id, avatar}] }
    const [attendanceMap, setAttendanceMap] = useState<Record<string, { count: number; isAttending: boolean; attendees: { id: string; avatar: string; name: string }[] }>>({});
    const [loadingEventId, setLoadingEventId] = useState<string | null>(null);

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

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const { data: records, error } = await supabase.from('events').select('*').order('date').limit(50);
                if (error) throw error;
                const mappedEvents: AppEvent[] = (records || [])
                    .filter((record: any) => record.id !== '00000000-0000-0000-0000-000000000000' && !record.title?.toLowerCase().includes('speed dating') && !record.title?.toLowerCase().includes('speed date'))
                    .map((record: any) => ({
                        id: record.id,
                        title: record.title,
                        date: record.date,
                        location: record.location,
                        description: record.description,
                        link: record.link
                    }));
                setEvents(mappedEvents);

                // Fetch attendance for all events
                const allEventIds = mappedEvents.map(e => e.id);
                if (allEventIds.length > 0) {
                    await fetchAllAttendance(allEventIds);
                }
            } catch (err) {
                console.log("Erreur chargement événements", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEvents();
    }, [currentUserId]);

    const fetchAllAttendance = useCallback(async (eventIds: string[]) => {
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
    }, [currentUserId]);

    const handleToggleAttendance = useCallback(async (eventId: string) => {
        if (!currentUserId) return;
        setLoadingEventId(eventId);
        const isCurrentlyAttending = attendanceMap[eventId]?.isAttending;

        try {
            if (isCurrentlyAttending) {
                await supabase.from('event_attendees').delete().match({ event_id: eventId, user_id: currentUserId });
            } else {
                await supabase.from('event_attendees').insert({ event_id: eventId, user_id: currentUserId });
            }
            await fetchAllAttendance([eventId]);
        } catch (e) {
            console.error('Erreur inscription événement', e);
        } finally {
            setLoadingEventId(null);
        }
    }, [currentUserId, attendanceMap, fetchAllAttendance]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader className="animate-spin text-emerald-600" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-32 sm:pb-36">

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
                    events.map(event => (
                        <EventCard
                            key={event.id}
                            event={event}
                            attendance={attendanceMap[event.id] || { count: 0, isAttending: false, attendees: [] }}
                            isLoadingThis={loadingEventId === event.id}
                            onToggleAttendance={handleToggleAttendance}
                        />
                    ))
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
        </div>
    );
};

interface EventCardProps {
    event: AppEvent;
    attendance: { count: number; isAttending: boolean; attendees: { id: string; avatar: string; name: string }[] };
    isLoadingThis: boolean;
    onToggleAttendance: (id: string) => void;
}

const EventCard: React.FC<EventCardProps> = React.memo(({ event, attendance, isLoadingThis, onToggleAttendance }) => {
    const eventDate = new Date(event.date);
    const day = eventDate.getDate();
    const month = eventDate.toLocaleString('fr-FR', { month: 'short' }).toUpperCase();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition group">
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
                        onClick={() => onToggleAttendance(event.id)}
                        disabled={isLoadingThis}
                        className={`flex items-center px-4 py-2 rounded-full text-sm font-bold transition shadow-sm ${attendance.isAttending
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            } disabled:opacity-50 cursor-pointer`}
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
});