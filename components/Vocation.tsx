
import React, { useState, useEffect } from 'react';
import { MOCK_VOCATION_RESOURCES } from '../constants';
import { PlayCircle, FileText, Mic, X, Phone, MapPin, User, AlertCircle, Heart, Cross, Globe, Calendar, CheckCircle2, ChevronDown, ChevronUp, BookOpen, Clock, Save } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { PriestContact } from '../types';

// Vocation tracks for broad Christian context
const VOCATION_TRACKS = [
    {
        key: 'MARIAGE',
        icon: '💍',
        emoji: <Heart className="h-7 w-7" />,
        label: 'Mariage & Foyer Chrétien',
        description: 'Découvrez l\'appel au mariage chrétien, source de joie et de sanctification.',
        color: 'from-rose-500 to-pink-600',
        lightColor: 'bg-rose-50 text-rose-600 group-hover:bg-rose-100',
        courses: [
            { title: 'Fondements du Mariage Chrétien', steps: '12 étapes', icon: '💍' },
            { title: 'Préparer son Cœur à l\'Amour', steps: '8 étapes', icon: '❤️' },
            { title: 'Prière en couple & famille', steps: '5 étapes', icon: '🙏' }
        ]
    },
    {
        key: 'MINISTERE',
        icon: '⛪',
        emoji: <Cross className="h-7 w-7" />,
        label: 'Ministère Pastoral & Sacerdoce',
        description: 'Explorez l\'appel au service pastoral, à la prêtrise ou au diaconat.',
        color: 'from-indigo-600 to-purple-700',
        lightColor: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
        courses: [
            { title: 'Discernement de la Vocation Religieuse', steps: '10 étapes', icon: '✝️' },
            { title: 'Prière & Discernement Pastoral', steps: '6 étapes', icon: '🙏' },
            { title: 'Fondements du Ministère', steps: '8 étapes', icon: '📖' }
        ]
    },
    {
        key: 'MISSION',
        icon: '🤝',
        emoji: <Globe className="h-7 w-7" />,
        label: 'Mission & Engagement Chrétien',
        description: 'L\'appel à servir, à témoigner et à porter l\'Évangile au monde.',
        color: 'from-emerald-600 to-teal-700',
        lightColor: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
        courses: [
            { title: 'Témoignage & Évangélisation', steps: '7 étapes', icon: '🌍' },
            { title: 'Service & Action Sociale Chrétienne', steps: '5 étapes', icon: '🤲' },
            { title: 'Engagement dans l\'Église locale', steps: '6 étapes', icon: '🏠' }
        ]
    }
];

const WORKSHEETS = [
    {
        id: 1,
        title: "Livret 1 : Vision & Valeurs Spirituelles",
        icon: "🙏",
        description: "Discerner ensemble votre vie spirituelle, vos traditions et l'importance de Dieu au centre de votre futur foyer.",
        questions: [
            {
                key: "w1_q1",
                label: "Comment envisagez-vous la prière en couple au quotidien et la fréquentation de l'église ?",
                placeholder: "Partagez vos attentes concernant le rythme de prière, le culte en famille et la participation à la vie paroissiale..."
            },
            {
                key: "w1_q2",
                label: "Quelles sont les valeurs spirituelles non négociables que vous souhaitez transmettre à vos enfants ?",
                placeholder: "Baptême, éducation religieuse, service communautaire..."
            },
            {
                key: "w1_q3",
                label: "En cas de dénominations chrétiennes différentes (ex: Catholique et Évangélique), comment comptez-vous gérer l'harmonie spirituelle ?",
                placeholder: "Quel culte choisir le dimanche, quelle paroisse, comment respecter la foi de chacun..."
            }
        ]
    },
    {
        id: 2,
        title: "Livret 2 : Communication & Résolution de conflits",
        icon: "💬",
        description: "Bâtir des outils de dialogue efficaces et sains pour traverser les inévitables tempêtes de la vie conjugale.",
        questions: [
            {
                key: "w2_q1",
                label: "Quel est votre mode habituel de réaction face au conflit (silence, colère, discussion immédiate) ?",
                placeholder: "Analysez vos styles personnels de communication sous pression et comment vous pouvez vous entraider..."
            },
            {
                key: "w2_q2",
                label: "Comment comptez-vous préserver l'autonomie de votre couple face aux pressions de la famille élargie (belle-famille) ?",
                placeholder: "Poser des limites saines avec respect et amour, en accord avec 'l'homme quittera son père et sa mère'..."
            },
            {
                key: "w2_q3",
                label: "Quelles règles d'or de communication souhaitez-vous instaurer en cas de désaccord majeur ?",
                placeholder: "Exemple : ne jamais se coucher sur une colère, prier ensemble avant de trancher, parler à la première personne..."
            }
        ]
    },
    {
        id: 3,
        title: "Livret 3 : Finances, Foyer & Projets de Vie",
        icon: "💍",
        description: "S'accorder sur des sujets concrets : argent, travail, dot culturelle et projets à long terme.",
        questions: [
            {
                key: "w3_q1",
                label: "Comment envisagez-vous la répartition et la gestion des comptes bancaires et des dépenses du foyer ?",
                placeholder: "Compte commun unique, comptes séparés avec partage équitable, épargne commune..."
            },
            {
                key: "w3_q2",
                label: "Comment percevez-vous la dot traditionnelle par rapport à vos valeurs chrétiennes et vos capacités financières ?",
                placeholder: "Discutez du poids de la dot culturelle et de la manière de la préparer avec sagesse..."
            },
            {
                key: "w3_q3",
                label: "Quels sont vos projets professionnels respectifs et comment influencent-ils votre vision du foyer (temps, enfants, déménagements) ?",
                placeholder: "Conciliation carrière et vie de famille, attentes de soutien mutuel..."
            }
        ]
    }
];

