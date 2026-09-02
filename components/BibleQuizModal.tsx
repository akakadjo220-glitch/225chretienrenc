import React, { useState } from 'react';
import { X, Award, CheckCircle2, XCircle, ArrowRight, RefreshCw, Trophy } from 'lucide-react';
import { BibleQuestion, getRandomQuizQuestions } from '../constants/bibleQuizData';

interface BibleQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteQuiz?: (score: number, total: number, questions: BibleQuestion[], userAnswers: number[]) => void;
  opponentName?: string;
  isChallenging?: boolean; // Vrai si on relève le défi d'un contact
  originalScore?: number;
}

export const BibleQuizModal: React.FC<BibleQuizModalProps> = ({
  isOpen,
  onClose,
  onCompleteQuiz,
  opponentName = 'votre partenaire',
  isChallenging = false,
  originalScore
}) => {
  const [questions] = useState<BibleQuestion[]>(() => getRandomQuizQuestions(5));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  if (!isOpen) return null;

  const currentQ = questions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleConfirmAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswerSubmitted(true);

    const isCorrect = selectedOption === currentQ.correctAnswer;
    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);

    const newAnswers = [...userAnswers, selectedOption];
    setUserAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleFinish = () => {
    if (onCompleteQuiz) {
      onCompleteQuiz(score, questions.length, questions, userAnswers);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 border border-amber-100">
        {/* Header de la Modale */}
        <div className="bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-700 text-white p-5 text-left relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-2 text-amber-200 text-xs font-extrabold uppercase tracking-wider mb-1">
            <Award size={16} />
            <span>{isChallenging ? `Défi Quiz contre ${opponentName}` : 'Quiz Biblique en Duo 📖'}</span>
          </div>
          
          <h3 className="text-xl font-extrabold text-white">
            {isFinished ? 'Résultats du Quiz Spirituel' : `Question ${currentIndex + 1} sur ${questions.length}`}
          </h3>

          {!isFinished && (
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-amber-300 h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Corps de la Modale */}
        <div className="p-6 text-left">
          {!isFinished ? (
            <div className="space-y-5">
              {/* Question */}
              <h4 className="text-base font-bold text-slate-800 leading-snug">
                {currentQ.question}
              </h4>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = currentQ.correctAnswer === idx;

                  let optionStyle = 'border-slate-200 hover:border-slate-300 bg-white text-slate-700';
                  
                  if (isAnswerSubmitted) {
                    if (isCorrect) {
                      optionStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                    } else if (isSelected) {
                      optionStyle = 'border-red-500 bg-red-50 text-red-900 font-medium';
                    } else {
                      optionStyle = 'border-slate-100 opacity-50 bg-slate-50 text-slate-400';
                    }
                  } else if (isSelected) {
                    optionStyle = 'border-amber-500 bg-amber-50/80 text-amber-900 font-bold shadow-xs';
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswerSubmitted}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between text-sm transition-all duration-150 ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center border ${
                          isSelected ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                      
                      {isAnswerSubmitted && isCorrect && <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />}
                      {isAnswerSubmitted && isSelected && !isCorrect && <XCircle size={18} className="text-red-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explication théologique après réponse */}
              {isAnswerSubmitted && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed animate-in fade-in">
                  <strong className="font-bold block mb-0.5">💡 Explication :</strong>
                  <span>{currentQ.explanation}</span>
                  {currentQ.verseRef && <span className="block mt-1 font-semibold text-amber-700">— {currentQ.verseRef}</span>}
                </div>
              )}

              {/* Bouton de progression */}
              <div className="pt-2">
                {!isAnswerSubmitted ? (
                  <button
                    onClick={handleConfirmAnswer}
                    disabled={selectedOption === null}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md transition text-sm flex items-center justify-center gap-2"
                  >
                    <span>Valider la réponse</span>
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 text-white font-bold rounded-2xl shadow-md transition text-sm flex items-center justify-center gap-2"
                  >
                    <span>{currentIndex < questions.length - 1 ? 'Question suivante' : 'Voir les résultats'}</span>
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ÉCRAN DE FIN & RÉSULTATS */
            <div className="text-center space-y-5 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg text-white">
                <Trophy size={40} />
              </div>

              <div>
                <h4 className="text-2xl font-extrabold text-slate-900">
                  {score >= 4 ? 'Glorieux ! 🏆' : score >= 2 ? 'Bon travail ! 📖' : 'À approfondir 🕊️'}
                </h4>
                <p className="text-sm text-slate-500 mt-1">
                  Vous avez obtenu <strong className="text-emerald-700 text-base">{score} / {questions.length}</strong> bonnes réponses.
                </p>
              </div>

              {isChallenging && typeof originalScore === 'number' && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <p className="text-slate-600 font-bold">Comparaison des scores :</p>
                  <p className="text-slate-800 font-extrabold text-sm">
                    Vous : {score}/5 🆚 {opponentName} : {originalScore}/5
                  </p>
                  <p className="text-emerald-700 font-semibold pt-1">
                    {score > originalScore ? `🎉 Félicitations, vous remportez le défi contre ${opponentName} !` : score === originalScore ? '🤝 Égalité fraternelle parfaite !' : `Priez ensemble et ré-essayez ! 🕊️`}
                  </p>
                </div>
              )}

              <button
                onClick={handleFinish}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition text-sm flex items-center justify-center gap-2"
              >
                <span>{isChallenging ? 'Fermer & Envoyer le résultat' : 'Partager ce défi dans le chat 💬'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
