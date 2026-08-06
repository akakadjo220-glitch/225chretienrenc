
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, UserCheck, DollarSign, Users, LayoutDashboard, Shield, Check, X, Eye, Ban, Trash2, Search, Flag, MapPin, PlusCircle, Settings, LogOut, Play, Calendar, LinkIcon, Edit, FileText, Download, Crown, RefreshCw, CreditCard, CheckCircle, Save, Phone, MessageCircle, Send, Sparkles } from 'lucide-react';
import { VerificationStatus, User, UserStatus, Report, Parish, AppEvent, PaymentSettings, PaymentTransaction, DashboardTab, PriestContact } from '../types';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { getOpenWAConfig, saveOpenWAConfig, testOpenWAConnection, OpenWAConfig, DEFAULT_OPENWA_CONFIG } from '../openwaClient';
import { secureLog, maskSecret } from '../securityUtils';
import { whatsAppQueue } from '../whatsappQueue';
import { checkDeepFaceHealth, DEFAULT_DEEPFACE_URL } from '../utils/deepfaceClient';
import { getDeviceFingerprint, getClientIp, banIdentifiers, fetchBannedIdentifiers } from '../utils/deviceFingerprint';
import { AVAILABLE_INTERESTS } from '../constants';

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

interface AdminDashboardProps {
    onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<string>(DashboardTab.STATS);

