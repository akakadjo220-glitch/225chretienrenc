export interface BibleQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  explanation: string;
  verseRef?: string;
}

export const BIBLE_QUIZ_QUESTIONS: BibleQuestion[] = [
  {
    id: 1,
    question: "Où Jésus a-t-il accompli son tout premier miracle selon les Évangiles ?",
    options: ["À Jérusalem", "Aux noces de Cana", "Sur le lac de Tibériade", "À Nazareth"],
    correctAnswer: 1,
    explanation: "Jésus a changé l'eau en vin lors d'un mariage aux noces de Cana en Galilée.",
    verseRef: "Jean 2:1-11"
  },
  {
    id: 2,
    question: "Quel est le plus long livre de la Bible ?",
    options: ["Genèse", "Ésaïe", "Les Psaumes", "Matthieu"],
    correctAnswer: 2,
    explanation: "Le livre des Psaumes compte 150 chapitres et prières poétiques.",
    verseRef: "Psaumes 1 à 150"
  },
  {
    id: 3,
    question: "Combien de fruits de l'Esprit Saint sont énumérés dans l'épître aux Galates ?",
    options: ["7", "9", "12", "10"],
    correctAnswer: 1,
    explanation: "L'Amour, la Joie, la Paix, la Patience, la Bonté, la Bienveillance, la Foi, la Douceur et la Maîtrise de soi (9 fruits).",
    verseRef: "Galates 5:22-23"
  },
  {
    id: 4,
    question: "Qui a dit à Dieu : 'Me voici, envoie-moi' ?",
    options: ["Moïse", "Jérémie", "Ésaïe", "Samuel"],
    correctAnswer: 2,
    explanation: "Le prophète Ésaïe a répondu à l'appel du Seigneur dans la vision du Temple.",
    verseRef: "Ésaïe 6:8"
  },
  {
    id: 5,
    question: "Dans quelle ville le roi David est-il né ?",
    options: ["Jérusalem", "Bethléem", "Hébron", "Jéricho"],
    correctAnswer: 1,
    explanation: "David est né à Bethléem de Juda, tout comme Jésus plus tard.",
    verseRef: "1 Samuel 17:12"
  },
  {
    id: 6,
    question: "Quel disciple a marché sur l'eau à la rencontre de Jésus ?",
    options: ["Jean", "Pierre", "Jacques", "André"],
    correctAnswer: 1,
    explanation: "Pierre est sorti de la barque et a marché sur les eaux vers Jésus.",
    verseRef: "Matthieu 14:29"
  },
  {
    id: 7,
    question: "Combien de jours et de nuits a duré le déluge au temps de Noé ?",
    options: ["7 jours", "40 jours", "100 jours", "12 jours"],
    correctAnswer: 1,
    explanation: "La pluie tomba sur la terre pendant 40 jours et 40 nuits.",
    verseRef: "Genèse 7:12"
  },
  {
    id: 8,
    question: "Lequel des Apôtres était percepteur d'impôts (publicain) avant d'être appelé ?",
    options: ["Matthieu", "Luc", "Thomas", "Barthélemy"],
    correctAnswer: 0,
    explanation: "Matthieu (aussi appelé Lévi) était assis au bureau des péages à Capernaüm.",
    verseRef: "Matthieu 9:9"
  },
  {
    id: 9,
    question: "Quel roi a demandé à Dieu la sagesse plutôt que la richesse ou une longue vie ?",
    options: ["David", "Salomon", "Ezéchias", "Josias"],
    correctAnswer: 1,
    explanation: "Le roi Salomon a demandé la sagesse pour gouverner le peuple de Dieu.",
    verseRef: "1 Rois 3:9-12"
  },
  {
    id: 10,
    question: "Quel verset biblique dit : 'Car Dieu a tant aimé le monde qu'il a donné son Fils unique...' ?",
    options: ["Romains 8:28", "Jean 3:16", "Psaume 23:1", "1 Corinthiens 13:4"],
    correctAnswer: 1,
    explanation: "Jean 3:16 est le verset central de l'amour salvateur de Dieu.",
    verseRef: "Jean 3:16"
  },
  {
    id: 11,
    question: "Sur quel mont Moïse a-t-il reçu les Dix Commandements ?",
    options: ["Le Mont Carmel", "Le Mont Sinaï (Horeb)", "Le Mont des Oliviers", "Le Mont Thabor"],
    correctAnswer: 1,
    explanation: "Moïse est monté sur le Sinaï pour recevoir les tables de la Loi.",
    verseRef: "Exode 19:20"
  },
  {
    id: 12,
    question: "Quelle femme jugesse et prophétesse a mené Israël à la victoire dans le livre des Juges ?",
    options: ["Ruth", "Esther", "Débora", "Lydie"],
    correctAnswer: 2,
    explanation: "Débora jugeait Israël sous le palmier entre Rama et Béthel.",
    verseRef: "Juges 4:4-5"
  },
  {
    id: 13,
    question: "Quel homme biblique a vécu le plus longtemps selon la Genèse (969 ans) ?",
    options: ["Noé", "Metuschélah (Mathusalem)", "Adam", "Hénoch"],
    correctAnswer: 1,
    explanation: "Mathusalem a vécu 969 ans avant de mourir.",
    verseRef: "Genèse 5:27"
  },
  {
    id: 14,
    question: "Dans quel fleuve Jean-Baptiste baptisait-il les gens ?",
    options: ["Le Nil", "Le Jourdain", "L'Euphrate", "Le Gihon"],
    correctAnswer: 1,
    explanation: "Jean baptisait dans les eaux du Jourdain en prêchant le repentir.",
    verseRef: "Matthieu 3:6"
  },
  {
    id: 15,
    question: "Quel apôtre a écrit l'Hymne à la Charité dans 1 Corinthiens 13 ?",
    options: ["Pierre", "Paul", "Jean", "Jacques"],
    correctAnswer: 1,
    explanation: "Saint Paul a écrit ce magnifique poème sur l'Amour qui ne périt jamais.",
    verseRef: "1 Corinthiens 13:1-13"
  }
];

export const getRandomQuizQuestions = (count: number = 5): BibleQuestion[] => {
  const shuffled = [...BIBLE_QUIZ_QUESTIONS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
