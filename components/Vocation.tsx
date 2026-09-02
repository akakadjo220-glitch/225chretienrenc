import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, FileText, Mic, X, Phone, MapPin, User, AlertCircle, 
  Heart, Cross, Globe, Calendar, CheckCircle2, ChevronDown, ChevronUp, 
  BookOpen, Clock, Save, Send, MessageCircle, ArrowRight, 
  Check, Search, ShieldCheck, HeartHandshake, HelpCircle, Volume2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { PriestContact } from '../types';

// Structure des parcours de vocation avec contenus réels et interactifs
export interface VocationStep {
  id: string;
  title: string;
  scripture: string;
  content: string;
  reflectionQuestion: string;
  prayer: string;
}

export interface VocationTrackData {
  key: 'MARIAGE' | 'MINISTERE' | 'MISSION';
  icon: string;
  label: string;
  description: string;
  color: string;
  badgeColor: string;
  lightColor: string;
  steps: VocationStep[];
}

const VOCATION_TRACKS: VocationTrackData[] = [
  {
    key: 'MARIAGE',
    icon: '💍',
    label: 'Mariage & Foyer Chrétien',
    description: "Discerner l'appel au mariage saint, bâtir un amour durable fondé sur le Christ et la foi commune.",
    color: 'from-rose-500 to-pink-600',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    lightColor: 'bg-rose-50 text-rose-700',
    steps: [
      {
        id: 'm1',
        title: '1. Les Fondements Bibliques de l\'Alliance',
        scripture: '« C\'est pourquoi l\'homme quittera son père et sa mère, et s\'attachera à sa femme, et ils deviendront une seule chair. » — Genèse 2:24',
        content: 'Le mariage chrétien n\'est pas un simple contrat humain, mais un sacrement et une alliance sainte devant Dieu. Il engage deux personnes à s\'aimer d\'un amour inconditionnel, à l\'image du sacrifice du Christ pour Son Église (Éphésiens 5:25). La préparation du cœur est la première pierre de cette construction.',
        reflectionQuestion: 'Quelles sont vos motivations profondes pour le mariage ? Êtes-vous prêt(e) à placer le Seigneur au centre de vos décisions de couple ?',
        prayer: 'Seigneur Jésus, purifie mon cœur et accorde-moi la sagesse pour discerner le mariage saint selon Ta sainte volonté. Amen.'
      },
      {
        id: 'm2',
        title: '2. Communication, Pardon & Résolution des Tempêtes',
        scripture: '« Que le soleil ne se couche pas sur votre colère. » — Éphésiens 4:26',
        content: 'Tout couple traverse des incompréhensions et des épreuves. La force d\'un couple chrétien réside dans sa capacité à écouter avec humilité, à exprimer ses blessures sans mépris et à accorder un pardon prompt et sincère. Le dialogue quotidien sous le regard de Dieu désamorce les conflits avant qu\'ils ne s\'enracinent.',
        reflectionQuestion: 'Comment gérez-vous les désaccords ? Êtes-vous prompt(e) à demander pardon et à accorder votre grâce ?',
        prayer: 'Père Céleste, donne-moi un esprit d\'écoute, d\'humilité et de bienveillance pour bâtir une relation empreinte de douceur. Amen.'
      },
      {
        id: 'm3',
        title: '3. Finances, Foyer & Gestion de la Belle-Famille',
        scripture: '« Recommande à l\'Éternel tes œuvres, et tes projets réussiront. » — Proverbes 16:3',
        content: 'La gestion transparente de l\'argent, la planification du budget familial et le respect bienveillant mais équilibré de la belle-famille (tout en préservant l\'autonomie du nouveau foyer) sont indispensables pour protéger la paix conjugale et prospérer dans la grâce.',
        reflectionQuestion: 'Avez-vous une vision claire de la gestion financière commune et des limites saines à poser avec respect ?',
        prayer: 'Seigneur, bénis nos projets matériels et donne-nous la sagesse financière pour être de fidèles intendants de Tes dons. Amen.'
      }
    ]
  },
  {
    key: 'MINISTERE',
    icon: '⛪',
    label: 'Ministère Pastoral & Sacerdoce',
    description: "Explorer l'appel au service de Dieu, au pastorat, à la prêtrise ou au ministère de louange et d'enseignement.",
    color: 'from-indigo-600 to-purple-700',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    lightColor: 'bg-indigo-50 text-indigo-700',
    steps: [
      {
        id: 's1',
        title: '1. Reconnaître l\'Appel Intérieur',
        scripture: '« Parle, Seigneur, car ton serviteur écoute. » — 1 Samuel 3:9',
        content: 'La vocation au ministère pastoral ou consacré naît souvent d\'un désir profond de servir Dieu, d\'une soif pour Sa Parole et d\'une compassion ardente pour les âmes. Elle requiert une écoute attentive dans le silence de la prière et la confirmation par l\'Église.',
        reflectionQuestion: 'Ressentez-vous une soif constante de consacrer votre temps et vos dons au service de l\'Évangile ?',
        prayer: 'Seigneur, rends mes oreilles attentives à Ta voix et dispose mon cœur à Te suivre sans réserve. Amen.'
      },
      {
        id: 's2',
        title: '2. Sanctification & Vie de Prière Continue',
        scripture: '« Soyez saints, car je suis saint. » — 1 Pierre 1:16',
        content: 'Le serviteur de Dieu ne peut donner que ce qu\'il reçoit dans l\'intimité de la prière. La régularité de la méditation biblique, l\'humilité face aux louanges et la fidélité dans le secret sont les piliers d\'un ministère fécond.',
        reflectionQuestion: 'Quelle place accordez-vous à la prière personnelle quotidienne en dehors des assemblées publiques ?',
        prayer: 'Saint-Esprit, sanctifie mes pensées, fortifie ma discipline spirituelle et garde-moi dans la pureté. Amen.'
      }
    ]
  },
  {
    key: 'MISSION',
    icon: '🤝',
    label: 'Mission & Engagement Chrétien',
    description: "L'appel au témoignage chrétien dans la société, aux œuvres de charité fraternelle et au service communautaire.",
    color: 'from-emerald-600 to-teal-700',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    lightColor: 'bg-emerald-50 text-emerald-700',
    steps: [
      {
        id: 'mis1',
        title: '1. Être Témoin du Christ au Quotidien',
        scripture: '« Vous êtes la lumière du monde et le sel de la terre. » — Matthieu 5:13-14',
        content: 'Le premier champ de mission est notre lieu de travail, notre famille et notre quartier. Témoigner ne se limite pas aux paroles : c\'est vivre avec intégrité, excellence professionnelle, honnêteté et amour fraternel au milieu des défis du monde.',
        reflectionQuestion: 'Comment votre foi chrétienne se manifeste-t-elle concrètement dans vos relations professionnelles et sociales ?',
        prayer: 'Seigneur, fais de moi un instrument de Ta paix et un reflet fidèle de Ton amour auprès de ceux qui me côtoient. Amen.'
      },
      {
        id: 'mis2',
        title: '2. La Diaconie & Les Œuvres de Miséricorde',
        scripture: '« Toutes les fois que vous avez fait ces choses à l\'un de ces plus petits de mes frères, c\'est à moi que vous les avez faites. » — Matthieu 25:40',
        content: 'Prendre soin des orphelins, visiter les malades, soutenir les personnes vulnérables et s\'engager dans les actions sociales de l\'église locale donne une dimension concrète à notre profession de foi.',
        reflectionQuestion: 'À quelle action caritative ou service paroissial pouvez-vous consacrer du temps ce mois-ci ?',
        prayer: 'Père, accorde-moi un cœur compatissant et généreux pour servir les plus démunis au nom du Christ. Amen.'
      }
    ]
  }
];

