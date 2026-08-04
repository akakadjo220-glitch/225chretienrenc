import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Shield, X, Delete, Check, AlertCircle, Sparkles } from 'lucide-react';
import { hashPin } from '../utils/privacyShield';

interface PinLockModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  mode?: 'UNLOCK' | 'SET_PIN';
  savedPinHash?: string | null;
  onSavePin?: (pinHash: string) => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode = 'UNLOCK',
  savedPinHash,
  onSavePin
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setIsConfirming(false);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (digit: string) => {
    if (errorMsg) setErrorMsg('');
    
    if (mode === 'UNLOCK') {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        if (newPin.length === 4) {
          verifyPin(newPin);
        }
      }
    } else {
      // SET_PIN MODE
      if (!isConfirming) {
        if (pin.length < 4) {
          const newPin = pin + digit;
          setPin(newPin);
          if (newPin.length === 4) {
            setTimeout(() => {
              setIsConfirming(true);
            }, 200);
          }
        }
      } else {
        if (confirmPin.length < 4) {
          const newConfirm = confirmPin + digit;
          setConfirmPin(newConfirm);
          if (newConfirm.length === 4) {
            saveNewPin(pin, newConfirm);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg('');
    if (mode === 'UNLOCK' || !isConfirming) {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const verifyPin = (enteredPin: string) => {
    const inputHash = hashPin(enteredPin);
    const expectedHash = savedPinHash || localStorage.getItem('_225_security_pin');

    if (inputHash === expectedHash) {
      setSuccessMsg('Déverrouillé avec succès !');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      }, 300);
    } else {
      setErrorMsg('Code PIN incorrect. Réessayez.');
      setPin('');
    }
  };

  const saveNewPin = (firstPin: string, secondPin: string) => {
    if (firstPin !== secondPin) {
      setErrorMsg('Les codes PIN ne correspondent pas. Recommencez.');
      setPin('');
      setConfirmPin('');
      setIsConfirming(false);
      return;
    }

    const pinHash = hashPin(firstPin);
    localStorage.setItem('_225_security_pin', pinHash);
    if (onSavePin) onSavePin(pinHash);

    setSuccessMsg('Nouveau code PIN enregistré !');
    setTimeout(() => {
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    }, 500);
  };

  const currentDigits = (mode === 'UNLOCK' || !isConfirming) ? pin : confirmPin;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 select-none">
      {/* Background overlay with backdrop blur */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in" />

      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 p-6 text-center">
        {onClose && mode === 'SET_PIN' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        )}

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
          {mode === 'UNLOCK' ? <Lock size={32} className="text-white" /> : <Shield size={32} className="text-white" />}
        </div>

        <h3 className="text-xl font-black text-white tracking-tight mb-1">
          {mode === 'UNLOCK' ? 'Espace Sécurisé 225 Chrétien' : (isConfirming ? 'Confirmez votre PIN' : 'Définir un Code PIN')}
        </h3>

        <p className="text-xs text-slate-400 mb-6">
          {mode === 'UNLOCK'
            ? 'Entrez votre code à 4 chiffres pour accéder.'
            : (isConfirming ? 'Retapez le code PIN pour valider.' : 'Choisissez un code PIN à 4 chiffres pour protéger vos données.')}
        </p>

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map(idx => {
            const isFilled = idx < currentDigits.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                  isFilled
                    ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-sm shadow-emerald-400/50'
                    : 'border-slate-600 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {/* Feedback messages */}
        {errorMsg && (
          <div className="mb-4 text-xs font-bold text-red-400 bg-red-950/60 border border-red-800/50 p-2.5 rounded-xl animate-shake flex items-center justify-center gap-1.5">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 p-2.5 rounded-xl flex items-center justify-center gap-1.5">
            <Check size={14} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Numeric Touch Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto mb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="w-16 h-16 rounded-full bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 text-white font-extrabold text-xl flex items-center justify-center mx-auto transition border border-slate-700/50 active:scale-95 shadow-sm"
            >
              {num}
            </button>
          ))}
          
          <div />

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-full bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 text-white font-extrabold text-xl flex items-center justify-center mx-auto transition border border-slate-700/50 active:scale-95 shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="w-16 h-16 rounded-full bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-sm flex items-center justify-center mx-auto transition border border-slate-800 active:scale-95"
            title="Effacer"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