export const Vocation: React.FC = () => {
    const [activeModal, setActiveModal] = useState<'NONE' | 'CONTACT' | 'COURSE' | 'RESOURCE'>('NONE');
    const [selectedResource, setSelectedResource] = useState<any>(null);
    const [selectedTrack, setSelectedTrack] = useState<typeof VOCATION_TRACKS[0] | null>(null);
    const [priests, setPriests] = useState<PriestContact[]>([]);
    const [loadingPriests, setLoadingPriests] = useState(false);
    const [priestError, setPriestError] = useState<string | null>(null);

    // État du mentorat
    const [mentorshipRequest, setMentorshipRequest] = useState<any>(null);
    const [journalNotes, setJournalNotes] = useState<Record<string, string>>({});
    const [expandedWorksheet, setExpandedWorksheet] = useState<number | null>(null);
    
    // Charger la demande de parrainage et le journal depuis Supabase DB
    useEffect(() => {
        const loadMentorship = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                try {
                    const { data } = await supabase.from('system_settings').select('value').eq('key', `mentorship_${session.user.id}`).maybeSingle();
                    if (data?.value) {
                        setMentorshipRequest(data.value.request || null);
                        setJournalNotes(data.value.journal || {});
                    }
                } catch (e) {}
            }
        };
        loadMentorship();
    }, []);

    const handleSimulateApproval = async () => {
        const updated = {
            mentorName: 'Père Emmanuel',
            parish: 'Catholique - Saint Jean de Cocody',
            status: 'APPROVED'
        };
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            try {
                await supabase.from('system_settings').upsert({
                    key: `mentorship_${session.user.id}`,
                    value: { request: updated, journal: journalNotes },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            } catch (e) {}
        }
        setMentorshipRequest(updated);
        alert("Félicitations ! Le parrain a accepté votre demande d'accompagnement en base de données. Le carnet de route et le planificateur de rencontres sont maintenant disponibles.");
    };

    const handleCancelMentorship = async () => {
        if (window.confirm("Êtes-vous sûr de vouloir annuler ce parrainage ? Vos notes de journal seront conservées mais l'accompagnement actif sera réinitialisé.")) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                try {
                    await supabase.from('system_settings').upsert({
                        key: `mentorship_${session.user.id}`,
                        value: { request: null, journal: journalNotes },
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'key' });
                } catch (e) {}
            }
            setMentorshipRequest(null);
        }
    };

    const handleSaveJournalNote = async (key: string, value: string) => {
        const updated = {
            ...journalNotes,
            [key]: value
        };
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            try {
                await supabase.from('system_settings').upsert({
                    key: `mentorship_${session.user.id}`,
                    value: { request: mentorshipRequest, journal: updated },
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            } catch (e) {}
        }
        setJournalNotes(updated);
        alert("Vos réflexions ont été enregistrées dans votre Carnet de Route en base de données !");
    };

    // Charger les conseillers/pasteurs/prêtres quand la modale s'ouvre
    useEffect(() => {
        if (activeModal === 'CONTACT') {
            const loadPriests = async () => {
                setLoadingPriests(true);
                setPriestError(null);
                try {
                    const { data: result, error } = await supabase.from('priest_contacts').select('*').order('name');
                    if (error) throw error;
                    setPriests((result || []).map((p: any) => ({
                        id: p.id,
                        name: p.name,
                        parish: p.parish,
                        phone: p.phone,
                        availability: p.availability
                    })));
                } catch (e: any) {
                    console.error("Erreur chargement contacts:", e);
                    setPriestError("Impossible de charger la liste. Vérifiez votre connexion.");
                    setPriests([]);
                } finally {
                    setLoadingPriests(false);
                }
            };
            loadPriests();
        }
    }, [activeModal]);

    const handleOpenResource = (resource: any) => {
        setSelectedResource(resource);
        setActiveModal('RESOURCE');
    };

    const handleOpenCourse = (track: typeof VOCATION_TRACKS[0]) => {
        setSelectedTrack(track);
        setActiveModal('COURSE');
    };

    return (
        <div className="space-y-8 relative animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4 w-64 h-64 rounded-full bg-amber-400 blur-3xl" />
                    <div className="absolute bottom-0 left-4 w-40 h-40 rounded-full bg-teal-300 blur-3xl" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center mb-4">
                        <div className="bg-amber-400/20 border border-amber-400/30 p-2 rounded-xl mr-3">
                            <Cross className="h-6 w-6 text-amber-300" />
                        </div>
                        <span className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Discernement Vocationnel</span>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Quel est votre Appel ?</h2>
                    <p className="text-emerald-100 max-w-xl leading-relaxed">
                        "Car c'est Dieu qui produit en vous le vouloir et le faire, selon son bon plaisir." — Phil 2:13<br />
                        <span className="text-emerald-200/70 text-sm">Un espace pour tout chrétien en quête de son chemin.</span>
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button
                            onClick={() => setActiveModal('COURSE')}
                            className="bg-amber-400 text-emerald-950 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-amber-300 transition shadow-lg"
                        >
                            Commencer un parcours
                        </button>
                        <button
                            onClick={() => setActiveModal('CONTACT')}
                            className="bg-white/10 text-white border border-white/20 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-white/20 transition backdrop-blur-sm"
                        >
                            Contacter un Conseiller / Pasteur / Prêtre
                        </button>
                    </div>
                </div>
            </div>

            {/* Espace Mentorat & Parrainage Conjugal */}
            {!mentorshipRequest ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center flex-shrink-0">
                                <span className="text-3xl">🤝</span>
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-lg font-bold text-slate-900">Parrainage Spirituel & Mentorat Conjugal</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                                    Bâtissez un foyer solide en demandant l'accompagnement d'un couple mature certifié ou d'un prêtre/pasteur. Pour démarrer, ouvrez la discussion avec votre Match et cliquez sur l'icône de parrainage dans l'en-tête du chat.
                                </p>
                            </div>
                        </div>
                        <div className="flex-shrink-0 w-full md:w-auto text-center">
                            <button
                                onClick={() => {
                                    const demoData = {
                                        id: 'demo-request-' + Date.now(),
                                        matchId: 'demo-match-id',
                                        requesterId: 'demo-user-id',
                                        mentorId: '1',
                                        mentorName: 'Père André',
                                        mentorParish: 'Saint Jean de Cocody',
                                        notes: 'Discernement et préparation au mariage (Profil de Test)',
                                        status: 'PENDING',
                                        createdAt: new Date().toISOString(),
                                        meetings: [
                                            {
                                                id: 'meet-1',
                                                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] + 'T16:00:00.000Z',
                                                type: 'Zoom',
                                                link: 'https://zoom.us/j/225christien'
                                            }
                                        ]
                                    };
                                    localStorage.setItem('mentorship_requests_v1', JSON.stringify(demoData));
                                    setMentorshipRequest(demoData);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-3 rounded-xl transition shadow-md whitespace-nowrap active:scale-95"
                            >
                                ⚡ Lancer un parrainage Démo
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 md:p-8 space-y-8 animate-in fade-in duration-300 relative overflow-hidden">
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                    
                    {/* Header Accompagnement */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-200/50 rounded-2xl flex items-center justify-center text-2xl">
                                🤝
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold text-slate-900">Accompagnement Spirituel Actif</h3>
                                    {mentorshipRequest.status === 'PENDING' ? (
                                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 animate-pulse">
                                            <Clock size={12} /> ⏳ En attente
                                        </span>
                                    ) : (
                                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                                            <CheckCircle2 size={12} /> ✅ Actif
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Parrain : <strong className="text-slate-800">{mentorshipRequest.mentorName}</strong> ({mentorshipRequest.mentorParish})
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {mentorshipRequest.status === 'PENDING' && (
                                <button
                                    onClick={handleSimulateApproval}
                                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5"
                                >
                                    <span>⚡</span> Simuler l'approbation du mentor
                                </button>
                            )}
                            <button
                                onClick={handleCancelMentorship}
                                className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-semibold px-4 py-2.5 rounded-xl transition border border-transparent hover:border-red-100"
                            >
                                Arrêter l'accompagnement
                            </button>
                        </div>
                    </div>

                    {mentorshipRequest.status === 'PENDING' ? (
                        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-6 text-center max-w-2xl mx-auto space-y-3">
                            <AlertCircle className="mx-auto text-amber-500 h-10 w-10" />
                            <h4 className="font-bold text-slate-900">Demande envoyée à {mentorshipRequest.mentorName}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Votre guide a reçu votre invitation. Dès qu'il aura accepté l'accompagnement, vous débloquerez votre carnet de route conjoint ainsi que le planificateur de rencontres pour vos séances de discernement.
                            </p>
                            {mentorshipRequest.notes && (
                                <div className="bg-white border border-amber-100 rounded-xl p-3 text-left mt-2">
                                    <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider block mb-1">Votre note d'intention :</span>
                                    <p className="text-xs text-slate-500 italic">"{mentorshipRequest.notes}"</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Carnet de Route (Left side, takes 2 cols) */}
                            <div className="lg:col-span-2 space-y-6 text-left">
                                <div>
                                    <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <BookOpen size={20} className="text-emerald-600" />
                                        <span>Carnet de Route Conjugal</span>
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Réfléchissez individuellement ou ensemble à ces questions essentielles pour votre discernement.
                                    </p>
                                </div>

                                {/* Accordion Worksheets */}
                                <div className="space-y-3">
                                    {WORKSHEETS.map((sheet, index) => {
                                        const isExpanded = expandedWorksheet === index;
                                        return (
                                            <div key={sheet.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:border-emerald-200 transition-colors text-left">
                                                <button
                                                    onClick={() => setExpandedWorksheet(isExpanded ? null : index)}
                                                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">{sheet.icon}</span>
                                                        <div>
                                                            <h5 className="font-bold text-slate-800 text-sm">{sheet.title}</h5>
                                                            <p className="text-xs text-slate-500 mt-0.5">{sheet.questions.length} questions de discernement</p>
                                                        </div>
                                                    </div>
                                                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                                </button>

                                                {isExpanded && (
                                                    <div className="px-5 pb-5 border-t border-slate-100 bg-slate-50/20 space-y-5 animate-in slide-in-from-top-2 duration-200">
                                                        <p className="text-xs text-slate-600 leading-relaxed pt-3">
                                                            {sheet.description}
                                                        </p>
                                                        <div className="space-y-4">
                                                            {sheet.questions.map((q) => {
                                                                const value = journalNotes[q.key] || '';
                                                                return (
                                                                    <div key={q.key} className="space-y-2 bg-white p-4 rounded-xl border border-slate-100 text-left">
                                                                        <label className="text-xs font-bold text-slate-700 block leading-normal">{q.label}</label>
                                                                        <textarea
                                                                            value={value}
                                                                            onChange={(e) => setJournalNotes({ ...journalNotes, [q.key]: e.target.value })}
                                                                            placeholder={q.placeholder}
                                                                            rows={3}
                                                                            className="w-full text-xs rounded-xl border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 p-2.5 bg-slate-50/50 resize-none"
                                                                        />
                                                                        <div className="flex justify-end pt-1">
                                                                            <button
                                                                                onClick={() => handleSaveJournalNote(q.key, value)}
                                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition flex items-center gap-1 shadow-sm active:scale-95"
                                                                            >
                                                                                <Save size={10} /> Enregistrer
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Meetings & Planner (Right side, takes 1 col) */}
                            <div className="space-y-6 text-left">
                                <div>
                                    <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <Calendar size={20} className="text-emerald-600" />
                                        <span>Planificateur & Rencontres</span>
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Suivez vos prochaines séances d'accompagnement.
                                    </p>
                                </div>

                                {/* Meeting Card */}
                                {mentorshipRequest.meetings && mentorshipRequest.meetings.length > 0 ? (
                                    <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-2xl p-5 shadow-lg space-y-4 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                                        <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                            <span>Prochaine Séance</span>
                                        </div>
                                        
                                        <div>
                                            <h5 className="font-bold text-sm">Entretien de préparation</h5>
                                            <div className="flex items-center text-xs text-emerald-200 mt-2 gap-1.5">
                                                <Calendar size={14} />
                                                <span>
                                                    {new Date(mentorshipRequest.meetings[0].date).toLocaleDateString('fr-FR', {
                                                        weekday: 'long',
                                                        day: 'numeric',
                                                        month: 'long'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex items-center text-xs text-emerald-200 mt-1 gap-1.5">
                                                <Clock size={14} />
                                                <span>
                                                    {new Date(mentorshipRequest.meetings[0].date).toLocaleTimeString('fr-FR', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <a
                                                href={mentorshipRequest.meetings[0].link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-center font-bold text-xs transition block shadow-lg shadow-emerald-900/30 active:scale-95"
                                            >
                                                Rejoindre l'appel Zoom
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-5 text-center text-slate-400 space-y-2">
                                        <Calendar className="mx-auto text-slate-300 h-8 w-8" />
                                        <p className="text-xs font-semibold text-slate-600">Aucune réunion prévue</p>
                                        <p className="text-[10px] text-slate-400 leading-normal">
                                            Votre parrain planifiera vos entretiens vidéo ou présentiels prochainement.
                                        </p>
                                    </div>
                                )}

                                {/* Contact Mentor directly */}
                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                            {mentorshipRequest.mentorName.slice(0, 2)}
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-slate-800 text-xs">{mentorshipRequest.mentorName}</h5>
                                            <p className="text-[10px] text-slate-400">Votre parrain</p>
                                        </div>
                                    </div>
                                    <a
                                        href={`tel:${mentorshipRequest.mentorPhone || '0700000000'}`}
                                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition"
                                        title="Appeler le parrain"
                                    >
                                        <Phone size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tracks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {VOCATION_TRACKS.map((track) => (
                    <div
                        key={track.key}
                        onClick={() => handleOpenCourse(track)}
                        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all text-center cursor-pointer group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
                        <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors ${track.lightColor}`}>
                            <span className="text-2xl">{track.icon}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm leading-snug">{track.label}</h3>
                        <p className="text-xs text-slate-500 mt-2 group-hover:text-emerald-600 transition-colors leading-relaxed">{track.description}</p>
                        <span className="inline-block mt-3 text-xs font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            Explorer les ressources →
                        </span>
                    </div>
                ))}
            </div>

            {/* Resources List */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Ressources recommandées</h3>
                <div className="space-y-3">
                    {MOCK_VOCATION_RESOURCES.map(res => (
                        <div
                            key={res.id}
                            onClick={() => handleOpenResource(res)}
                            className="flex items-center bg-white p-4 rounded-lg border border-slate-100 hover:border-emerald-200 hover:shadow-sm cursor-pointer transition group"
                        >
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-4 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors flex-shrink-0">
                                {res.type === 'VIDEO' && <PlayCircle size={20} />}
                                {res.type === 'ARTICLE' && <FileText size={20} />}
                                {res.type === 'PODCAST' && <Mic size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-800 text-sm group-hover:text-emerald-700 truncate">{res.title}</h4>
                                <div className="flex items-center text-xs text-slate-400 mt-1 flex-wrap gap-1">
                                    <span className="uppercase tracking-wider font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                                        {res.category === 'PRETRISE' ? 'MINISTÈRE' :
                                         res.category === 'RELIGIEUSE' ? 'MISSION' :
                                         res.category}
                                    </span>
                                    {res.duration && <span>• {res.duration}</span>}
                                </div>
                            </div>
                            <button className="text-emerald-600 text-xs font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0">
                                Consulter
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- MODALS --- */}

            {/* Contact Modal — Conseillers / Pasteurs / Prêtres */}
            {activeModal === 'CONTACT' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveModal('NONE')} />
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 p-6 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Accompagnement Spirituel</h3>
                                <p className="text-slate-500 text-sm">Conseillers, Pasteurs et Pères disponibles pour l'écoute.</p>
                            </div>
                            <button onClick={() => setActiveModal('NONE')} className="text-slate-400 hover:text-slate-600 p-1 bg-slate-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                            {loadingPriests ? (
                                <div className="text-center py-8 text-slate-400">Chargement...</div>
                            ) : priestError ? (
                                <div className="text-center py-8 bg-red-50 rounded-xl border border-red-100 p-4">
                                    <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                                    <p className="text-red-600 text-sm font-medium">{priestError}</p>
                                </div>
                            ) : priests.length > 0 ? (
                                priests.map(priest => (
                                    <div key={priest.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 mr-4 shadow-sm">
                                                <User size={24} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{priest.name}</h4>
                                                <div className="flex items-center text-xs text-slate-500 mt-0.5">
                                                    <MapPin size={12} className="mr-1" /> {priest.parish}
                                                </div>
                                            </div>
                                        </div>
                                        <a
                                            href={`tel:${priest.phone}`}
                                            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 transition flex items-center shadow-md"
                                        >
                                            <Phone size={16} className="mr-2" /> Appeler
                                        </a>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-medium">Aucun contact disponible pour le moment.</p>
                                    <p className="text-slate-400 text-sm mt-1">Rapprochez-vous de votre église locale.</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
                            En cas de besoin spirituel urgent, rapprochez-vous de votre église ou communauté locale.
                        </div>
                    </div>
                </div>
            )}

            {/* Course Selection Modal */}
            {activeModal === 'COURSE' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setActiveModal('NONE')} />
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative z-10 p-0 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 p-6 text-white relative">
                            <button onClick={() => setActiveModal('NONE')} className="absolute top-4 right-4 text-emerald-200 hover:text-white">
                                <X size={24} />
                            </button>
                            <h3 className="text-2xl font-bold">
                                {selectedTrack ? selectedTrack.label : 'Choisir un parcours'}
                            </h3>
                            <p className="text-emerald-200 text-sm mt-1">
                                {selectedTrack ? selectedTrack.description : 'Des séries de contenus pour avancer pas à pas.'}
                            </p>
                        </div>
                        <div className="p-6 grid gap-3">
                            {(selectedTrack ? selectedTrack.courses : VOCATION_TRACKS.flatMap(t => t.courses.slice(0, 1))).map((course, idx) => (
                                <button key={idx} className="flex items-center p-4 border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition text-left group">
                                    <div className="text-2xl mr-4 bg-white p-2 rounded-lg shadow-sm border border-slate-100">{course.icon}</div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 group-hover:text-emerald-700">{course.title}</h4>
                                        <p className="text-xs text-slate-500">{course.steps} • Accès immédiat</p>
                                    </div>
                                </button>
                            ))}
                            {!selectedTrack && (
                                <p className="text-xs text-slate-400 text-center mt-2">
                                    Cliquez sur une vocation dans la page principale pour voir son parcours complet.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Resource Viewer Modal */}
            {activeModal === 'RESOURCE' && selectedResource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveModal('NONE')} />
                    <div className="bg-black rounded-xl shadow-2xl w-full max-w-4xl aspect-video relative z-10 flex items-center justify-center">
                        <button onClick={() => setActiveModal('NONE')} className="absolute -top-10 right-0 text-white hover:text-slate-300 flex items-center">
                            Fermer <X size={24} className="ml-2" />
                        </button>

                        {selectedResource.type === 'VIDEO' ? (
                            <div className="text-center text-white">
                                <PlayCircle size={64} className="mx-auto mb-4 opacity-50" />
                                <p className="font-medium">Lecteur vidéo</p>
                                <h2 className="text-2xl font-bold mt-2">{selectedResource.title}</h2>
                            </div>
                        ) : (
                            <div className="bg-white w-full h-full rounded-xl p-8 overflow-y-auto text-left">
                                <div className="max-w-2xl mx-auto">
                                    <span className="text-emerald-600 font-bold text-xs uppercase tracking-widest mb-2 block">{selectedResource.category}</span>
                                    <h2 className="text-3xl font-bold text-slate-900 mb-6">{selectedResource.title}</h2>
                                    <div className="prose prose-slate">
                                        <p>Ceci est une simulation du contenu de l'article ou du podcast.</p>
                                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                                        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