// Livrets de réflexion conjugale (Worksheets réels avec persistence)
const WORKSHEETS = [
  {
    id: 1,
    title: "Livret 1 : Vision & Valeurs Spirituelles",
    icon: "🙏",
    description: "Discerner ensemble votre vie spirituelle, vos traditions et la place du Christ au centre de votre futur foyer.",
    questions: [
      {
        key: "w1_q1",
        label: "Comment envisagez-vous la prière en couple au quotidien et la fréquentation de l'église ?",
        placeholder: "Partagez vos attentes concernant le rythme de prière, le culte en famille et la participation à la vie paroissiale..."
      },
      {
        key: "w1_q2",
        label: "Quelles sont les valeurs spirituelles non négociables que vous souhaitez transmettre à vos enfants ?",
        placeholder: "Baptême, éducation religieuse, foi personnelle, charité fraternelle..."
      },
      {
        key: "w1_q3",
        label: "En cas de dénominations chrétiennes différentes (ex: Catholique et Évangélique), comment comptez-vous vivre l'harmonie ?",
        placeholder: "Quel culte choisir le dimanche, quelle paroisse, comment respecter mutuellement la sensibilité de chacun..."
      }
    ]
  },
  {
    id: 2,
    title: "Livret 2 : Communication & Résolution de conflits",
    icon: "💬",
    description: "Bâtir des outils de dialogue sains pour traverser sereinement les inévitables tempêtes de la vie de couple.",
    questions: [
      {
        key: "w2_q1",
        label: "Quel est votre mode habituel de réaction face au conflit (silence, colère, discussion immédiate) ?",
        placeholder: "Analysez vos réactions sous pression et comment votre futur conjoint peut vous aider à dialoguer dans la paix..."
      },
      {
        key: "w2_q2",
        label: "Comment comptez-vous préserver l'intimité et l'autonomie de votre couple face aux pressions extérieures ?",
        placeholder: "Poser des limites saines avec la belle-famille avec respect et amour, conformément à la Parole de Dieu..."
      },
      {
        key: "w2_q3",
        label: "Quelles règles d'or de communication souhaitez-vous instaurer en cas de désaccord majeur ?",
        placeholder: "Ex: ne jamais se coucher sur une colère, prier ensemble avant de trancher, parler avec douceur sans hausser le ton..."
      }
    ]
  },
  {
    id: 3,
    title: "Livret 3 : Finances, Foyer & Dot Traditionnelle",
    icon: "💍",
    description: "S'accorder sur les sujets concrets : argent, travail, dot culturelle et projets à long terme.",
    questions: [
      {
        key: "w3_q1",
        label: "Comment envisagez-vous la gestion financière et la répartition des dépenses du ménage ?",
        placeholder: "Compte commun, comptes séparés avec partage équitable, épargne pour les projets d'avenir..."
      },
      {
        key: "w3_q2",
        label: "Comment appréhendez-vous la dot traditionnelle par rapport à vos valeurs chrétiennes et capacités ?",
        placeholder: "Discutez du poids de la dot culturelle et de la manière de la préparer avec sagesse et modération..."
      },
      {
        key: "w3_q3",
        label: "Quels sont vos projets professionnels respectifs et comment influencent-ils votre vision du foyer ?",
        placeholder: "Conciliation carrière et vie de famille, soutien mutuel dans les études et promotions..."
      }
    ]
  }
];

