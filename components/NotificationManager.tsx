
import React, { useEffect } from 'react';
import { supabase } from '../supabaseClient';

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

export const NotificationManager: React.FC = () => {
    useEffect(() => {
        let activeUserId: string | null = null;
        let messageChannel: any;
        let matchChannel: any;

        const setupNotifications = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            activeUserId = session?.user?.id || null;
            if (!activeUserId) return;

            // 1. Demander la permission au démarrage
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission();
            }

            const sendNotification = (title: string, body: string, iconType: 'MESSAGE' | 'MATCH' | 'FORUM' = 'MESSAGE', image?: string) => {
                if (Notification.permission === 'granted') {
                    let icon = 'https://ui-avatars.com/api/?name=Msg&background=10b981&color=fff&rounded=true';
                    if (image) icon = image;
                    else {
                        if (iconType === 'MATCH') icon = 'https://ui-avatars.com/api/?name=Love&background=ef4444&color=fff&rounded=true';
                        if (iconType === 'FORUM') icon = 'https://ui-avatars.com/api/?name=Forum&background=3b82f6&color=fff&rounded=true';
                    }

                    try {
                        const notif = new Notification(title, {
                            body, icon, badge: icon, tag: iconType, silent: false,
                            // @ts-ignore
                            vibrate: [200, 100, 200]
                        });
                        notif.onclick = () => { window.focus(); notif.close(); };
                    } catch (e) {
                        console.error("Erreur affichage notification", e);
                    }
                }
            };

            // Écouter les NOUVEAUX MESSAGES pour l'utilisateur
            const messagesChannel = supabase.channel('global_messages')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${activeUserId}` }, async (payload: any) => {
                    const record = payload.new;
                    try {
                        const { data: sender } = await supabase.from('profiles').select('*').eq('id', record.sender_id).maybeSingle();
                        if (sender) {
                            const senderName = sender.full_name || sender.name || 'Quelqu\'un';
                            const senderAvatar = sender.avatar_url ? getImlrUrl(sender.avatar_url) : undefined;

                            const textPreview = record.type === 'AUDIO' ? '🎤 Message vocal' :
                                record.type === 'IMAGE' ? '📷 Photo' :
                                    record.type === 'VIDEO' ? '🎥 Vidéo' :
                                        record.type === 'PRAYER' ? '🙏 Invitation à la prière' :
                                            record.content || 'Nouveau message';

                            sendNotification(`Nouveau message de ${senderName}`, textPreview, 'MESSAGE', senderAvatar);
                        }
                    } catch (err) {
                        sendNotification('Nouveau message', 'Vous avez reçu un nouveau message', 'MESSAGE');
                    }
                })
                .subscribe();

            // --- ABONNEMENT 2 : NOUVEAUX MATCHS ---
            matchChannel = supabase.channel('notif:matches')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, async (payload: any) => {
                    const record = payload.new;
                    if (record.user1_id === activeUserId || record.user2_id === activeUserId) {
                        const otherId = record.user1_id === activeUserId ? record.user2_id : record.user1_id;
                        try {
                            const { data: otherUser } = await supabase.from('profiles').select('*').eq('id', otherId).maybeSingle();
                            if (otherUser) {
                                const otherAvatar = otherUser.avatar_url ? getImlrUrl(otherUser.avatar_url) : undefined;
                                sendNotification(`C'est un Match ! ❤️`, `Félicitations ! Vous avez matché avec ${otherUser.full_name || otherUser.name}.`, 'MATCH', otherAvatar);
                            }
                        } catch (err) {
                            sendNotification(`Nouveau Match !`, `Quelqu'un a matché avec vous !`, 'MATCH');
                        }
                    }
                })
                .subscribe();
        };

        setupNotifications();

        return () => {
            if (messageChannel) supabase.removeChannel(messageChannel);
            if (matchChannel) supabase.removeChannel(matchChannel);
        };
    }, []);

    return null;
};
