
import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, LogOut, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface VerifyEmailPageProps {
    onLogout: () => void;
}

export const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onLogout }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [email, setEmail] = useState<string>('');
    const [name, setName] = useState<string>('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setEmail(session.user.email || '');
                supabase.from('profiles').select('full_name, name').eq('id', session.user.id).maybeSingle().then(({ data }) => {
                    if (data) setName(data.full_name || data.name || '');
                });
            }
        });
    }, []);

    const handleResend = async () => {
        if (!email) return;
        setIsLoading(true);
        setMessage(null);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Email renvoyé ! Vérifiez vos spams.' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Erreur lors de l\'envoi.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            const { data: { session }, error } = await supabase.auth.refreshSession();

            if (error || !session?.user?.email_confirmed_at) {
                setMessage({ type: 'error', text: 'Compte toujours non vérifié. Avez-vous cliqué sur le lien reçu ?' });
            } else {
                window.location.reload();
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100">
                <div className="bg-amber-100 p-4 rounded-full inline-flex mb-6">
                    <Mail className="h-10 w-10 text-amber-600" />
                </div>

                <h2 className="text-2xl font-bold text-slate-800 mb-2">Vérification Requise</h2>
                <p className="text-slate-600 mb-6">
                    Bonjour <span className="font-semibold">{name}</span>,<br />
                    Votre compte n'est pas encore actif. Nous avons envoyé un lien de confirmation à :
                </p>

                <div className="bg-slate-100 p-3 rounded-lg font-mono text-sm text-slate-700 mb-6 break-all border border-slate-200">
                    {email}
                </div>

                {message && (
                    <div className={`p-3 rounded-lg text-sm mb-6 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 transition flex items-center justify-center"
                    >
                        {isLoading ? <RefreshCw className="animate-spin h-5 w-5" /> : <><CheckCircle className="mr-2 h-5 w-5" /> J'ai validé mon email</>}
                    </button>

                    <button
                        onClick={handleResend}
                        disabled={isLoading}
                        className="w-full bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition flex items-center justify-center"
                    >
                        <Send className="mr-2 h-4 w-4" /> Renvoyer l'email
                    </button>

                    <button
                        onClick={onLogout}
                        className="w-full text-slate-400 py-2 text-sm hover:text-slate-600 flex items-center justify-center"
                    >
                        <LogOut className="mr-1 h-4 w-4" /> Se déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
};