// Bibliothèque de ressources spirituelles réelles
const REAL_VOCATION_RESOURCES = [
  {
    id: 'res-1',
    title: "Les 5 Piliers d'un Foyer Chrétien Épanoui",
    type: 'ARTICLE' as const,
    category: 'MARIAGE',
    author: 'Père Jean-Marc KOFFI',
    duration: '6 min de lecture',
    content: `Le mariage chrétien est une œuvre divine qui nécessite un entretien quotidien. Voici les 5 piliers éprouvés :
1. **La Prière Commune** : Prier ensemble au quotidien scelle l'unité spirituelle. Un couple qui prie ensemble traverse les épreuves avec foi.
2. **Le Pardon Quotidien** : Ne laissez jamais l'amertume s'installer. Pardonner n'est pas oublier, c'est choisir de faire grâce comme le Christ nous a fait grâce.
3. **La Transparence Financière** : L'argent est une source fréquente de tensions. La transparence totale bâtit la confiance.
4. **La Bénédiction des Paroles** : Vos mots ont le pouvoir de construire ou de détruire. Choisissez la valorisation et les encouragements mutuels.
5. **Le Service Commun** : Avoir un projet chrétien partagé (visite aux démunis, chorale, accueil fraternel) nourrit la fécondité du couple.`
  },
  {
    id: 'res-2',
    title: "Comment Connaître la Volonté de Dieu pour ma Vocation ?",
    type: 'ARTICLE' as const,
    category: 'MINISTERE',
    author: 'Pasteur Samuel YAO',
    duration: '8 min de lecture',
    content: `Discerner la volonté de Dieu ne relève pas de la magie, mais d'une marche spirituelle structurée en 4 étapes :
1. **La Paix du Cœur (Philippiens 4:7)** : La paix divine dépasse toute intelligence et confirme les orientations justes.
2. **L'Accord avec les Écritures** : Dieu ne vous demandera jamais ce qui contredit Sa Sainte Parole.
3. **Le Conseil Spirituel Éclairé (Proverbes 15:22)** : Partagez vos pensées avec un pasteur, prêtre ou mentor mature.
4. **Les Portes Ouvertes Providentielles** : Observez comment le Seigneur dispose les circonstances avec harmonie.`
  },
  {
    id: 'res-3',
    title: "Méditation Audio : Consécration & Discernement",
    type: 'PODCAST' as const,
    category: 'MISSION',
    author: 'Sœur Marie-Thérèse D.',
    duration: '12 min d\'écoute',
    content: `Méditation guidée sur le Psaume 139 : « Sonde-moi, ô Dieu, et connais mon cœur ! Éprouve-moi, et connais mes pensées ! »
Prenez ce moment de calme pour remettre vos projets affectifs, professionnels et vocationnels entre les mains du Père Céleste.`
  }
];