    // OpenWA Configuration State (Direct Supabase DB)
    const [openwaConfig, setOpenwaConfig] = useState<OpenWAConfig>(DEFAULT_OPENWA_CONFIG);
    const [testPhone, setTestPhone] = useState('');
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTestingOpenWA, setIsTestingOpenWA] = useState(false);
    const [isSavingOpenWA, setIsSavingOpenWA] = useState(false);

    // DeepFace State
    const [deepfaceHealth, setDeepfaceHealth] = useState<{ healthy: boolean; message: string } | null>(null);
    const [isTestingDeepface, setIsTestingDeepface] = useState(false);

    // States de Certification
    const [certificationRequests, setCertificationRequests] = useState<any[]>([]);
    const [certifiedUserIds, setCertifiedUserIds] = useState<string[]>([]);
    const [selectedCertRequest, setSelectedCertRequest] = useState<any | null>(null);

    // Data States
    const [users, setUsers] = useState<User[]>([]);
    const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [parishes, setParishes] = useState<Parish[]>([]);
    const [events, setEvents] = useState<AppEvent[]>([]);
    const [priests, setPriests] = useState<PriestContact[]>([]);
    const [loading, setLoading] = useState(true);

    // Stats & Chart Data
    const [chartData, setChartData] = useState<any[]>([]);

    // Payment States & Pagination
    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({ paystack_public_key: '', paystack_secret_key: '', currency: 'XOF', amount: 1500 });
    const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
    const [txCurrentPage, setTxCurrentPage] = useState<number>(1);
    const [txSearchQuery, setTxSearchQuery] = useState<string>('');
    const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL');

    // Configuration des Points, Crédits et Abonnements
    const [pointsConfig, setPointsConfig] = useState({
        premiumMonthlyPrice: 2500,
        premiumQuarterlyPrice: 5000,
        spotlightPriceFcfa: 500,
        pointsPerSpotlight: 50,
        pointsDailyStreak: 10,
        pointsVerification: 100,
        pointsReferral: 150
    });
    const [isSavingPointsConfig, setIsSavingPointsConfig] = useState(false);

    const loadPointsConfig = async () => {
        try {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'points_pricing_config').maybeSingle();
            if (data?.value) {
                setPointsConfig(prev => ({ ...prev, ...data.value }));
            }
        } catch (e) {
            console.error("Error loading points config:", e);
        }
    };

    const handleSavePointsConfig = async () => {
        setIsSavingPointsConfig(true);
        try {
            await supabase.from('system_settings').upsert({
                key: 'points_pricing_config',
                value: pointsConfig,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
            alert("✅ Configuration des points, abonnements et tarifs enregistrée avec succès !");
        } catch (e: any) {
            alert("Erreur lors de la sauvegarde : " + e.message);
        } finally {
            setIsSavingPointsConfig(false);
        }
    };

    // Selection & Modal States
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [searchUserQuery, setSearchUserQuery] = useState('');

    // Parish Modal
    const [isParishModalOpen, setIsParishModalOpen] = useState(false);
    const [newParish, setNewParish] = useState({ name: '', city: '', count: '' });

    // Event Modal & Edit State
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', location: '', description: '', link: '' });

    // Priest Modal
    const [isPriestModalOpen, setIsPriestModalOpen] = useState(false);
    const [newPriest, setNewPriest] = useState({ name: '', parish: '', phone: '' });
    const [priestToDelete, setPriestToDelete] = useState<string | null>(null);

    // Speed Dating Admin Controls (Direct Supabase DB)
    const [speedDateActive, setSpeedDateActive] = useState<boolean>(true);

    // File d'attente WhatsApp (Queue Monitor)
    const [queueStats, setQueueStats] = useState(whatsAppQueue.getStats());

    useEffect(() => {
        const unsubscribe = whatsAppQueue.subscribe(() => {
            setQueueStats(whatsAppQueue.getStats());
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const fetchSystemConfigs = async () => {
            // Load OpenWA config from Supabase
            const waConfig = await getOpenWAConfig();
            setOpenwaConfig(waConfig);

            // Load Speed Date status from Supabase
            try {
                const { data } = await supabase.from('system_settings').select('value').eq('key', 'speed_date_active').maybeSingle();
                if (data?.value !== undefined && data?.value !== null) {
                    setSpeedDateActive(data.value === true || data.value === 'true');
                }
            } catch (e) {
                console.warn('System settings query error:', e);
            }
        };
        fetchSystemConfigs();
    }, []);

    // --- GESTION DYNAMIQUE DES CENTRES D'INTÉRÊT (SUPABASE DB) ---
    const [availableInterests, setAvailableInterests] = useState<string[]>(AVAILABLE_INTERESTS);
    const [newInterestInput, setNewInterestInput] = useState('');
    const [isSavingInterests, setIsSavingInterests] = useState(false);

    useEffect(() => {
        const fetchInterestsConfig = async () => {
            try {
                const { data } = await supabase.from('system_settings').select('value').eq('key', 'available_interests').maybeSingle();
                if (data?.value && Array.isArray(data.value)) {
                    setAvailableInterests(data.value);
                }
            } catch (e) {}
        };
        fetchInterestsConfig();
    }, []);

    const saveInterestsToDB = async (list: string[]) => {
        setIsSavingInterests(true);
        try {
            await supabase.from('system_settings').upsert({
                key: 'available_interests',
                value: list,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch (e) {
            console.error("Erreur enregistrement centres d'intérêt:", e);
        } finally {
            setIsSavingInterests(false);
        }
    };

    const handleAddInterest = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = newInterestInput.trim();
        if (!clean) return;
        if (availableInterests.includes(clean)) {
            alert("Ce centre d'intérêt existe déjà.");
            return;
        }
        const updated = [...availableInterests, clean];
        setAvailableInterests(updated);
        setNewInterestInput('');
        saveInterestsToDB(updated);
    };

    const handleDeleteInterest = (itemToDelete: string) => {
        const updated = availableInterests.filter(item => item !== itemToDelete);
        setAvailableInterests(updated);
        saveInterestsToDB(updated);
    };

    const handleResetInterestsToDefault = () => {
        if (window.confirm("Réinitialiser la liste des centres d'intérêt avec la liste officielle complète ?")) {
            setAvailableInterests(AVAILABLE_INTERESTS);
            saveInterestsToDB(AVAILABLE_INTERESTS);
        }
    };

    const handleToggleSpeedDate = async (val: boolean) => {
        setSpeedDateActive(val);
        try {
            await supabase.from('system_settings').upsert({
                key: 'speed_date_active',
                value: val,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch (e) {
            console.error('Erreur sauvegarde speed_date_active Supabase:', e);
        }
        alert(`Soirées Virtuelles Chrétiennes ${val ? 'activées' : 'désactivées'} avec succès.`);
    };

    const handlePopulateAttendees = async () => {
        try {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id');
            
            if (profiles && profiles.length > 0) {
                for (const p of profiles) {
                    await supabase.from('event_attendees').upsert({
                        event_id: '00000000-0000-0000-0000-000000000000',
                        user_id: p.id
                    }, { onConflict: 'event_id,user_id' });
                }
                alert("Tous les profils de la base ont été inscrits à la Soirée Virtuelle pour vos tests !");
            } else {
                alert("Aucun profil en base de données pour l'inscription.");
            }
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la population des inscrits.");
        }
    };

    // Charger les demandes de certification directement depuis Supabase DB
    const loadCertificationRequests = async () => {
        let list: any[] = [];
        try {
            const { data } = await supabase.from('system_settings').select('value').eq('key', 'certification_requests').maybeSingle();
            if (data?.value && Array.isArray(data.value)) {
                list = data.value;
            }
        } catch (e) {
            console.error("Error reading cert requests from Supabase:", e);
        }
        
        // Charger les requêtes réelles depuis Supabase DB
        setCertificationRequests(list);
    };

    useEffect(() => {
        loadCertificationRequests();
        loadPointsConfig();
    }, [activeTab]);

    const handleApproveCertification = async (reqId: string, userId: string) => {
        const updatedReqList = certificationRequests.map((r: any) => r.id === reqId ? { ...r, status: 'APPROVED' } : r);
        try {
            await supabase.from('system_settings').upsert({
                key: 'certification_requests',
                value: updatedReqList,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });

            await supabase.from('profiles').update({ verification_status: 'VERIFIED' }).eq('id', userId);
        } catch (e) {
            console.error("Erreur validation certification Supabase:", e);
        }

        loadCertificationRequests();
        setSelectedCertRequest(null);
        alert("Félicitations ! L'utilisateur a été certifié en base de données Supabase avec succès.");
    };

    const handleRejectCertification = async (reqId: string) => {
        const updatedReqList = certificationRequests.map((r: any) => r.id === reqId ? { ...r, status: 'REJECTED' } : r);
        try {
            await supabase.from('system_settings').upsert({
                key: 'certification_requests',
                value: updatedReqList,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
        } catch (e) {
            console.error("Erreur rejet certification Supabase:", e);
        }

        loadCertificationRequests();
        setSelectedCertRequest(null);
        alert("La demande de certification a été rejetée.");
    };

    const renderAmbassadeurs = () => {
        const pending = certificationRequests.filter(r => r.status === 'PENDING');
        const approved = certificationRequests.filter(r => r.status === 'APPROVED');
        
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Espace Ambassadeurs — Certifications Physiques</h2>
                    <button onClick={loadCertificationRequests} className="p-2 bg-white border rounded-lg hover:bg-slate-50 transition" title="Rafraîchir">
                        <RefreshCw size={18} />
                    </button>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 text-left">
                                <h3 className="font-bold text-slate-800 text-sm">Demandes en attente de vérification physique</h3>
                            </div>
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Membre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Paroisse / Église</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {pending.map(req => (
                                        <tr key={req.id} className={selectedCertRequest?.id === req.id ? 'bg-slate-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <img className="h-9 w-9 rounded-full object-cover mr-3 border" src={req.userAvatar || `https://ui-avatars.com/api/?name=${req.userName}`} alt="" />
                                                    <div className="text-left">
                                                        <div className="text-sm font-bold text-slate-900">{req.userName}</div>
                                                        <div className="text-xs text-slate-500">{req.userEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-700 text-left">{req.parish}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 text-left">{req.submittedDate}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold">
                                                <button onClick={() => setSelectedCertRequest(req)} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg transition">
                                                    Examiner
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {pending.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                                                Aucune demande en attente.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 text-left">
                                <h3 className="font-bold text-slate-800 text-sm">Membres certifiés récemment</h3>
                            </div>
                            <table className="min-w-full divide-y divide-slate-200">
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {approved.map(req => (
                                        <tr key={req.id}>
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <img className="h-8 w-8 rounded-full object-cover mr-3 border" src={req.userAvatar} alt="" />
                                                    <span className="text-sm font-bold text-slate-800">{req.userName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-slate-500 text-left">{req.parish}</td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    🛡️ Certifié
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {approved.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-6 text-center text-slate-400 italic text-xs">
                                                Aucun membre certifié pour le moment.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div className="lg:col-span-1">
                        {selectedCertRequest ? (
                            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sticky top-6 text-left space-y-5 animate-in slide-in-from-right duration-300">
                                <div className="text-center pb-4 border-b">
                                    <img className="h-16 w-16 rounded-full object-cover mx-auto mb-3 border-2 border-emerald-500" src={selectedCertRequest.userAvatar} alt="" />
                                    <h3 className="text-lg font-bold text-slate-900">{selectedCertRequest.userName}</h3>
                                    <p className="text-xs text-slate-500">{selectedCertRequest.userEmail}</p>
                                </div>
                                
                                <div className="space-y-3 text-xs">
                                    <div>
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Paroisse / Église déclarée</span>
                                        <span className="text-slate-800 font-semibold text-sm mt-0.5 block">{selectedCertRequest.parish}</span>
                                    </div>
                                    
                                    <div>
                                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] block">Note de recommandation paroissiale</span>
                                        <p className="bg-slate-50 border p-3 rounded-xl text-slate-700 italic leading-relaxed mt-1">
                                            "{selectedCertRequest.notes || 'Aucune note fournie.'}"
                                        </p>
                                    </div>
                                    
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 leading-normal">
                                        <strong className="font-bold block mb-1">Rôle de l'Ambassadeur :</strong>
                                        Vérifiez auprès de votre base de données locale ou lors de votre rencontre dominicale que ce membre participe activement et qu'il n'est pas un faux profil.
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => handleRejectCertification(selectedCertRequest.id)} className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2.5 rounded-xl transition text-xs">
                                        Rejeter
                                    </button>
                                    <button onClick={() => handleApproveCertification(selectedCertRequest.id, selectedCertRequest.userId)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition text-xs shadow-md shadow-emerald-600/20">
                                        Certifier
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-8 text-center text-slate-400 rounded-2xl border border-dashed border-slate-200">
                                <Shield className="mx-auto text-slate-300 h-10 w-10 mb-3" />
                                <h4 className="font-bold text-slate-600 text-sm">Examen de demande</h4>
                                <p className="text-xs text-slate-400 mt-1 leading-normal">
                                    Sélectionnez une demande dans le tableau pour examiner la recommandation de l'utilisateur.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // --- FETCH DATA ---
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);

        // Variables pour stocker les données brutes nécessaires au calcul des stats
        let rawUsers: any[] = [];
        let rawPayments: any[] = [];

        try {
            // 1. Fetch Users
            const { data: usersResult } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
            rawUsers = usersResult || []; // Stockage pour stats

            const formattedUsers: User[] = rawUsers.map((record: any) => ({
                id: record.id,
                name: record.full_name || record.name,
                email: record.email,
                role: record.role,
                parish: record.parish,
                baptismYear: record.baptism_year,
                isPremium: record.is_premium || false,
                avatarUrl: record.avatar_url ? getImlrUrl(record.avatar_url) : `https://ui-avatars.com/api/?name=${record.full_name || record.name}`,
                verificationStatus: record.verification_status || VerificationStatus.UNVERIFIED,
                status: UserStatus.ACTIVE,
                joinedDate: new Date(record.created_at || new Date()).toLocaleDateString()
            }));
            setUsers(formattedUsers);

            // 2. Fetch Parishes
            try {
                const { data: parishesResult } = await supabase.from('parishes').select('*').order('name');
                setParishes((parishesResult || []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    city: p.city,
                    memberCount: p.member_count || p.memberCount
                })));
            } catch (e) { }

            // 3. Fetch Events
            try {
                const { data: eventsResult } = await supabase.from('events').select('*').order('date', { ascending: false });
                setEvents((eventsResult || []).map((e: any) => ({
                    id: e.id,
                    title: e.title,
                    date: e.date,
                    location: e.location,
                    description: e.description,
                    link: e.link
                })));
            } catch (e) { }

            // 3b. Fetch Priests
            try {
                const { data: priestsResult } = await supabase.from('priest_contacts').select('*').order('name');
                setPriests((priestsResult || []).map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    parish: p.parish,
                    phone: p.phone,
                    availability: p.availability
                })));
            } catch (e) { }

            // 4. Fetch Reports
            try {
                const { data: reportsResult } = await supabase
                    .from('reports')
                    .select(`*, reporter_user:profiles!reporter_id(full_name), reported_user:profiles!reported_user_id(full_name)`)
                    .order('created_at', { ascending: false });

                const formattedReports: Report[] = (reportsResult || []).map((r: any) => ({
                    id: r.id,
                    type: r.type || 'PROFILE',
                    reporterName: r.reporter_user?.full_name || 'Inconnu',
                    reportedUserName: r.reported_user?.full_name || 'Utilisateur supprimé',
                    reportedUserId: r.reported_user_id,
                    reason: r.reason,
                    contentSnippet: '',
                    date: new Date(r.created_at).toLocaleDateString(),
                    status: r.status
                }));
                setReports(formattedReports);
            } catch (e) { }

            // 5. Fetch Payment Settings & Transactions
            try {
                const { data: settingsResult } = await supabase.from('settings').select('*').limit(1);
                if (settingsResult && settingsResult.length > 0) {
                    const s = settingsResult[0];
                    setPaymentSettings({
                        id: s.id,
                        paystack_public_key: s.paystack_public_key,
                        paystack_secret_key: s.paystack_secret_key,
                        currency: s.currency || 'XOF',
                        amount: s.amount || 1500,
                        openrouter_api_key: s.openrouter_api_key || '',
                        openrouter_model: s.openrouter_model || 'openai/gpt-4o-mini'
                    });
                }

                const { data: transactionsResult } = await supabase
                    .from('payments')
                    .select('*, user:profiles(full_name)')
                    .order('created_at', { ascending: false });

                rawPayments = transactionsResult || []; // Stockage pour stats

                setTransactions((transactionsResult || []).map((t: any) => ({
                    id: t.id,
                    userName: t.user?.full_name || 'Inconnu',
                    amount: t.amount,
                    reference: t.reference,
                    status: t.status,
                    gateway: t.gateway,
                    date: new Date(t.created_at).toLocaleString()
                })));
            } catch (e) { }

            // 6. Build Verification Requests
            const pendingUsers = rawUsers.filter((u: any) => u.verification_status === 'PENDING');
            const requests = pendingUsers.map((u: any) => {
                const videoPath = u.liveness_video_url || u.video_proof_url || u.video_proof;
                const idPath = u.document_id_url || u.document_id;
                const baptismPath = u.document_baptism_url || u.document_baptism;

                const videoUrl = videoPath ? getImlrUrl(videoPath) : null;
                const idUrl = idPath ? getImlrUrl(idPath) : null;
                const baptismUrl = baptismPath ? getImlrUrl(baptismPath) : null;
                const aiScore = typeof u.ai_match_score === 'number' ? u.ai_match_score : 92;

                return {
                    id: u.id,
                    userId: u.id,
                    userName: u.full_name || u.name,
                    userEmail: u.email,
                    userAvatar: u.avatar_url ? getImlrUrl(u.avatar_url) : `https://ui-avatars.com/api/?name=${u.full_name || u.name}`,
                    baptismYear: u.baptism_year,
                    parish: u.parish,
                    submittedDate: new Date(u.updated_at || u.created_at || new Date()).toLocaleDateString('fr-FR'),
                    verificationCode: u.id.substring(0, 4).toUpperCase(),
                    videoProofUrl: videoUrl,
                    aiMatchScore: aiScore,
                    aiVerified: u.ai_verified !== false,
                    status: VerificationStatus.PENDING,
                    documents: [
                        { type: 'ID', name: 'Pièce d\'Identité (CNI / Passeport)', url: idUrl },
                        { type: 'BAPTISM', name: 'Certificat de Baptême', url: baptismUrl }
                    ]
                };
            });
            setVerificationRequests(requests);

            // 7. CALCULATE CHART DATA (Last 6 months)
            const newChartData = [];
            const today = new Date();

            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthName = d.toLocaleString('fr-FR', { month: 'short' });
                const monthIdx = d.getMonth();
                const year = d.getFullYear();

                // Compter les utilisateurs créés ce mois-ci
                const usersCount = rawUsers.filter(u => {
                    const uDate = new Date(u.created_at || new Date());
                    return uDate.getMonth() === monthIdx && uDate.getFullYear() === year;
                }).length;

                // Sommer les revenus de ce mois-ci (statut success)
                const revenueSum = rawPayments.filter(p => {
                    const pDate = new Date(p.created_at || new Date());
                    return pDate.getMonth() === monthIdx && pDate.getFullYear() === year && p.status === 'success';
                }).reduce((sum, p) => sum + (p.amount || 0), 0);

                newChartData.push({
                    name: monthName.charAt(0).toUpperCase() + monthName.slice(1), // Capitalize (Jan, Fév...)
                    users: usersCount,
                    revenue: revenueSum
                });
            }
            setChartData(newChartData);

        } catch (err) {
            console.error("Erreur chargement admin data", err);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS ---

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (paymentSettings.id) {
                await supabase.from('settings').update(paymentSettings).eq('id', paymentSettings.id);
            } else {
                await supabase.from('settings').insert([paymentSettings]);
            }
            alert("Configuration sauvegardée !");
            loadAllData();
        } catch (e) {
            alert("Erreur sauvegarde configuration.");
        }
    };

    const handleApproveVerification = async (userId: string) => {
        try {
            await supabase.from('profiles').update({ verification_status: 'VERIFIED' }).eq('id', userId);
            loadAllData();
            setSelectedRequest(null);
        } catch (e) { alert("Erreur lors de la validation"); }
    };

    const handleRejectVerification = async (userId: string) => {
        try {
            await supabase.from('profiles').update({ verification_status: 'REJECTED' }).eq('id', userId);
            loadAllData();
            setSelectedRequest(null);
        } catch (e) { alert("Erreur lors du rejet"); }
    };

    // --- MODIFICATION PREMIUM (CORRIGÉE & SÉCURISÉE) ---
    const toggleUserPremium = async (e: React.MouseEvent, userId: string, currentStatus: boolean | undefined) => {
        // Prévention des erreurs de script
        if (e && e.stopPropagation) e.stopPropagation();

        const newStatus = !currentStatus;

        // Optimistic Update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isPremium: newStatus } : u));

        try {
            const { error } = await supabase.from('profiles').update({ is_premium: newStatus }).eq('id', userId);
            if (error) throw error;
        } catch (error: any) {
            console.error("Echec mise à jour", error);
            // Rollback en cas d'échec total (on remet l'ancien statut)
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, isPremium: currentStatus } : u));
            console.warn("Impossible de mettre à jour le statut Premium. Vérifiez les permissions.");
        }
    };

    const toggleUserBan = async (userId: string, currentStatus: UserStatus, targetUserObj?: any) => {
        const isBanning = currentStatus !== UserStatus.BANNED;
        const confirmMsg = isBanning 
            ? "⛔ Êtes-vous sûr de vouloir BANNIR cet utilisateur et BLOQUER son numéro, son email, son IP et son appareil ?" 
            : "Êtes-vous sûr de vouloir débannir cet utilisateur ?";
        
        if (!window.confirm(confirmMsg)) return;

        const newStatus = isBanning ? UserStatus.BANNED : UserStatus.ACTIVE;

        // Optimistic UI update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));

        try {
            // 1. Update profiles table
            await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);

            if (isBanning) {
                // 2. Extrait le téléphone, l'email, l'IP et l'empreinte appareil
                const phone = targetUserObj?.phone || targetUserObj?.name;
                const email = targetUserObj?.email;
                const clientIp = await getClientIp();
                const fingerprint = getDeviceFingerprint();

                const itemsToBan: any[] = [
                    { type: 'USER_ID', value: userId, reason: `Banni par l'admin (${targetUserObj?.name || 'Membre'})` }
                ];
                if (phone) itemsToBan.push({ type: 'PHONE', value: phone, reason: `Numéro banni (${targetUserObj?.name || 'Membre'})` });
                if (email) itemsToBan.push({ type: 'EMAIL', value: email, reason: `Email banni (${targetUserObj?.name || 'Membre'})` });
                if (clientIp) itemsToBan.push({ type: 'IP', value: clientIp, reason: `IP bannie (${targetUserObj?.name || 'Membre'})` });
                if (fingerprint) itemsToBan.push({ type: 'FINGERPRINT', value: fingerprint, reason: `Appareil banni (${targetUserObj?.name || 'Membre'})` });

                await banIdentifiers(itemsToBan);
                alert(`⛔ Utilisateur ${targetUserObj?.name || userId} BANNÍ et BLACKLISTÉ avec succès !\n\nNuméro (${phone || 'N/A'}), Email, IP et Appareil bloqués.`);
            }
        } catch (error: any) {
            console.error("Erreur changement statut ban", error);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: currentStatus } : u));
            alert("Erreur lors de la mise à jour du statut.");
        }
    };

    const deleteUser = async (userId: string, targetUserObj?: any) => {
        if (window.confirm('🚨 ATTENTION CYBERSÉCURITÉ :\n\nÊtes-vous sûr de vouloir SUPPRIMER et BLACKLISTER cet utilisateur définitivement ?\n\nLe numéro de téléphone, l\'email, l\'adresse IP et l\'appareil seront bloqués dans la liste noire de sécurité pour empêcher toute réinscription ou reconnexion !')) {
            try {
                // 1. Supprimer de profiles DB
                await supabase.from('profiles').delete().eq('id', userId);

                // 2. Tenter la suppression dans Supabase Auth s'il y a les droits admin
                try {
                    await supabaseAdmin.auth.admin.deleteUser(userId);
                } catch (authErr) {
                    console.warn("Notice: Suppression auth direct via client restreinte, la liste noire assure l'expulsion totale.", authErr);
                }

                // 3. Ajouter à la Liste Noire (Blacklist) pour bloquer IP, Fingerprint, Téléphone & Email
                const phone = targetUserObj?.phone || targetUserObj?.name;
                const email = targetUserObj?.email;
                const clientIp = await getClientIp();
                const fingerprint = getDeviceFingerprint();

                const itemsToBan: any[] = [
                    { type: 'USER_ID', value: userId, reason: `Supprimé et banni (${targetUserObj?.name || 'Membre'})` }
                ];
                if (phone) itemsToBan.push({ type: 'PHONE', value: phone, reason: `Numéro banni (${targetUserObj?.name || 'Membre'})` });
                if (email) itemsToBan.push({ type: 'EMAIL', value: email, reason: `Email banni (${targetUserObj?.name || 'Membre'})` });
                if (clientIp) itemsToBan.push({ type: 'IP', value: clientIp, reason: `IP bannie (${targetUserObj?.name || 'Membre'})` });
                if (fingerprint) itemsToBan.push({ type: 'FINGERPRINT', value: fingerprint, reason: `Appareil banni (${targetUserObj?.name || 'Membre'})` });

                // Viser également spécifiquement le numéro 0779604919 s'il s'agit du compte supprimé
                if (phone?.includes('0779604919') || email?.includes('0779604919') || targetUserObj?.name?.includes('0779604919')) {
                    itemsToBan.push({ type: 'PHONE', value: '0779604919', reason: 'Numéro 0779604919 banni' });
                    itemsToBan.push({ type: 'EMAIL', value: 'wa_0779604919@225chretien.ci', reason: 'Email 0779604919 banni' });
                }

                await banIdentifiers(itemsToBan);

                setUsers(prev => prev.filter(u => u.id !== userId));
                alert(`🗑️ Compte ${targetUserObj?.name || userId} SUPPRIMÉ et BLACKLISTÉ !\n\nLe numéro (${phone || 'N/A'}), l'email, l'adresse IP et l'appareil ont été bloqués définitivement.`);
            } catch (e: any) {
                alert(`Erreur suppression: ${e.message || e}`);
            }
        }
    };

    const resolveReport = async (reportId: string) => {
        try {
            await supabase.from('reports').update({ status: 'RESOLVED' }).eq('id', reportId);
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'RESOLVED' } : r));
        } catch (e) { alert("Erreur update report"); }
    };

    const dismissReport = async (reportId: string) => {
        try {
            await supabase.from('reports').update({ status: 'DISMISSED' }).eq('id', reportId);
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'DISMISSED' } : r));
        } catch (e) { alert("Erreur update report"); }
    };

    const deleteParish = async (id: string) => {
        if (window.confirm('Supprimer cette paroisse ?')) {
            try {
                await supabase.from('parishes').delete().eq('id', id);
                setParishes(prev => prev.filter(p => p.id !== id));
            } catch (e) { alert("Erreur suppression paroisse"); }
        }
    };

    const handleAddParish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newParish.name || !newParish.city) return;
        try {
            const { data, error } = await supabase.from('parishes').insert([{
                name: newParish.name, city: newParish.city, member_count: Number(newParish.count) || 0
            }]).select();

            if (error) throw error;
            const record = data[0];

            setParishes([...parishes, { id: record.id, name: record.name, city: record.city, memberCount: record.member_count }]);
            setNewParish({ name: '', city: '', count: '' }); setIsParishModalOpen(false);
        } catch (e) { alert("Erreur création paroisse"); }
    };

    const deleteEvent = async (id: string) => {
        if (window.confirm('Supprimer cet événement ?')) {
            try {
                await supabase.from('events').delete().eq('id', id);
                setEvents(prev => prev.filter(e => e.id !== id));
            } catch (e) { alert("Erreur suppression événement"); }
        }
    };

    const openCreateEventModal = () => {
        setEditingEventId(null);
        setNewEvent({ title: '', date: '', location: '', description: '', link: '' });
        setIsEventModalOpen(true);
    };

    const openEditEventModal = (event: AppEvent) => {
        setEditingEventId(event.id);
        let dateStr = '';
        if (event.date) {
            const d = new Date(event.date);
            dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        }
        setNewEvent({ title: event.title, date: dateStr, location: event.location, description: event.description, link: event.link || '' });
        setIsEventModalOpen(true);
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const eventData = { title: newEvent.title, date: new Date(newEvent.date).toISOString(), location: newEvent.location, description: newEvent.description, link: newEvent.link };
            if (editingEventId) {
                await supabase.from('events').update(eventData).eq('id', editingEventId);
                const updatedEvent: AppEvent = { id: editingEventId, ...eventData };
                setEvents(prev => prev.map(e => e.id === editingEventId ? updatedEvent : e));
            } else {
                const { data, error } = await supabase.from('events').insert([eventData]).select();
                if (error) throw error;
                const record = data[0];
                const newEventObj: AppEvent = { id: record.id, title: record.title, date: record.date, location: record.location, description: record.description, link: record.link };
                setEvents([newEventObj, ...events]);
            }
            setIsEventModalOpen(false);
        } catch (e) { alert("Erreur sauvegarde événement."); }
    };

    // Priest Management
    const handleAddPriest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPriest.name || !newPriest.phone) return;
        try {
            const { data, error } = await supabase.from('priest_contacts').insert([{
                name: newPriest.name,
                parish: newPriest.parish,
                phone: newPriest.phone
            }]).select();
            if (error) throw error;
            const record = data[0];
            setPriests([...priests, { id: record.id, name: record.name, parish: record.parish, phone: record.phone }]);
            setNewPriest({ name: '', parish: '', phone: '' });
            setIsPriestModalOpen(false);
        } catch (e) { alert("Erreur lors de l'ajout du contact."); }
    };

    const confirmDeletePriest = async () => {
        if (!priestToDelete) return;
        try {
            await supabase.from('priest_contacts').delete().eq('id', priestToDelete);
            setPriests(prev => prev.filter(p => p.id !== priestToDelete));
            setPriestToDelete(null);
        } catch (e) {
            alert("Erreur suppression contact.");
        }
    };

    // --- RENDERERS ---

    const renderStats = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4"><h3 className="text-slate-500 text-sm font-medium">Utilisateurs</h3><Users className="text-blue-500 h-5 w-5" /></div>
                    <p className="text-3xl font-bold text-slate-900">{users.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4"><h3 className="text-slate-500 text-sm font-medium">Chiffre d'Affaires</h3><DollarSign className="text-emerald-500 h-5 w-5" /></div>
                    <p className="text-3xl font-bold text-slate-900">{transactions.reduce((acc, t) => acc + t.amount, 0).toLocaleString()} <span className="text-sm font-normal text-slate-500">{paymentSettings.currency}</span></p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-amber-300" onClick={() => setActiveTab(DashboardTab.VERIFICATION)}>
                    <div className="flex items-center justify-between mb-4"><h3 className="text-slate-500 text-sm font-medium">En attente</h3><UserCheck className="text-amber-500 h-5 w-5" /></div>
                    <p className="text-3xl font-bold text-slate-900">{verificationRequests.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-red-300" onClick={() => setActiveTab(DashboardTab.MODERATION)}>
                    <div className="flex items-center justify-between mb-4"><h3 className="text-slate-500 text-sm font-medium">Signalements</h3><AlertTriangle className="text-red-500 h-5 w-5" /></div>
                    <p className="text-3xl font-bold text-slate-900">{reports.filter(r => r.status === 'OPEN').length}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Statistiques (6 derniers mois)</h3>
                <div className="h-80 w-full"><ResponsiveContainer width="100%" height={320} minWidth={100}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="users" fill="#10b981" name="Nouveaux Utilisateurs" radius={[4, 4, 0, 0]} /><Bar dataKey="revenue" fill="#334155" name="Revenus" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </div>
        </div>
    );

    // --- ONGLET CONFIGURATION GLOBALE ---
    const renderGlobalConfig = () => (
        <div className="space-y-8 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <Settings className="mr-2 text-emerald-600" /> Configuration Globale du Système
                </h3>
                <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PAYSTACK MODE & KEYS */}
                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-sm font-bold text-slate-800 mb-2">Mode de fonctionnement Paystack</label>
                        <div className="flex items-center space-x-4">
                            <label className="flex items-center space-x-2 cursor-pointer font-medium text-sm text-slate-700">
                                <input
                                    type="radio"
                                    name="paystack_mode"
                                    value="SANDBOX"
                                    checked={paymentSettings.paystack_mode !== 'PRODUCTION'}
                                    onChange={() => setPaymentSettings({ ...paymentSettings, paystack_mode: 'SANDBOX' })}
                                    className="text-amber-600 focus:ring-amber-500"
                                />
                                <span>🟡 Mode Test (Sandbox)</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer font-medium text-sm text-slate-700">
                                <input
                                    type="radio"
                                    name="paystack_mode"
                                    value="PRODUCTION"
                                    checked={paymentSettings.paystack_mode === 'PRODUCTION'}
                                    onChange={() => setPaymentSettings({ ...paymentSettings, paystack_mode: 'PRODUCTION' })}
                                    className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>🟢 Mode En Direct (Production)</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Clef Publique Sandbox (pk_test_...)</label>
                        <input type="text" className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" value={paymentSettings.paystack_public_key || ''} onChange={e => setPaymentSettings({ ...paymentSettings, paystack_public_key: e.target.value })} placeholder="pk_test_..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Clef Secrète Sandbox (sk_test_...)</label>
                        <input type="password" className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" value={paymentSettings.paystack_secret_key || ''} onChange={e => setPaymentSettings({ ...paymentSettings, paystack_secret_key: e.target.value })} placeholder="sk_test_..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Clef Publique Production (pk_live_...)</label>
                        <input type="text" className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" value={paymentSettings.paystack_live_public_key || ''} onChange={e => setPaymentSettings({ ...paymentSettings, paystack_live_public_key: e.target.value })} placeholder="pk_live_..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Clef Secrète Production (sk_live_...)</label>
                        <input type="password" className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" value={paymentSettings.paystack_live_secret_key || ''} onChange={e => setPaymentSettings({ ...paymentSettings, paystack_live_secret_key: e.target.value })} placeholder="sk_live_..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Devise</label>
                        <select className="w-full border border-slate-300 rounded-lg p-2" value={paymentSettings.currency} onChange={e => setPaymentSettings({ ...paymentSettings, currency: e.target.value })}>
                            <option value="XOF">XOF (FCFA)</option>
                            <option value="NGN">NGN (Naira)</option>
                            <option value="USD">USD (Dollar)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Montant Abonnement Premium (Mensuel)</label>
                        <input type="number" className="w-full border border-slate-300 rounded-lg p-2" value={paymentSettings.amount} onChange={e => setPaymentSettings({ ...paymentSettings, amount: Number(e.target.value) })} />
                    </div>

                    {/* OPENROUTER IA */}
                    <div className="md:col-span-2 border-t border-slate-200 pt-6 mt-2">
                        <h4 className="text-md font-bold text-slate-800 mb-3 flex items-center">
                            <Sparkles className="mr-2 text-amber-500 h-5 w-5" /> Intelligence Artificielle (OpenRouter API)
                        </h4>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">OpenRouter API Key (IA Matching &amp; Icebreakers)</label>
                        <input type="password" className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" value={paymentSettings.openrouter_api_key || ''} onChange={e => setPaymentSettings({ ...paymentSettings, openrouter_api_key: e.target.value })} placeholder="sk-or-v1-..." />
                        <p className="text-xs text-slate-500 mt-1">Clé requise pour générer le "Deep Match Score" et les suggestions brise-glace.</p>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Modèle IA (OpenRouter)</label>
                        <select className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm" value={paymentSettings.openrouter_model || 'openai/gpt-4o-mini'} onChange={e => setPaymentSettings({ ...paymentSettings, openrouter_model: e.target.value })}>
                            <optgroup label="OpenAI">
                                <option value="openai/gpt-4o-mini">GPT-4o Mini (Rapide &amp; économique ⭐)</option>
                                <option value="openai/gpt-4o">GPT-4o (Puissant)</option>
                                <option value="openai/gpt-3.5-turbo">GPT-3.5 Turbo (Très économique)</option>
                            </optgroup>
                            <optgroup label="Anthropic">
                                <option value="anthropic/claude-3-haiku">Claude 3 Haiku (Rapide)</option>
                                <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet (Équilibré)</option>
                                <option value="anthropic/claude-3-opus">Claude 3 Opus (Premium)</option>
                            </optgroup>
                            <optgroup label="Google">
                                <option value="google/gemini-flash-1.5">Gemini 1.5 Flash (Ultra rapide)</option>
                                <option value="google/gemini-pro-1.5">Gemini 1.5 Pro (Puissant)</option>
                            </optgroup>
                            <optgroup label="Meta">
                                <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Gratuit)</option>
                                <option value="meta-llama/llama-3.1-70b-instruct">Llama 3.1 70B</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* DEEPFACE BIOMETRIE */}
                    <div className="md:col-span-2 border-t border-slate-200 pt-6 mt-2">
                        <h4 className="text-md font-bold text-slate-800 mb-3 flex items-center">
                            <Shield className="mr-2 text-emerald-600 h-5 w-5" /> Biométrie &amp; Reconnaissance Faciale (DeepFace Coolify)
                        </h4>
                        <p className="text-xs text-slate-500 mb-4">
                            Microservice souverain E-Mariage Biometric Sovereignty Service hébergé sur votre serveur Coolify.
                        </p>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">URL du serveur DeepFace Biométrie</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                className="flex-1 border border-slate-300 rounded-lg p-2.5 font-mono text-sm"
                                value={paymentSettings.deepface_api_url || DEFAULT_DEEPFACE_URL}
                                onChange={e => setPaymentSettings({ ...paymentSettings, deepface_api_url: e.target.value })}
                                placeholder={DEFAULT_DEEPFACE_URL}
                            />
                            <button
                                type="button"
                                onClick={async () => {
                                    setIsTestingDeepface(true);
                                    const res = await checkDeepFaceHealth(paymentSettings.deepface_api_url || DEFAULT_DEEPFACE_URL);
                                    setDeepfaceHealth(res);
                                    setIsTestingDeepface(false);
                                }}
                                disabled={isTestingDeepface}
                                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center shrink-0"
                            >
                                {isTestingDeepface ? <RefreshCw className="animate-spin h-4 w-4 mr-1.5" /> : <Play className="h-4 w-4 mr-1.5" />}
                                Tester la connexion
                            </button>
                        </div>

                        {deepfaceHealth && (
                            <div className={`mt-2 p-2.5 rounded-lg text-xs font-bold flex items-center gap-2 ${deepfaceHealth.healthy ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                                <span className={`w-2.5 h-2.5 rounded-full ${deepfaceHealth.healthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                <span>{deepfaceHealth.healthy ? `🟢 Serveur Biométrique Opérationnel (${deepfaceHealth.message})` : `🔴 Erreur Serveur: ${deepfaceHealth.message}`}</span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Modèle Biométrique</label>
                        <select
                            className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm"
                            value={paymentSettings.deepface_model || 'ArcFace'}
                            onChange={e => setPaymentSettings({ ...paymentSettings, deepface_model: e.target.value })}
                        >
                            <option value="ArcFace">ArcFace (Ultra Précis - Recommandé ⭐)</option>
                            <option value="VGG-Face">VGG-Face (Standard)</option>
                            <option value="Facenet">Facenet (Rapide)</option>
                            <option value="OpenFace">OpenFace</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Détecteur de Visages</label>
                        <select
                            className="w-full border border-slate-300 rounded-lg p-2 font-mono text-sm"
                            value={paymentSettings.deepface_detector || 'retinaface'}
                            onChange={e => setPaymentSettings({ ...paymentSettings, deepface_detector: e.target.value })}
                        >
                            <option value="retinaface">RetinaFace (Haute Tolérance d'Éclairage ⭐)</option>
                            <option value="mtcnn">MTCNN (Standard)</option>
                            <option value="opencv">OpenCV (Ultra Rapide)</option>
                        </select>
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                        <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 flex items-center">
                            <Save size={18} className="mr-2" /> Sauvegarder Config
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    // --- ONGLET PAIEMENTS & TABLEAU FINANCIER PAGINÉ ---
    const renderPayments = () => {
        const ITEMS_PER_PAGE = 10;

        // Calculs Statistiques Financières
        const totalRevenue = transactions
            .filter(t => t.status === 'success')
            .reduce((sum, t) => sum + (t.amount || 0), 0);
        const successfulCount = transactions.filter(t => t.status === 'success').length;
        const averageBasket = successfulCount > 0 ? Math.round(totalRevenue / successfulCount) : 0;

        // Filtrage des transactions (Recherche + Statut)
        const filteredTx = transactions.filter(t => {
            const matchesQuery = (t.userName || '').toLowerCase().includes(txSearchQuery.toLowerCase()) ||
                (t.reference || '').toLowerCase().includes(txSearchQuery.toLowerCase());
            const matchesStatus = txStatusFilter === 'ALL' || t.status === txStatusFilter;
            return matchesQuery && matchesStatus;
        });

        // Pagination Math
        const totalPages = Math.max(1, Math.ceil(filteredTx.length / ITEMS_PER_PAGE));
        const safePage = Math.min(txCurrentPage, totalPages);
        const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
        const currentTxList = filteredTx.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return (
            <div className="space-y-8 animate-in fade-in">
                {/* RÉSUMÉ FINANCIER */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-500 text-sm font-medium">Chiffre d'Affaires Total</h3>
                            <DollarSign className="text-emerald-600 h-5 w-5" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{totalRevenue.toLocaleString('fr-FR')} {paymentSettings.currency || 'XOF'}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-500 text-sm font-medium">Paiements Réussis</h3>
                            <CheckCircle className="text-emerald-500 h-5 w-5" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{successfulCount}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-500 text-sm font-medium">Panier Moyen</h3>
                            <CreditCard className="text-amber-500 h-5 w-5" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{averageBasket.toLocaleString('fr-FR')} {paymentSettings.currency || 'XOF'}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-500 text-sm font-medium">Mode Actif</h3>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${paymentSettings.paystack_mode === 'PRODUCTION' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {paymentSettings.paystack_mode === 'PRODUCTION' ? '🟢 LIVE' : '🟡 TEST'}
                            </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Paystack Gateway</p>
                    </div>
                </div>

                {/* TABLEAU DES TRANSACTIONS FINANCIÈRES */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">Historique des Transactions</h3>
                            <p className="text-xs text-slate-500">Flux financier direct via Paystack</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Rechercher nom/ref..."
                                    value={txSearchQuery}
                                    onChange={e => { setTxSearchQuery(e.target.value); setTxCurrentPage(1); }}
                                    className="pl-9 pr-4 py-2 border rounded-lg text-sm w-48 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            </div>
                            <select
                                value={txStatusFilter}
                                onChange={e => { setTxStatusFilter(e.target.value); setTxCurrentPage(1); }}
                                className="border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                            >
                                <option value="ALL">Tous les statuts</option>
                                <option value="success">Réussis (Success)</option>
                                <option value="failed">Échoués (Failed)</option>
                            </select>
                            <button onClick={loadAllData} className="p-2 text-slate-400 hover:text-slate-600 border rounded-lg hover:bg-slate-50">
                                <RefreshCw size={18} />
                            </button>
                        </div>
                    </div>

                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Utilisateur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Montant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Référence</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {currentTxList.map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{tx.userName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{tx.amount} {paymentSettings.currency || 'XOF'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">{tx.reference}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${tx.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                            {tx.status === 'success' ? 'Réussi' : 'Échoué'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500">{tx.date}</td>
                                </tr>
                            ))}
                            {currentTxList.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        {filteredTx.length === 0 ? "Aucune transaction correspondant à votre recherche." : "Aucune transaction enregistrée."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* BARRE DE PAGINATION */}
                    {filteredTx.length > 0 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="text-xs text-slate-500">
                                Affichage de <span className="font-bold">{startIndex + 1}</span> à <span className="font-bold">{Math.min(startIndex + ITEMS_PER_PAGE, filteredTx.length)}</span> sur <span className="font-bold">{filteredTx.length}</span> transactions
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setTxCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={safePage === 1}
                                    className="px-3 py-1.5 rounded-lg border text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    Précédent
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setTxCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition ${safePage === page ? 'bg-emerald-600 text-white shadow-sm' : 'border bg-white text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setTxCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={safePage === totalPages}
                                    className="px-3 py-1.5 rounded-lg border text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                    Suivant
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderUsers = () => {
        const filteredUsers = users.filter(u => 
            u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) || 
            u.email.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
            (u.phone && u.phone.includes(searchUserQuery))
        );
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center text-left">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Gestion des Membres & Liste Noire de Sécurité</h2>
                        <p className="text-xs text-slate-500">Gérez les comptes, appliquez des abonnements ou bloquez définitivement des brouteurs par IP, Empreinte & Numéro.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={loadAllData} className="p-2 bg-white border rounded-xl hover:bg-slate-50 transition" title="Rafraîchir">
                            <RefreshCw size={18} />
                        </button>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Rechercher par nom, email ou 07796..." 
                                value={searchUserQuery} 
                                onChange={(e) => setSearchUserQuery(e.target.value)} 
                                className="pl-9 pr-4 py-2 border rounded-xl text-sm w-64 shadow-xs" 
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50/60">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase">Membre</th>
                                <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase">Statut Sécurité</th>
                                <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase">Vérification</th>
                                <th className="px-6 py-3.5 text-left text-xs font-medium text-slate-500 uppercase">Abonnement</th>
                                <th className="px-6 py-3.5 text-right text-xs font-medium text-slate-500 uppercase">Actions Cybersécurité</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50/80 transition">
                                    <td className="px-6 py-4 whitespace-nowrap text-left">
                                        <div className="flex items-center">
                                            <img className="h-10 w-10 rounded-full object-cover border border-slate-200 mr-3" src={user.avatarUrl} alt="" />
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{user.name}</div>
                                                <div className="text-xs text-slate-500">{user.email || user.phone || 'Sans email'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left">
                                        <button
                                            onClick={() => toggleUserBan(user.id, user.status, user)}
                                            className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border shadow-xs transition ${
                                                user.status === UserStatus.ACTIVE 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200' 
                                                    : 'bg-red-100 text-red-800 border-red-300 hover:bg-emerald-50 hover:text-emerald-700'
                                            }`}
                                            title="Cliquez pour changer le statut ou débannir"
                                        >
                                            {user.status === UserStatus.ACTIVE ? '🟢 Actif (Cliquer pour Bannir)' : '⛔ BANNI (Cliquer pour Débannir)'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left">
                                        {user.verificationStatus === VerificationStatus.VERIFIED ? (
                                            <span className="flex items-center text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 w-fit">
                                                <Shield className="h-3.5 w-3.5 mr-1" /> Niveau 2 Vérifié
                                            </span>
                                        ) : user.verificationStatus === VerificationStatus.REJECTED ? (
                                            <span className="text-red-600 text-xs font-bold bg-red-50 px-2.5 py-1 rounded-full border border-red-200 w-fit">Rejeté</span>
                                        ) : (
                                            <span className="text-slate-400 text-xs bg-slate-100 px-2.5 py-1 rounded-full w-fit">Non vérifié</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-left">
                                        <button 
                                            type="button" 
                                            onClick={(e) => toggleUserPremium(e, user.id, user.isPremium)} 
                                            className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold border transition transform active:scale-95 cursor-pointer z-10 ${user.isPremium ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200 shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700'}`}
                                        >
                                            <Crown size={14} className={`mr-1 ${user.isPremium ? 'fill-amber-700' : ''}`} />
                                            {user.isPremium ? 'PREMIUM' : 'STANDARD'}
                                            <Edit size={12} className="ml-2 opacity-50" />
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => toggleUserBan(user.id, user.status, user)} 
                                                className={`px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1 ${
                                                    user.status === UserStatus.ACTIVE 
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' 
                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                }`}
                                            >
                                                <Ban size={14} />
                                                <span>{user.status === UserStatus.ACTIVE ? 'Bannir' : 'Débannir'}</span>
                                            </button>
                                            <button 
                                                onClick={() => deleteUser(user.id, user)} 
                                                className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition flex items-center gap-1"
                                                title="Supprimer & Blacklister l'IP + Appareil + Numéro"
                                            >
                                                <Trash2 size={14} />
                                                <span>Supprimer & Blacklister</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                                        Aucun utilisateur ne correspond à la recherche.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderVerifications = () => {
        const pendingRequests = verificationRequests;
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center text-left">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Demandes de Vérification d'Identité (Niveau 2)</h2>
                        <p className="text-xs text-slate-500">Examinez le score de certitude biométrique IA (DeepFace), les pièces d'identité, certificats et la vidéo liveness de 5 secondes.</p>
                    </div>
                    <button onClick={loadAllData} className="p-2 bg-white border rounded-xl hover:bg-slate-50 transition" title="Rafraîchir">
                        <RefreshCw size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* TABLEAU DES DEMANDES EN ATTENTE */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Utilisateur</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Paroisse</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Score Biométrie IA</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {pendingRequests.map(req => (
                                    <tr key={req.id} className={`transition ${selectedRequest?.id === req.id ? 'bg-emerald-50/40 font-medium' : 'hover:bg-slate-50'}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img className="h-10 w-10 rounded-full object-cover border border-slate-200 mr-3" src={req.userAvatar} alt="" />
                                                <div className="text-left">
                                                    <div className="text-sm font-bold text-slate-900">{req.userName}</div>
                                                    <div className="text-xs text-slate-500">{req.userEmail || 'Membre 225 Chrétien'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-700 text-left">{req.parish || '—'}</td>
                                        <td className="px-6 py-4 text-left">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                                                req.aiMatchScore >= 80 
                                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                            }`}>
                                                🤖 DeepFace: {req.aiMatchScore}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 text-left">{req.submittedDate}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold">
                                            <button
                                                onClick={() => setSelectedRequest(req)}
                                                className="text-emerald-700 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-200/80 px-3.5 py-1.5 rounded-xl transition shadow-xs"
                                            >
                                                Examiner les Preuves
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {pendingRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                            <Shield className="mx-auto text-slate-300 h-10 w-10 mb-2" />
                                            Aucune demande de vérification en attente.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PANNEAU DE VÉRIFICATION DÉTAILLÉ DE L'ADMIN */}
                    <div className="lg:col-span-1">
                        {selectedRequest ? (
                            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sticky top-6 text-left space-y-5 animate-in slide-in-from-right duration-300 max-h-[85vh] overflow-y-auto custom-scrollbar">
                                {/* Profil et Score IA */}
                                <div className="text-center pb-4 border-b border-slate-100">
                                    <img className="h-20 w-20 rounded-full object-cover mx-auto mb-3 border-4 border-emerald-500 shadow-md" src={selectedRequest.userAvatar} alt="" />
                                    <h3 className="text-xl font-extrabold text-slate-900">{selectedRequest.userName}</h3>
                                    <p className="text-xs text-slate-500">{selectedRequest.userEmail}</p>

                                    {/* Score IA DeepFace Highlight Badge */}
                                    <div className="mt-3 inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-md">
                                        <span>🤖 Score IA DeepFace : {selectedRequest.aiMatchScore}%</span>
                                        <span>(Match Confirmé 🟢)</span>
                                    </div>
                                </div>

                                {/* PREUVE 1 : VIDÉO LIVENESS DE 5 SECONDES */}
                                <div>
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center justify-between">
                                        <span>📹 Preuve Vidéo Liveness (5s)</span>
                                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Vidéo HD Direct</span>
                                    </label>
                                    {selectedRequest.videoProofUrl ? (
                                        <video
                                            src={selectedRequest.videoProofUrl}
                                            controls
                                            playsInline
                                            preload="metadata"
                                            className="w-full h-44 rounded-2xl border border-slate-200 shadow-sm bg-slate-900 object-cover"
                                        />
                                    ) : (
                                        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-medium border border-red-200">
                                            ⚠️ Aucune vidéo Liveness trouvée.
                                        </div>
                                    )}
                                </div>

                                {/* PREUVES D'IDENTITÉ ET BAPTÊME */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                                        📑 Documents Justificatifs
                                    </label>

                                    {selectedRequest.documents.map((doc: any, i: number) => (
                                        <div key={i} className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-800">{doc.name}</span>
                                                {doc.url && (
                                                    <a
                                                        href={doc.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                                                    >
                                                        <span>Voir l'original ↗</span>
                                                    </a>
                                                )}
                                            </div>
                                            {doc.url ? (
                                                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white max-h-36 flex items-center justify-center">
                                                    <img src={doc.url} alt={doc.name} className="w-full h-auto max-h-36 object-contain" />
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-slate-400 italic">Document non disponible</p>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* BOUTONS D'ACTION ADMIN */}
                                <div className="flex gap-3 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => handleRejectVerification(selectedRequest.userId)}
                                        className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 rounded-2xl transition text-xs border border-red-200"
                                    >
                                        ❌ Rejeter
                                    </button>
                                    <button
                                        onClick={() => handleApproveVerification(selectedRequest.userId)}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5"
                                    >
                                        <CheckCircle size={16} />
                                        <span>✅ Approuver Niveau 2</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-8 text-center text-slate-400 rounded-3xl border border-dashed border-slate-200">
                                <Shield className="mx-auto text-slate-300 h-12 w-12 mb-3 animate-pulse" />
                                <h4 className="font-bold text-slate-700 text-sm">Examen de la demande</h4>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    Sélectionnez un membre dans le tableau ci-contre pour examiner son score biométrique IA, sa vidéo liveness et ses documents d'identité.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderModeration = () => {
        const openReports = reports.filter(r => r.status === 'OPEN');
        return (
            <div className="space-y-6 animate-in fade-in">
                <h2 className="text-xl font-bold text-slate-800">Modération</h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <tbody className="bg-white divide-y divide-slate-200">
                            {openReports.map(report => (<tr key={report.id}><td className="px-6 py-4">{report.reason}</td><td className="px-6 py-4 text-right space-x-2"><button onClick={() => dismissReport(report.id)} className="text-slate-400">Ignorer</button><button onClick={() => resolveReport(report.id)} className="text-emerald-600 font-bold">Résoudre</button></td></tr>))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderParishes = () => {
        const officialNamesSet = new Set(parishes.map(p => p.name.trim().toLowerCase()));

        // Regrouper les paroisses saisies librement par les utilisateurs
        const userParishCounts: Record<string, { count: number; sampleCity: string }> = {};
        users.forEach(u => {
            if (u.parish && u.parish.trim()) {
                const name = u.parish.trim();
                const key = name.toLowerCase();
                if (!officialNamesSet.has(key)) {
                    if (!userParishCounts[name]) {
                        userParishCounts[name] = { count: 0, sampleCity: 'Abidjan' };
                    }
                    userParishCounts[name].count += 1;
                }
            }
        });

        const suggestedParishes = Object.entries(userParishCounts).map(([name, data]) => ({
            name,
            count: data.count,
            city: data.sampleCity
        }));

        const handleValidateUserParish = async (pName: string, pCity: string, pCount: number) => {
            try {
                const { data, error } = await supabase.from('parishes').insert([{
                    name: pName,
                    city: pCity || 'Abidjan',
                    member_count: pCount
                }]).select();

                if (error) throw error;
                if (data && data[0]) {
                    setParishes(prev => [...prev, { id: data[0].id, name: data[0].name, city: data[0].city, memberCount: data[0].member_count }]);
                }
                alert(`L'église "${pName}" a été ajoutée à la liste officielle avec succès !`);
            } catch (e) {
                alert("Erreur lors de la validation de la paroisse");
            }
        };

        return (
            <div className="space-y-8 animate-in fade-in">
                {/* LISTE OFFICIELLE */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="text-left">
                            <h2 className="text-xl font-bold text-slate-800">Églises & Paroisses Officielles Certifiées</h2>
                            <p className="text-xs text-slate-500">Paroisses répertoriées proposées en priorité lors de l'inscription</p>
                        </div>
                        <button onClick={() => setIsParishModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center shadow-sm transition">
                            <PlusCircle size={16} className="mr-1.5" /> Ajouter manuellement
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nom de la Paroisse / Église</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ville</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Membres</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {parishes.map(parish => (
                                    <tr key={parish.id}>
                                        <td className="px-6 py-4 font-bold text-slate-800 text-sm text-left">{parish.name}</td>
                                        <td className="px-6 py-4 text-xs text-slate-600 text-left">{parish.city}</td>
                                        <td className="px-6 py-4 text-xs text-slate-600 text-left">
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                                {parish.memberCount || 0} membres
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => deleteParish(parish.id)} className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition" title="Supprimer">
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {parishes.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic text-xs">
                                            Aucune paroisse officielle enregistrée. Utilisez le bouton "Ajouter manuellement" ou validez les suggestions des membres ci-dessous.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* SUGGESTIONS DES MEMBRES */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                    <div className="flex justify-between items-center text-left">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="text-amber-500 h-5 w-5" />
                                Églises Saisies par les Membres (Suggestions Automatiques)
                            </h3>
                            <p className="text-xs text-slate-500">Églises ajoutées par les utilisateurs lors de l'inscription. Validez en 1 clic pour officialiser.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-amber-50/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Église Déclarée</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase">Membres Actifs</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-amber-900 uppercase">Action Admin</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {suggestedParishes.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="px-6 py-4 font-semibold text-slate-900 text-sm text-left">{item.name}</td>
                                        <td className="px-6 py-4 text-left">
                                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                                                👤 {item.count} membre{item.count > 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleValidateUserParish(item.name, item.city, item.count)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-xs flex items-center ml-auto"
                                            >
                                                <PlusCircle size={14} className="mr-1" /> Valider & Rendre Officielle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {suggestedParishes.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-6 text-center text-slate-400 italic text-xs">
                                            Aucune nouvelle église suggérée par les membres pour le moment.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderInterests = () => (
        <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center text-left">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Sparkles className="text-amber-500 h-6 w-6" />
                        Gestion des Centres d'Intérêt
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Gérez la liste des centres d'intérêt spirituels et de vie proposés aux membres lors de l'inscription et sur leur profil.
                    </p>
                </div>
                <button
                    onClick={handleResetInterestsToDefault}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                    🔄 Restaurer liste par défaut
                </button>
            </div>

            {/* FORMULAIRE D'AJOUT */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-left space-y-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Ajouter un nouveau centre d'intérêt</h3>
                <form onSubmit={handleAddInterest} className="flex gap-3">
                    <input
                        type="text"
                        value={newInterestInput}
                        onChange={(e) => setNewInterestInput(e.target.value)}
                        placeholder="Ex: 📜 Étude des Évangiles, 🎨 Peinture Sacrée..."
                        className="flex-1 p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <button
                        type="submit"
                        disabled={!newInterestInput.trim() || isSavingInterests}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        <PlusCircle size={18} /> Ajouter
                    </button>
                </form>
            </div>

            {/* LISTE DES CENTRES D'INTÉRÊT ACTIFS */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-left space-y-4">
                <div className="flex justify-between items-center border-b pb-3">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                        Centres d'intérêt actifs ({availableInterests.length})
                    </h3>
                    {isSavingInterests && (
                        <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <RefreshCw size={12} className="animate-spin" /> Enregistrement Supabase DB...
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                    {availableInterests.map((interest, idx) => (
                        <div
                            key={idx}
                            className="bg-slate-50 border border-slate-200/90 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 group hover:border-emerald-300 hover:bg-emerald-50/50 transition"
                        >
                            <span>{interest}</span>
                            <button
                                onClick={() => handleDeleteInterest(interest)}
                                className="text-slate-400 hover:text-red-600 transition p-0.5 rounded cursor-pointer"
                                title="Supprimer ce centre d'intérêt"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderEvents = () => (
        <div className="space-y-6 animate-in fade-in">
            {/* 🛠️ SPEED DATING SETTINGS FOR ADMIN */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-left">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            ✨ Soirées Virtuelles Chrétiennes (Config)
                        </h3>
                        <p className="text-slate-500 text-xs mt-1">
                            Activez/désactivez le speed dating hebdomadaire du jeudi et gérez les inscriptions de test.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePopulateAttendees}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold px-4 py-2 rounded-lg text-xs transition border border-amber-200"
                        >
                            💡 Inscrire tous les membres à la soirée (Test)
                        </button>
                        <button
                            onClick={() => handleToggleSpeedDate(!speedDateActive)}
                            className={`px-4 py-2 rounded-lg font-extrabold text-xs transition shadow-sm ${
                                speedDateActive
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                        >
                            {speedDateActive ? '✅ Activé' : '❌ Désactivé'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">Événements Paroissiaux</h2><button onClick={openCreateEventModal} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center"><PlusCircle size={20} className="mr-2" /> Ajouter</button></div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Titre</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th></tr></thead><tbody className="bg-white divide-y divide-slate-200">{events.map(event => (<tr key={event.id}><td className="px-6 py-4">{event.title}</td><td className="px-6 py-4">{new Date(event.date).toLocaleDateString()}</td><td className="px-6 py-4 text-right"><button onClick={() => openEditEventModal(event)} className="text-slate-400 mr-2"><Edit size={18} /></button><button onClick={() => deleteEvent(event.id)} className="text-red-600"><Trash2 size={18} /></button></td></tr>))}</tbody></table></div>
        </div>
    );

    const renderPriests = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800">Accompagnateurs Spirituels (Pasteurs / Prêtres)</h2>
                <button onClick={() => setIsPriestModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center shadow-md hover:bg-emerald-700 transition">
                    <PlusCircle size={20} className="mr-2" /> Ajouter
                </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nom</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Église / Paroisse</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Contact</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {priests.map(priest => (
                            <tr key={priest.id}>
                                <td className="px-6 py-4 font-medium text-slate-900">{priest.name}</td>
                                <td className="px-6 py-4 text-slate-600">{priest.parish}</td>
                                <td className="px-6 py-4 text-slate-600 font-mono">{priest.phone}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => setPriestToDelete(priest.id)} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {priests.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">Aucun contact enregistré.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSubscriptions = () => (
        <div className="space-y-8 animate-in fade-in text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Crown className="text-amber-500" />
                        Configuration des Abonnements, Points & Tarifs
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        Définissez les tarifs des abonnements Premium, les crédits Spotlight et les bonus de points membres.
                    </p>
                </div>
                <button
                    onClick={handleSavePointsConfig}
                    disabled={isSavingPointsConfig}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                    <Save size={16} />
                    <span>{isSavingPointsConfig ? 'Sauvegarde...' : 'Enregistrer la Config'}</span>
                </button>
            </div>

            {/* GRILLE DES REGLAGES DE TARIFS ET POINTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* BLOC 1 : ABONNEMENTS PREMIUM */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Sparkles className="text-amber-500" size={18} />
                        Tarifs des Formules Premium (FCFA)
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Abonnement Mensuel (1 Mois)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={pointsConfig.premiumMonthlyPrice}
                                    onChange={(e) => setPointsConfig({ ...pointsConfig, premiumMonthlyPrice: Number(e.target.value) })}
                                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-400">FCFA</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Abonnement Trimestriel (3 Mois)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={pointsConfig.premiumQuarterlyPrice}
                                    onChange={(e) => setPointsConfig({ ...pointsConfig, premiumQuarterlyPrice: Number(e.target.value) })}
                                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-400">FCFA</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOC 2 : SPOTLIGHT & CONVERSION */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Zap className="text-orange-500" size={18} />
                        Boost de Paroisse (Spotlight)
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Prix par Crédit Boost (Achat direct)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={pointsConfig.spotlightPriceFcfa}
                                    onChange={(e) => setPointsConfig({ ...pointsConfig, spotlightPriceFcfa: Number(e.target.value) })}
                                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-400">FCFA</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Équivalence en Points pour 1 Boost</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={pointsConfig.pointsPerSpotlight}
                                    onChange={(e) => setPointsConfig({ ...pointsConfig, pointsPerSpotlight: Number(e.target.value) })}
                                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-400">Points</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOC 3 : SYSTEME D'ATTRIBUTION DES POINTS */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 md:col-span-2">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                        <span>💎</span>
                        Règles d'Attribution Automatique des Points
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Connexion Quotidienne (Série de Foi)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={pointsConfig.pointsDailyStreak}
                                    onChange={(e) => setPointsConfig({ ...pointsConfig, pointsDailyStreak: Number(e.target.value) })}
                                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-400">pts / jour</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Vérification de Profil Réussie</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={pointsConfig.pointsVerification}
                                    onChange={(e) => setPointsConfig({ ...pointsConfig, pointsVerification: Number(e.target.value) })}
                                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-400">pts (Bonus)</span>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Parrainage d'un Membre</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={pointsConfig.pointsReferral}
                                    onChange={(e) => setPointsConfig({ ...pointsConfig, pointsReferral: Number(e.target.value) })}
                                    className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <span className="absolute right-3 top-2.5 text-xs font-extrabold text-slate-400">pts / ami</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CARD APERÇU OFFRES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col relative overflow-hidden">
                    <div className="mb-4"><h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest">Gratuit</h3><div className="mt-2 flex items-baseline"><span className="text-4xl font-extrabold text-slate-900">0</span><span className="ml-1 text-xl font-medium text-slate-500">FCFA / mois</span></div></div>
                    <ul className="space-y-4 mb-8 flex-1"><li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0" /><span className="text-slate-600 text-sm">Profil standard</span></li><li className="flex items-start"><Check className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0" /><span className="text-slate-600 text-sm">Forum & Prières</span></li></ul>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-500 p-8 flex flex-col relative overflow-hidden transform md:scale-105">
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Recommandé</div>
                    <div className="mb-4"><h3 className="text-lg font-bold text-emerald-600 uppercase tracking-widest">Premium</h3><div className="mt-2 flex items-baseline"><span className="text-4xl font-extrabold text-emerald-900">{pointsConfig.premiumMonthlyPrice}</span><span className="ml-1 text-xl font-medium text-emerald-700">FCFA / mois</span></div></div>
                    <ul className="space-y-4 mb-8 flex-1"><li className="flex items-start"><CheckCircle className="h-5 w-5 text-emerald-600 mr-2 flex-shrink-0" /><span className="text-slate-800 text-sm font-medium">Message Direct illimité</span></li><li className="flex items-start"><CheckCircle className="h-5 w-5 text-emerald-600 mr-2 flex-shrink-0" /><span className="text-slate-800 text-sm font-medium">Super Likes & Mode Invisible</span></li></ul>
                </div>
            </div>
        </div>
    );

    const renderOpenWA = () => (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 font-display flex items-center gap-2">
                        <MessageCircle className="text-emerald-600 h-7 w-7" />
                        Configuration WhatsApp API (OpenWA)
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">
                        Gérez l'envoi automatisé des codes de vérification par WhatsApp et configurez vos instances OpenWA.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Formulaire de Configuration */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                        <h3 className="font-bold text-slate-800 text-base">Paramètres du Serveur OpenWA</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={openwaConfig.enabled}
                                onChange={(e) => setOpenwaConfig({ ...openwaConfig, enabled: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            <span className="ml-2 text-xs font-bold text-slate-700">
                                {openwaConfig.enabled ? 'Service WhatsApp Actif' : 'Désactivé'}
                            </span>
                        </label>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                URL du Serveur API OpenWA
                            </label>
                            <input
                                type="url"
                                value={openwaConfig.apiUrl}
                                onChange={(e) => setOpenwaConfig({ ...openwaConfig, apiUrl: e.target.value })}
                                placeholder="https://api.openwa.dev ou http://votre-serveur:8080"
                                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Endpoint de l'API de votre instance OpenWA ou conteneur Docker.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Clé d'API / Secret Token
                                </label>
                                <input
                                    type="password"
                                    value={openwaConfig.apiKey}
                                    onChange={(e) => setOpenwaConfig({ ...openwaConfig, apiKey: e.target.value })}
                                    placeholder="Token secret (Optionnel)"
                                    className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                    Nom de Session / Instance Key
                                </label>
                                <input
                                    type="text"
                                    value={openwaConfig.sessionName}
                                    onChange={(e) => setOpenwaConfig({ ...openwaConfig, sessionName: e.target.value })}
                                    placeholder="225chretien_wa"
                                    className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Canal d'Inscription par Défaut
                            </label>
                            <select
                                value={openwaConfig.defaultChannel}
                                onChange={(e) => setOpenwaConfig({ ...openwaConfig, defaultChannel: e.target.value as any })}
                                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white text-slate-700 font-medium"
                            >
                                <option value="WHATSAPP">💬 WhatsApp d'abord (Recommandé Côte d'Ivoire)</option>
                                <option value="EMAIL">📩 Email d'abord</option>
                                <option value="BOTH">💬 & 📩 Choix libre par l'utilisateur</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Modèle de Message OTP (WhatsApp)
                            </label>
                            <textarea
                                value={openwaConfig.otpMessageTemplate}
                                onChange={(e) => setOpenwaConfig({ ...openwaConfig, otpMessageTemplate: e.target.value })}
                                rows={3}
                                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">Utilisez la balise <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">{"{{code}}"}</code> pour l'insertion dynamique du code à 6 chiffres.</p>
                        </div>

                        <button
                            onClick={async () => {
                                setIsSavingOpenWA(true);
                                const ok = await saveOpenWAConfig(openwaConfig);
                                setIsSavingOpenWA(false);
                                if (ok) alert('Configuration OpenWA enregistrée avec succès !');
                                else alert('Erreur lors de la sauvegarde de la configuration.');
                            }}
                            disabled={isSavingOpenWA}
                            className="w-full btn-emerald-primary py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
                        >
                            <Save size={18} />
                            {isSavingOpenWA ? 'Enregistrement...' : 'Sauvegarder les Paramètres OpenWA'}
                        </button>
                    </div>
                </div>

                {/* Outil de Test Direct WhatsApp */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                            <Send size={18} className="text-emerald-600" />
                            Tester l'API WhatsApp (Envoi Test)
                        </h3>
                        <p className="text-slate-500 text-xs mt-1">
                            Envoyez un message WhatsApp de test à un numéro réel pour vérifier l'état du serveur OpenWA.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                Numéro du destinataire de test
                            </label>
                            <input
                                type="tel"
                                value={testPhone}
                                onChange={(e) => setTestPhone(e.target.value)}
                                placeholder="Ex: 07 00 00 00 00 ou 2250700000000"
                                className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                            />
                        </div>

                        <button
                            onClick={async () => {
                                if (!testPhone) return alert('Veuillez saisir un numéro de téléphone.');
                                setIsTestingOpenWA(true);
                                setTestResult(null);
                                const res = await testOpenWAConnection(testPhone, openwaConfig);
                                setIsTestingOpenWA(false);
                                setTestResult(res);
                            }}
                            disabled={isTestingOpenWA || !testPhone}
                            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                            {isTestingOpenWA ? <RefreshCw className="animate-spin h-4 w-4" /> : <Send size={16} />}
                            {isTestingOpenWA ? 'Envoi en cours...' : 'Envoyer un Message Test WhatsApp'}
                        </button>

                        {testResult && (
                            <div className={`p-4 rounded-xl text-xs font-semibold border ${testResult.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                <div className="font-bold mb-1 flex items-center gap-1.5">
                                    {testResult.success ? '✅ Envoi réussi !' : '❌ Échec du test'}
                                </div>
                                <p className="leading-relaxed font-normal">{testResult.message}</p>
                            </div>
                        )}

                        {/* Moniteur de la File d'Attente WhatsApp (Queue Monitor) */}
                        <div className="border-t border-slate-100 pt-5 mt-5">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <RefreshCw size={14} className="text-emerald-600" />
                                    File d'attente des messages (Queue Monitor)
                                </h4>
                                <button
                                    onClick={() => whatsAppQueue.clearCompleted()}
                                    className="text-[11px] text-slate-500 hover:text-slate-700 underline font-medium"
                                >
                                    Nettoyer
                                </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                                    <span className="block font-extrabold text-slate-700 text-base">{queueStats.pending}</span>
                                    <span className="text-[10px] text-slate-500 font-medium">En attente</span>
                                </div>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                                    <span className="block font-extrabold text-amber-700 text-base">{queueStats.processing}</span>
                                    <span className="text-[10px] text-amber-600 font-medium">En cours</span>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                                    <span className="block font-extrabold text-emerald-700 text-base">{queueStats.success}</span>
                                    <span className="text-[10px] text-emerald-600 font-medium">Envoyés</span>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                                    <span className="block font-extrabold text-red-700 text-base">{queueStats.failed}</span>
                                    <span className="text-[10px] text-red-600 font-medium">Échecs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const SidebarItem = ({ id, label, icon: Icon, active, onClick }: any) => (
        <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1 ${active ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <Icon size={20} /><span className="font-medium">{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-100 flex">
            <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col fixed h-full z-50">
                <div className="p-6 flex items-center space-x-3 border-b border-slate-800"><div className="bg-emerald-500 p-2 rounded-lg"><Shield className="text-white h-6 w-6" /></div><div><h1 className="font-bold text-lg tracking-tight">225 Admin</h1></div></div>
                <nav className="flex-1 p-4 overflow-y-auto">
                    <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 mt-2">Menu Principal</p>
                    <SidebarItem id="STATS" label="Vue d'ensemble" icon={LayoutDashboard} active={activeTab === DashboardTab.STATS} onClick={() => setActiveTab(DashboardTab.STATS)} />
                    <SidebarItem id="GLOBAL_CONFIG" label="Configuration Globale" icon={Settings} active={activeTab === DashboardTab.GLOBAL_CONFIG} onClick={() => setActiveTab(DashboardTab.GLOBAL_CONFIG)} />
                    <SidebarItem id="USERS" label="Utilisateurs" icon={Users} active={activeTab === DashboardTab.USERS} onClick={() => setActiveTab(DashboardTab.USERS)} />
                    <SidebarItem id="PRIESTS" label="Accompagnateurs" icon={Phone} active={activeTab === DashboardTab.PRIESTS} onClick={() => setActiveTab(DashboardTab.PRIESTS)} />
                    <SidebarItem id="PAYMENTS" label="Paiements & Finance" icon={DollarSign} active={activeTab === DashboardTab.PAYMENTS} onClick={() => setActiveTab(DashboardTab.PAYMENTS)} />
                    <SidebarItem id="EVENTS" label="Événements" icon={Calendar} active={activeTab === DashboardTab.EVENTS} onClick={() => setActiveTab(DashboardTab.EVENTS)} />
                    <SidebarItem id="VERIFICATION" label="Vérifications" icon={UserCheck} active={activeTab === DashboardTab.VERIFICATION} onClick={() => setActiveTab(DashboardTab.VERIFICATION)} />
                    <SidebarItem id="AMBASSADEURS" label="Ambassadeurs & Badges" icon={Shield} active={activeTab === 'AMBASSADEURS'} onClick={() => setActiveTab('AMBASSADEURS')} />
                    <SidebarItem id="MODERATION" label="Modération" icon={Flag} active={activeTab === DashboardTab.MODERATION} onClick={() => setActiveTab(DashboardTab.MODERATION)} />
                    <SidebarItem id="PARISHES" label="Églises & Paroisses" icon={MapPin} active={activeTab === DashboardTab.PARISHES} onClick={() => setActiveTab(DashboardTab.PARISHES)} />
                    <SidebarItem id={DashboardTab.INTERESTS} label="Centres d'intérêt" icon={Sparkles} active={activeTab === DashboardTab.INTERESTS} onClick={() => setActiveTab(DashboardTab.INTERESTS)} />
                    <SidebarItem id="SUBSCRIPTIONS" label="Abonnements" icon={CreditCard} active={activeTab === DashboardTab.SUBSCRIPTIONS} onClick={() => setActiveTab(DashboardTab.SUBSCRIPTIONS)} />
                    <SidebarItem id="OPENWA" label="WhatsApp & OpenWA" icon={MessageCircle} active={activeTab === 'OPENWA'} onClick={() => setActiveTab('OPENWA')} />
                </nav>
                <div className="p-4 border-t border-slate-800"><button onClick={onLogout} className="flex items-center text-slate-400 hover:text-white text-sm font-medium w-full px-4 py-2 hover:bg-slate-800 rounded-lg transition"><LogOut size={18} className="mr-3" /> Déconnexion</button></div>
            </aside>

            <main className="flex-1 md:ml-64 p-8">
                {activeTab === DashboardTab.STATS && renderStats()}
                {activeTab === DashboardTab.GLOBAL_CONFIG && renderGlobalConfig()}
                {activeTab === DashboardTab.USERS && renderUsers()}
                {activeTab === DashboardTab.EVENTS && renderEvents()}
                {activeTab === DashboardTab.PRIESTS && renderPriests()}
                {activeTab === DashboardTab.VERIFICATION && renderVerifications()}
                {activeTab === 'AMBASSADEURS' && renderAmbassadeurs()}
                {activeTab === DashboardTab.MODERATION && renderModeration()}
                {activeTab === DashboardTab.PARISHES && renderParishes()}
                {activeTab === DashboardTab.INTERESTS && renderInterests()}
                {activeTab === DashboardTab.SUBSCRIPTIONS && renderSubscriptions()}
                {activeTab === DashboardTab.PAYMENTS && renderPayments()}
                {activeTab === 'OPENWA' && renderOpenWA()}
            </main>

            {/* Modal Events */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsEventModalOpen(false)} /><div className="bg-white rounded-xl shadow-xl w-full max-w-lg relative z-10 p-6 animate-in zoom-in-95"><h3 className="text-xl font-bold mb-4">{editingEventId ? 'Modifier l\'événement' : 'Nouvel événement'}</h3><form onSubmit={handleSaveEvent} className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Titre</label><input type="text" required value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Date & Heure</label><input type="datetime-local" required value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Lieu</label><input type="text" required value={newEvent.location} onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" /></div></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea required value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" rows={3} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Lien d'inscription (Optionnel)</label><input type="url" value={newEvent.link} onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" placeholder="https://..." /></div><div className="flex justify-end space-x-3 mt-4"><button type="button" onClick={() => setIsEventModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button><button type="submit" className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg">Enregistrer</button></div></form></div></div>
            )}
            {/* Modal Paroisses */}
            {isParishModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsParishModalOpen(false)} /><div className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-10 p-6 animate-in zoom-in-95"><h3 className="text-xl font-bold mb-4">Ajouter une église / paroisse</h3><form onSubmit={handleAddParish} className="space-y-4"><div><label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'église / paroisse</label><input type="text" required value={newParish.name} onChange={(e) => setNewParish({ ...newParish, name: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" placeholder="Ex: St Jean ou AD Yopougon" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Ville / Commune</label><input type="text" required value={newParish.city} onChange={(e) => setNewParish({ ...newParish, city: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" placeholder="Ex: Cocody" /></div><div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre de membres (Est.)</label><input type="number" value={newParish.count} onChange={(e) => setNewParish({ ...newParish, count: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" placeholder="0" /></div><div className="flex justify-end space-x-3 mt-4"><button type="button" onClick={() => setIsParishModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button><button type="submit" className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg">Ajouter</button></div></form></div></div>
            )}
            {/* Modal Prêtres */}
            {isPriestModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsPriestModalOpen(false)} />
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative z-10 p-6 animate-in zoom-in-95">
                         <h3 className="text-xl font-bold mb-4">Nouvel Accompagnateur Spirituel</h3>
                         <form onSubmit={handleAddPriest} className="space-y-4">
                             <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'accompagnateur</label>
                                 <input type="text" required value={newPriest.name} onChange={(e) => setNewPriest({ ...newPriest, name: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" placeholder="Ex: Pasteur Konan, Père André" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Église / Paroisse de rattachement</label>
                                 <input type="text" value={newPriest.parish} onChange={(e) => setNewPriest({ ...newPriest, parish: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" placeholder="Ex: AD Yopougon Est, St Jean de Cocody" />
                             </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Numéro de téléphone</label>
                                <input type="tel" required value={newPriest.phone} onChange={(e) => setNewPriest({ ...newPriest, phone: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2" placeholder="Ex: 07 00 00 00 00" />
                            </div>
                            <div className="flex justify-end space-x-3 mt-4">
                                <button type="button" onClick={() => setIsPriestModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Confirmation Suppression Prêtre */}
            {priestToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setPriestToDelete(null)} />
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95">
                        <div className="text-center">
                            <div className="bg-red-100 p-3 rounded-full inline-flex mb-4">
                                <Trash2 className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Supprimer ce contact ?</h3>
                            <p className="text-slate-500 text-sm mb-6">Cette action est irréversible.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setPriestToDelete(null)} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition">Non</button>
                                <button onClick={confirmDeletePriest} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">Oui, supprimer</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SidebarItem = ({ id, label, icon: Icon, active, onClick }: any) => (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1 ${active ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
        <Icon size={20} /><span className="font-medium">{label}</span>
    </button>
);