export const Vocation: React.FC = () => {
  const [activeModal, setActiveModal] = useState<'NONE' | 'CONTACT' | 'TRACK_DETAILS' | 'RESOURCE' | 'REQUEST_MENTOR'>('NONE');
  const [selectedResource, setSelectedResource] = useState<typeof REAL_VOCATION_RESOURCES[0] | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<VocationTrackData | null>(null);
  
  // Contacts Prêtres / Pasteurs
  const [priests, setPriests] = useState<PriestContact[]>([]);
  const [loadingPriests, setLoadingPriests] = useState(false);
  const [priestSearch, setPriestSearch] = useState('');
  const [priestError, setPriestError] = useState<string | null>(null);

  // Mentorat & Carnet de Route Réels
  const [mentorshipData, setMentorshipData] = useState<any>(null);
  const [journalNotes, setJournalNotes] = useState<Record<string, string>>({});
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [expandedWorksheet, setExpandedWorksheet] = useState<number | null>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Formulaire Demande d'Accompagnement
  const [mentorFormTarget, setMentorFormTarget] = useState<PriestContact | null>(null);
  const [mentorTopic, setMentorTopic] = useState('MARRIAGE_PREP');
  const [mentorNotes, setMentorNotes] = useState('');
  const [isSubmittingMentor, setIsSubmittingMentor] = useState(false);

  // 1. Charger les données utilisateur & mentorat depuis Supabase
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          // Charger mentorat
          const { data: mentorSetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', `mentorship_${session.user.id}`)
            .maybeSingle();

          if (mentorSetting?.value) {
            setMentorshipData(mentorSetting.value.request || null);
          }

          // Charger carnet de route (journal)
          const { data: journalSetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', `vocation_journal_${session.user.id}`)
            .maybeSingle();

          if (journalSetting?.value) {
            setJournalNotes(journalSetting.value || {});
          }

          // Charger progression des parcours
          const { data: progressSetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', `vocation_progress_${session.user.id}`)
            .maybeSingle();

          if (progressSetting?.value?.completed) {
            setCompletedSteps(progressSetting.value.completed || []);
          }
        } catch (e) {
          console.error("Erreur chargement données vocation:", e);
        }
      }
    };
    loadUserData();
  }, []);

  // 2. Charger les accompagnateurs spirituels réels
  const loadPriests = async () => {
    setLoadingPriests(true);
    setPriestError(null);
    try {
      const { data: result, error } = await supabase
        .from('priest_contacts')
        .select('*')
        .order('name');

      if (error) throw error;
      setPriests((result || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        parish: p.parish,
        phone: p.phone,
        availability: p.availability
      })));
    } catch (e: any) {
      console.error("Erreur chargement accompagnateurs:", e);
      setPriestError("Impossible de charger le répertoire pastoral.");
    } finally {
      setLoadingPriests(false);
    }
  };

  useEffect(() => {
    if (activeModal === 'CONTACT' || activeModal === 'REQUEST_MENTOR') {
      loadPriests();
    }
  }, [activeModal]);

  // 3. Valider / Dévalider une étape de parcours
  const toggleStepCompletion = async (stepId: string) => {
    const isCompleted = completedSteps.includes(stepId);
    const updated = isCompleted 
      ? completedSteps.filter(id => id !== stepId) 
      : [...completedSteps, stepId];

    setCompletedSteps(updated);

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        await supabase.from('system_settings').upsert({
          key: `vocation_progress_${session.user.id}`,
          value: { completed: updated },
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (!isCompleted) {
          showToast("✓ Étape validée avec succès ! Que Dieu bénisse votre marche.");
        }
      } catch (e) {
        console.error("Erreur sauvegarde progression:", e);
      }
    }
  };

  // 4. Enregistrer une note dans le carnet de route
  const handleSaveJournalNote = async (key: string, value: string) => {
    setSavingKey(key);
    const updated = {
      ...journalNotes,
      [key]: value
    };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        await supabase.from('system_settings').upsert({
          key: `vocation_journal_${session.user.id}`,
          value: updated,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        setJournalNotes(updated);
        showToast("💾 Vos réflexions ont été enregistrées dans votre Carnet de Route.");
      } catch (e) {
        console.error("Erreur sauvegarde journal:", e);
      } finally {
        setSavingKey(null);
      }
    } else {
      setSavingKey(null);
      alert("Veuillez vous connecter pour enregistrer vos réflexions.");
    }
  };

  // 5. Soumettre une demande d'accompagnement spirituel réel
  const handleSubmitMentorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mentorFormTarget) {
      alert("Veuillez sélectionner un accompagnateur.");
      return;
    }

    setIsSubmittingMentor(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      alert("Veuillez vous connecter pour initier une demande d'accompagnement.");
      setIsSubmittingMentor(false);
      return;
    }

    try {
      const newRequest = {
        id: `mentor-req-${Date.now()}`,
        userId: session.user.id,
        mentorId: mentorFormTarget.id,
        mentorName: mentorFormTarget.name,
        mentorParish: mentorFormTarget.parish,
        mentorPhone: mentorFormTarget.phone,
        topic: mentorTopic,
        notes: mentorNotes.trim(),
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        meetings: [
          {
            id: 'meet-initial',
            title: 'Premier Entretien de Discernement',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            availability: mentorFormTarget.availability
          }
        ]
      };

      await supabase.from('system_settings').upsert({
        key: `mentorship_${session.user.id}`,
        value: { request: newRequest },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      setMentorshipData(newRequest);
      setActiveModal('NONE');
      setMentorNotes('');
      showToast("🕊️ Votre demande d'accompagnement a été enregistrée avec succès !");
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement : " + (err.message || "Problème réseau"));
    } finally {
      setIsSubmittingMentor(false);
    }
  };

  // 6. Arrêter / Réinitialiser l'accompagnement
  const handleCancelMentorship = async () => {
    if (window.confirm("Êtes-vous sûr de vouloir clore cet accompagnement spirituel ? Vos notes de carnet seront conservées.")) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          await supabase.from('system_settings').upsert({
            key: `mentorship_${session.user.id}`,
            value: { request: null },
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
        } catch (e) {}
      }
      setMentorshipData(null);
      showToast("Accompagnement spirituel clôturé.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredPriests = priests.filter(p => 
    p.name.toLowerCase().includes(priestSearch.toLowerCase()) || 
    p.parish.toLowerCase().includes(priestSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      
      {/* TOAST DE FEEDBACK */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
          <span className="text-xs sm:text-sm font-extrabold">{toastMessage}</span>
        </div>
      )}

      {/* HERO BANNER - VOCATION CHRÉTIENNE */}
      <div className="bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 md:p-8 shadow-xl relative overflow-hidden border border-emerald-800/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-3.5 py-1 rounded-full text-emerald-200 font-extrabold text-xs uppercase tracking-wider">
            <Cross size={13} className="text-amber-300" />
            <span>Discernement Vocationnel</span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight font-display">
            Discernez l'Appel de Dieu pour Votre Vie 🙏
          </h2>

          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed font-medium">
            "Car c'est Dieu qui produit en vous le vouloir et le faire, selon son bon plaisir." — <em>Philippiens 2:13</em>. 
            Découvrez nos parcours d'enseignement, notre carnet de route pour le mariage et le répertoire pastoral d'accompagnement spirituel.
          </p>

          <div className="pt-2 flex flex-wrap gap-2.5">
            <button
              onClick={() => {
                setSelectedTrack(VOCATION_TRACKS[0]);
                setActiveModal('TRACK_DETAILS');
              }}
              className="bg-amber-400 hover:bg-amber-300 text-emerald-950 px-4 py-2.5 rounded-xl font-black text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer transform active:scale-95"
            >
              <span>💍</span>
              <span>Parcours Mariage Chrétien</span>
            </button>

            <button
              onClick={() => setActiveModal('CONTACT')}
              className="bg-white/15 hover:bg-white/25 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-xs transition backdrop-blur-md flex items-center gap-1.5 cursor-pointer transform active:scale-95"
            >
              <User size={14} className="text-emerald-300" />
              <span>Contacter un Pasteur / Prêtre</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION ACCOMPAGNEMENT SPIRITUEL & MENTORAT CONJUGAL */}
      {!mentorshipData ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl shrink-0 border border-emerald-200">
                🤝
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-display">
                  Accompagnement Spirituel & Parrainage Conjugal
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                  Bâtissez votre discernement avec l'aide d'un prêtre, pasteur ou conseiller conjugal certifié. Bénéficiez d'une écoute bienveillante, de conseils spirituels et d'un suivi personnalisé.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setMentorFormTarget(priests[0] || null);
                setActiveModal('REQUEST_MENTOR');
              }}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-4 py-3 rounded-2xl transition shadow-sm flex items-center gap-2 cursor-pointer transform active:scale-95 whitespace-nowrap self-stretch md:self-auto justify-center"
            >
              <HeartHandshake size={16} />
              <span>Demander un Accompagnement</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xl shrink-0">
                🤝
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Accompagnement Spirituel Actif
                  </h4>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Actif
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Accompagnateur : <strong className="text-slate-800">{mentorshipData.mentorName}</strong> ({mentorshipData.mentorParish})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <a
                href={`tel:${mentorshipData.mentorPhone}`}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-emerald-200"
              >
                <Phone size={13} />
                <span>Appeler ({mentorshipData.mentorPhone})</span>
              </a>
              <button
                onClick={handleCancelMentorship}
                className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition text-xs font-bold cursor-pointer"
                title="Arrêter l'accompagnement"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Rendez-vous & Séance */}
          {mentorshipData.meetings && mentorshipData.meetings.length > 0 && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-900">{mentorshipData.meetings[0].title}</p>
                  <p className="text-[11px] text-slate-500">
                    Disponibilité : {mentorshipData.meetings[0].availability || 'Sur rendez-vous pastoral'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl">
                À planifier directement avec votre guide
              </span>
            </div>
          )}
        </div>
      )}

      {/* LES 3 PARCOURS DE VOCATION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-display flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-600" />
            <span>Parcours d'Enseignement & Discernement</span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {VOCATION_TRACKS.map(track => {
            const completedInTrack = track.steps.filter(s => completedSteps.includes(s.id)).length;
            const progressPercent = Math.round((completedInTrack / track.steps.length) * 100);

            return (
              <div
                key={track.key}
                onClick={() => {
                  setSelectedTrack(track);
                  setActiveModal('TRACK_DETAILS');
                }}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-emerald-300 transition flex flex-col justify-between space-y-4 cursor-pointer group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${track.lightColor} border border-slate-100 group-hover:scale-105 transition-transform`}>
                      {track.icon}
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${track.badgeColor}`}>
                      {track.steps.length} Étapes
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
                      {track.label}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {track.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>Progression</span>
                    <span className="text-emerald-700">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-extrabold text-emerald-700 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Ouvrir le parcours <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CARNET DE ROUTE CONJUGAL (LIVRETS DE RÉFLEXION) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-display flex items-center gap-2">
              <span>✍️</span>
              <span>Mon Carnet de Route Conjugal</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consignez vos réflexions individuelles ou de couple sur les piliers de votre futur foyer. Vos réponses sont sauvegardées en direct.
            </p>
          </div>
        </div>

        {/* Accordeon des livrets */}
        <div className="space-y-3">
          {WORKSHEETS.map((sheet, index) => {
            const isExpanded = expandedWorksheet === index;

            return (
              <div 
                key={sheet.id} 
                className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs hover:border-emerald-300 transition"
              >
                <button
                  onClick={() => setExpandedWorksheet(isExpanded ? null : index)}
                  className="w-full px-4 sm:px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{sheet.icon}</span>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                        {sheet.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {sheet.questions.length} questions essentielles
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
                </button>

                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-4 animate-in fade-in duration-200">
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      {sheet.description}
                    </p>

                    <div className="space-y-3.5">
                      {sheet.questions.map(q => {
                        const currentVal = journalNotes[q.key] || '';
                        const isSavingThis = savingKey === q.key;

                        return (
                          <div key={q.key} className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 space-y-2 shadow-2xs">
                            <label className="text-xs font-extrabold text-slate-800 block leading-snug">
                              {q.label}
                            </label>
                            <textarea
                              value={currentVal}
                              onChange={e => setJournalNotes({ ...journalNotes, [q.key]: e.target.value })}
                              placeholder={q.placeholder}
                              rows={3}
                              className="w-full text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 p-3 bg-slate-50/50 resize-none font-medium text-slate-800"
                            />
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => handleSaveJournalNote(q.key, currentVal)}
                                disabled={isSavingThis}
                                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-[11px] px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                              >
                                <Save size={12} />
                                <span>{isSavingThis ? 'Enregistrement...' : 'Enregistrer'}</span>
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

      {/* RESSOURCES SPIRITUELLES & GUIDES DE LECTURE */}
      <div className="space-y-3">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-display flex items-center gap-2">
          <span>📚</span>
          <span>Ressources & Guides Spirituels</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {REAL_VOCATION_RESOURCES.map(res => (
            <div
              key={res.id}
              onClick={() => {
                setSelectedResource(res);
                setActiveModal('RESOURCE');
              }}
              className="bg-white p-4 rounded-2xl border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-xs transition flex items-start gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {res.type === 'ARTICLE' && <FileText size={18} />}
                {res.type === 'PODCAST' && <Mic size={18} />}
                {res.type === 'VIDEO' && <PlayCircle size={18} />}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-700 transition leading-snug">
                  {res.title}
                </h4>
                <p className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">
                    {res.category}
                  </span>
                  <span>•</span>
                  <span>{res.duration}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODALES --- */}

      {/* 1. MODALE PARCOURS D'ENSEIGNEMENT DÉTAILLÉ */}
      {activeModal === 'TRACK_DETAILS' && selectedTrack && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveModal('NONE')} />

          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-emerald-100 my-auto max-h-[90dvh] flex flex-col">
            <div className={`bg-gradient-to-r ${selectedTrack.color} text-white p-5 flex items-center justify-between shrink-0`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedTrack.icon}</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white font-display">{selectedTrack.label}</h3>
                  <p className="text-white/80 text-xs">{selectedTrack.steps.length} étapes de discernement</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('NONE')} className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-left">
              {selectedTrack.steps.map((step, idx) => {
                const isDone = completedSteps.includes(step.id);

                return (
                  <div key={step.id} className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/90 space-y-3.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                        <span>{step.title}</span>
                      </h4>
                      <button
                        onClick={() => toggleStepCompletion(step.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer transform active:scale-95 ${
                          isDone 
                            ? 'bg-emerald-600 text-white shadow-2xs' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <Check size={14} />
                        <span>{isDone ? '✓ Validé' : 'Marquer comme lu'}</span>
                      </button>
                    </div>

                    {/* Verset Biblique */}
                    <div className="bg-emerald-50/80 border-l-4 border-emerald-600 p-3 rounded-r-xl text-xs text-emerald-950 italic font-medium">
                      {step.scripture}
                    </div>

                    {/* Enseignement */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {step.content}
                    </p>

                    {/* Question de réflexion */}
                    <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl space-y-1">
                      <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                        <HelpCircle size={12} /> Question de méditation :
                      </span>
                      <p className="text-xs text-amber-950 font-semibold">{step.reflectionQuestion}</p>
                    </div>

                    {/* Prière */}
                    <div className="bg-white border border-slate-200/80 p-3 rounded-xl text-xs text-slate-600 space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prière de clôture :</span>
                      <p className="italic font-medium text-slate-800">« {step.prayer} »</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. MODALE RÉPERTOIRE DES CONSEILLERS & PRÊTRES */}
      {activeModal === 'CONTACT' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveModal('NONE')} />

          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 my-auto max-h-[90dvh] flex flex-col text-left">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⛪</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white font-display">Répertoire des Accompagnateurs</h3>
                  <p className="text-emerald-200 text-xs">Conseillers conjugaux, pasteurs et prêtres disponibles</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('NONE')} className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={priestSearch}
                  onChange={e => setPriestSearch(e.target.value)}
                  placeholder="Rechercher par nom, paroisse, confession..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {loadingPriests ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Chargement des contacts certifiés...
                </div>
              ) : filteredPriests.length > 0 ? (
                filteredPriests.map(p => (
                  <div key={p.id} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-200">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{p.name}</h4>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={12} className="text-emerald-600 shrink-0" />
                          <span>{p.parish}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          ⏰ {p.availability}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <a
                        href={`tel:${p.phone}`}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <Phone size={12} className="text-emerald-600" />
                        <span>Appeler</span>
                      </a>
                      <button
                        onClick={() => {
                          setMentorFormTarget(p);
                          setActiveModal('REQUEST_MENTOR');
                        }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <span>Choisir</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Aucun conseiller trouvé pour cette recherche.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MODALE DEMANDE D'ACCOMPAGNEMENT RÉEL */}
      {activeModal === 'REQUEST_MENTOR' && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveModal('NONE')} />

          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-emerald-100 my-auto max-h-[90dvh] flex flex-col text-left">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤝</span>
                <h3 className="text-base sm:text-lg font-black text-white font-display">Demande d'Accompagnement Spirituel</h3>
              </div>
              <button onClick={() => setActiveModal('NONE')} className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitMentorship} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Accompagnateur sélectionné
                </label>
                <select
                  value={mentorFormTarget?.id || ''}
                  onChange={e => {
                    const target = priests.find(p => p.id === e.target.value);
                    if (target) setMentorFormTarget(target);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold cursor-pointer focus:ring-2 focus:ring-emerald-500"
                >
                  {priests.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.parish}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sujet principal du discernement
                </label>
                <select
                  value={mentorTopic}
                  onChange={e => setMentorTopic(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold cursor-pointer focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="MARRIAGE_PREP">💍 Préparation au Mariage Chrétien</option>
                  <option value="VOCATION_DISCERNMENT">⛪ Discernement Vocationnel / Ministère</option>
                  <option value="SPIRITUAL_GUIDANCE">🕊️ Direction & Écoute Spirituelle</option>
                  <option value="COUPLE_CRISIS">🤝 Résolution de Difficultés dans le Couple</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Votre note d'introduction & attentes
                </label>
                <textarea
                  value={mentorNotes}
                  onChange={e => setMentorNotes(e.target.value)}
                  placeholder="Présentez brièvement votre situation et vos attentes pour cet accompagnement..."
                  rows={4}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 leading-relaxed font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingMentor}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-extrabold rounded-2xl shadow-md transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transform active:scale-98"
              >
                <Send size={15} />
                <span>{isSubmittingMentor ? 'Enregistrement...' : "Confirmer la demande d'accompagnement"}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODALE LECTURE DE RESSOURCE */}
      {activeModal === 'RESOURCE' && selectedResource && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveModal('NONE')} />

          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 my-auto max-h-[90dvh] flex flex-col text-left">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📖</span>
                <div>
                  <h3 className="text-base font-black text-white font-display">{selectedResource.title}</h3>
                  <p className="text-emerald-200 text-[11px]">Par {selectedResource.author}</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('NONE')} className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium">
              {selectedResource.content}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button
                onClick={() => setActiveModal('NONE')}
                className="bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
