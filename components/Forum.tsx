import React, { useState, useRef, useEffect } from 'react';
import { ForumPost, ForumComment } from '../types';
import { MOCK_FORUM_POSTS } from '../constants';
import { supabase } from '../supabaseClient';
import { sanitizeInput, validateImageFile } from '../utils/security';
import { 
    MessageSquare, Heart, PlusCircle, Search, Filter, Send, X, Share2, 
    Hash, Image as ImageIcon, Trash2, Loader, RefreshCw, AlertTriangle, 
    CornerDownRight, ThumbsUp, Smile, Sparkles, BookOpen, Quote
} from 'lucide-react';

const getImlrUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return supabase.storage.from('Public').getPublicUrl(path).data.publicUrl;
};

// Catégories avec leurs émojis pour les pilules de filtre
const CATEGORIES = [
    { name: 'Tout', emoji: '🌍' },
    { name: 'Foi & Spiritualité', emoji: '🕊️' },
    { name: 'Vocation', emoji: '💍' },
    { name: 'Vie de Couple', emoji: '⛪' },
    { name: 'Témoignages', emoji: '💡' },
    { name: 'Prière', emoji: '🙏' },
    { name: 'Questions aux Pasteurs / Prêtres', emoji: '❓' }
];

const REACTIONS = [
    { label: 'J\'aime', emoji: '👍', color: 'text-blue-500 hover:text-blue-600', dbType: 'like' },
    { label: 'Adore', emoji: '❤️', color: 'text-red-500 hover:text-red-600', dbType: 'love' },
    { label: 'Amen', emoji: '🙏', color: 'text-amber-500 font-bold hover:text-amber-600', dbType: 'amen' },
    { label: 'Wow', emoji: '😮', color: 'text-yellow-500 hover:text-yellow-600', dbType: 'wow' }
];

export const Forum: React.FC = () => {
    // --- STATE ---
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dynamic Comments states for multiple posts
    const [expandedPostComments, setExpandedPostComments] = useState<Record<string, boolean>>({});
    const [postsComments, setPostsComments] = useState<Record<string, ForumComment[]>>({});
    const [loadingCommentsPostId, setLoadingCommentsPostId] = useState<string | null>(null);
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

    // Reactions States
    const [activeReactionMenuPostId, setActiveReactionMenuPostId] = useState<string | null>(null);
    const [postsReactions, setPostsReactions] = useState<Record<string, string>>({}); // Maps postId -> Selected Reaction Emoji

    // Deletion states
    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const [commentToDelete, setCommentToDelete] = useState<{ postId: string; commentId: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tout');

    // Creation Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostCategory, setNewPostCategory] = useState('Foi & Spiritualité');
    const [newPostTags, setNewPostTags] = useState('');
    const [newPostImage, setNewPostImage] = useState<File | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    // Replying States
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyingToName, setReplyingToName] = useState<string | null>(null);
    const [replyingToPostId, setReplyingToPostId] = useState<string | null>(null);

    // "Voir plus" toggle for long posts text
    const [expandedPostsText, setExpandedPostsText] = useState<Record<string, boolean>>({});

    // Refs & Timeouts
    const imageInputRef = useRef<HTMLInputElement>(null);
    const hoverTimeoutRef = useRef<Record<string, number>>({});

    // Get current user (Reactive)
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Helper method to parse denomination and church from parish field
    const getDenominationAndChurch = (fullParish?: string) => {
        if (!fullParish) return { denomination: 'Chrétien', church: 'Communauté' };
        const parts = fullParish.split(' - ');
        if (parts.length > 1) {
            return { denomination: parts[0], church: parts[1] };
        }
        return { denomination: 'Chrétien', church: fullParish };
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle().then(({ data }) => {
                    setCurrentUser({ ...session.user, ...data });
                });
            }
        });

        // Load local reactions
        const saved = localStorage.getItem('forum_reactions_v1');
        if (saved) {
            try {
                setPostsReactions(JSON.parse(saved));
            } catch (e) {}
        }

        // --- Temps réel Forum ---
        const channel = supabase.channel('forum_realtime_channel')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, () => {
                loadPosts();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'forum_posts' }, (payload: any) => {
                const updated = payload.new;
                if (updated) {
                    setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, likes: updated.likes_count, comments: updated.comments_count } : p));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const saveReaction = (postId: string, reaction: string | null) => {
        setPostsReactions(prev => {
            const next = { ...prev };
            if (reaction) {
                next[postId] = reaction;
            } else {
                delete next[postId];
            }
            return next;
        });
    };

    // --- DATA FETCHING ---
    const loadPosts = async () => {
        setIsLoading(true);
        try {
            const { data: records, error } = await supabase.from('forum_posts')
                .select('*, author:profiles!author_id(*)')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;

            let myLikedPostIds: string[] = [];
            if (currentUser) {
                try {
                    const { data: likes } = await supabase.from('forum_likes').select('post_id').eq('user_id', currentUser.id);
                    if (likes) myLikedPostIds = likes.map((l: any) => l.post_id);
                } catch (e) {
                    console.log("Impossible de charger l'historique des likes", e);
                }
            }

            const mappedPosts: ForumPost[] = (records || []).map((r: any) => ({
                id: r.id,
                author: r.author?.full_name || r.author?.name || 'Anonyme',
                authorId: r.author_id,
                authorAvatar: r.author?.avatar_url
                    ? getImlrUrl(r.author.avatar_url)
                    : `https://ui-avatars.com/api/?name=${r.author?.name || 'A'}&background=random`,
                category: r.category,
                title: r.title,
                content: r.content,
                imageUrl: r.image_url ? getImlrUrl(r.image_url) : undefined,
                tags: r.tags ? r.tags.split(',').map((t: string) => t.trim()) : [],
                likes: Number(r.likes_count) || 0,
                comments: Number(r.comments_count) || 0,
                isLiked: myLikedPostIds.includes(r.id),
                timeAgo: new Date(r.created_at).toLocaleDateString(),
                commentsList: []
            }));

            setPosts(mappedPosts);
        } catch (e) {
            console.log("Impossible de charger les posts du forum:", e);
            setPosts([]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCommentsForPost = async (postId: string) => {
        setLoadingCommentsPostId(postId);
        try {
            const { data: records, error } = await supabase.from('forum_comments')
                .select('*, author:profiles!author_id(*)')
                .eq('post_id', postId)
                .order('created_at', { ascending: true })
                .limit(200);

            if (error) throw error;

            let likesCountMap: Record<string, number> = {};
            let myLikedCommentIds: Set<string> = new Set();
            const currentUserId = currentUser?.id;

            try {
                const { data: allLikes } = await supabase.from('forum_comment_likes')
                    .select('comment_id, user_id');

                (allLikes || []).forEach((l: any) => {
                    likesCountMap[l.comment_id] = (likesCountMap[l.comment_id] || 0) + 1;
                    if (currentUserId && l.user_id === currentUserId) {
                        myLikedCommentIds.add(l.comment_id);
                    }
                });
            } catch (e) {}

            const allComments: ForumComment[] = (records || []).map((r: any) => ({
                id: r.id,
                author: r.author?.full_name || r.author?.name || 'Utilisateur',
                authorId: r.author_id,
                authorAvatar: r.author?.avatar_url
                    ? getImlrUrl(r.author.avatar_url)
                    : `https://ui-avatars.com/api/?name=${r.author?.name || 'U'}&background=random`,
                content: r.content || r.message || r.text || "...",
                timeAgo: new Date(r.created_at).toLocaleString(),
                likes: likesCountMap[r.id] !== undefined ? likesCountMap[r.id] : (Number(r.likes_count) || 0),
                isLiked: myLikedCommentIds.has(r.id),
                parent: r.parent_id || "",
                replies: []
            }));

            const rootComments: ForumComment[] = [];
            const repliesMap: { [key: string]: ForumComment[] } = {};

            allComments.forEach(c => {
                if (c.parent && c.parent !== "") {
                    if (!repliesMap[c.parent]) repliesMap[c.parent] = [];
                    repliesMap[c.parent].push(c);
                }
            });

            allComments.forEach(c => {
                if (!c.parent || c.parent === "") {
                    c.replies = repliesMap[c.id] || [];
                    rootComments.push(c);
                }
            });

            setPostsComments(prev => ({ ...prev, [postId]: rootComments }));
        } catch (e) {
            console.error("Erreur chargement commentaires", e);
        } finally {
            setLoadingCommentsPostId(null);
        }
    };

    useEffect(() => {
        loadPosts();
    }, [currentUser?.id]);

    // --- REACTION HANDLERS ---
    const handleReactToPost = async (postId: string, reactionEmoji: string) => {
        const validUser = currentUser;
        if (!validUser) return alert("Connectez-vous pour réagir.");

        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        const post = posts[postIndex];
        const isCurrentlyLiked = post.isLiked;
        const currentReaction = postsReactions[postId];

        const isRemoving = isCurrentlyLiked && currentReaction === reactionEmoji;

        let optimisticCount = post.likes;
        if (isRemoving) {
            optimisticCount = Math.max(0, optimisticCount - 1);
        } else if (!isCurrentlyLiked) {
            optimisticCount = optimisticCount + 1;
        }

        // Update posts optimistically
        setPosts(prev => prev.map((p, idx) => idx === postIndex ? { ...p, likes: optimisticCount, isLiked: !isRemoving } : p));
        if (isRemoving) {
            saveReaction(postId, null);
        } else {
            saveReaction(postId, reactionEmoji);
        }
        setActiveReactionMenuPostId(null);

        try {
            if (isRemoving) {
                await supabase.from('forum_likes').delete().eq('post_id', postId).eq('user_id', validUser.id);
            } else {
                if (!isCurrentlyLiked) {
                    await supabase.from('forum_likes').insert({
                        post_id: postId,
                        user_id: validUser.id
                    });
                }
            }

            const { count: realTotalLikes } = await supabase.from('forum_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
            if (realTotalLikes !== null) {
                await supabase.from('forum_posts').update({ likes_count: realTotalLikes }).eq('id', postId);
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: realTotalLikes } : p));
            }
        } catch (e) {
            console.error("Erreur enregistrement de la réaction", e);
        }
    };

    const handleLikeClick = (e: React.MouseEvent, postId: string) => {
        e.stopPropagation();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        if (post.isLiked) {
            handleReactToPost(postId, postsReactions[postId] || '👍');
        } else {
            handleReactToPost(postId, '👍');
        }
    };

    const handleLikeMouseEnter = (postId: string) => {
        if (hoverTimeoutRef.current[postId]) {
            clearTimeout(hoverTimeoutRef.current[postId]);
        }
        setActiveReactionMenuPostId(postId);
    };

    const handleLikeMouseLeave = (postId: string) => {
        hoverTimeoutRef.current[postId] = window.setTimeout(() => {
            setActiveReactionMenuPostId(null);
        }, 800);
    };

    // --- COMMENTS INLINE LOGIC ---
    const toggleComments = (postId: string) => {
        setExpandedPostComments(prev => {
            const next = { ...prev, [postId]: !prev[postId] };
            if (next[postId]) {
                loadCommentsForPost(postId);
            }
            return next;
        });
    };

    const handleAddCommentToPost = async (e: React.FormEvent, postId: string) => {
        e.preventDefault();
        const validUser = currentUser;
        const commentText = commentInputs[postId] || '';
        if (!commentText.trim() || !validUser) return;

        const tempId = 'temp-' + Date.now();
        const isReply = replyingToId && replyingToPostId === postId;

        const newCommentObj: ForumComment = {
            id: tempId,
            author: validUser.full_name || validUser.name || 'Moi',
            authorAvatar: validUser.avatar_url ? getImlrUrl(validUser.avatar_url) : '',
            content: commentText,
            timeAgo: 'À l\'instant',
            likes: 0,
            isLiked: false,
            parent: isReply ? replyingToId || undefined : undefined,
            replies: []
        };

        // Optimistic UI insert
        setPostsComments(prev => {
            const currentList = prev[postId] || [];
            if (isReply) {
                return {
                    ...prev,
                    [postId]: currentList.map(c => {
                        if (c.id === replyingToId) {
                            return { ...c, replies: [...(c.replies || []), newCommentObj] };
                        }
                        return c;
                    })
                };
            } else {
                return {
                    ...prev,
                    [postId]: [...currentList, newCommentObj]
                };
            }
        });

        // Reset inputs
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setReplyingToId(null);
        setReplyingToName(null);
        setReplyingToPostId(null);

        try {
            const payload: any = {
                post_id: postId,
                author_id: validUser.id,
                content: commentText,
            };

            if (isReply && !newCommentObj.parent?.startsWith('temp-')) {
                payload.parent_id = newCommentObj.parent;
            }

            await supabase.from('forum_comments').insert(payload);

            const { count: realTotalComments } = await supabase.from('forum_comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);
            if (realTotalComments !== null) {
                await supabase.from('forum_posts').update({ comments_count: realTotalComments }).eq('id', postId);
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: realTotalComments } : p));
            }

            await loadCommentsForPost(postId);
        } catch (e) {
            console.error("Erreur critique envoi commentaire", e);
            await loadCommentsForPost(postId);
        }
    };

    const handleReplyToComment = (postId: string, commentId: string, authorName: string) => {
        setReplyingToId(commentId);
        setReplyingToName(authorName);
        setReplyingToPostId(postId);
        setCommentInputs(prev => ({ ...prev, [postId]: `@${authorName} ` }));
    };

    const cancelReply = (postId: string) => {
        setReplyingToId(null);
        setReplyingToName(null);
        setReplyingToPostId(null);
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    };

    // --- LIKE COMMENT ---
    const handleLikeComment = async (postId: string, commentId: string) => {
        const validUser = currentUser;
        if (!validUser) return alert("Connectez-vous pour aimer.");

        const currentComments = postsComments[postId] || [];
        const commentIndex = currentComments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) return;

        const comment = currentComments[commentIndex];
        const wasLiked = comment.isLiked;
        const oldLikesCount = Number(comment.likes) || 0;

        const optimisticCount = wasLiked ? Math.max(0, oldLikesCount - 1) : oldLikesCount + 1;
        
        setPostsComments(prev => ({
            ...prev,
            [postId]: prev[postId].map((c, idx) => idx === commentIndex ? { ...c, likes: optimisticCount, isLiked: !wasLiked } : c)
        }));

        try {
            if (wasLiked) {
                await supabase.from('forum_comment_likes').delete().eq('comment_id', commentId).eq('user_id', validUser.id);
            } else {
                await supabase.from('forum_comment_likes').insert({
                    comment_id: commentId,
                    user_id: validUser.id
                });
            }

            const { count: realTotal } = await supabase.from('forum_comment_likes').select('*', { count: 'exact', head: true }).eq('comment_id', commentId);
            if (realTotal !== null) {
                await supabase.from('forum_comments').update({ likes_count: realTotal }).eq('id', commentId);
                setPostsComments(prev => ({
                    ...prev,
                    [postId]: prev[postId].map(c => c.id === commentId ? { ...c, likes: realTotal } : c)
                }));
            }
        } catch (e) {
            console.error("Erreur Like Commentaire", e);
        }
    };

    // --- DELETIONS ---
    const requestDeletePost = (e: React.MouseEvent, postId: string) => {
        e.stopPropagation();
        setPostToDelete(postId);
    };

    const confirmDeletePost = async () => {
        if (!postToDelete) return;
        setIsDeleting(true);
        try {
            // Cleanup post likes
            try { await supabase.from('forum_likes').delete().eq('post_id', postToDelete); } catch {}
            // Cleanup comments
            try {
                const { data: related } = await supabase.from('forum_comments').select('id').eq('post_id', postToDelete);
                if (related) {
                    await Promise.all(related.map(async (c: any) => {
                        try { await supabase.from('forum_comment_likes').delete().eq('comment_id', c.id); } catch {}
                        return supabase.from('forum_comments').delete().eq('id', c.id);
                    }));
                }
            } catch {}

            await supabase.from('forum_posts').delete().eq('id', postToDelete);
            setPosts(prev => prev.filter(p => p.id !== postToDelete));
        } catch (e) {
            console.error("Erreur suppression post", e);
        } finally {
            setIsDeleting(false);
            setPostToDelete(null);
        }
    };

    const confirmDeleteComment = async () => {
        if (!commentToDelete) return;
        const { postId, commentId } = commentToDelete;
        setIsDeleting(true);
        try {
            await supabase.from('forum_comment_likes').delete().eq('comment_id', commentId);
            await supabase.from('forum_comments').delete().eq('id', commentId);
            await loadCommentsForPost(postId);

            const { count: realTotalComments } = await supabase.from('forum_comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);
            if (realTotalComments !== null) {
                await supabase.from('forum_posts').update({ comments_count: realTotalComments }).eq('id', postId);
                setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: realTotalComments } : p));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsDeleting(false);
            setCommentToDelete(null);
        }
    };

    // --- MEDIA ---
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setImageError(null);
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const check = validateImageFile(file, 5);
            if (!check.valid) {
                setImageError(check.error || "Image non valide.");
                if (imageInputRef.current) imageInputRef.current.value = "";
                return;
            }
            setNewPostImage(file);
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        const validUser = currentUser;
        if (!newPostTitle.trim() || !newPostContent.trim() || !validUser) return;

        const sanitizedTitle = sanitizeInput(newPostTitle.trim());
        const sanitizedContent = sanitizeInput(newPostContent.trim());

        setIsSubmitting(true);
        try {
            const cleanTags = newPostTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).map(sanitizeInput).join(',');

            let imageUrl = null;
            if (newPostImage) {
                const fileExt = newPostImage.name.split('.').pop()?.toLowerCase() || 'jpg';
                const fileName = `${validUser.id}-${Date.now()}.${fileExt}`;
                const filePath = `forum/${fileName}`;

                const { error: uploadError } = await supabase.storage.from('Public').upload(filePath, newPostImage);
                if (uploadError) throw uploadError;
                imageUrl = filePath;
            }

            const { error } = await supabase.from('forum_posts').insert({
                title: sanitizedTitle,
                content: sanitizedContent,
                category: newPostCategory,
                author_id: validUser.id,
                likes_count: 0,
                comments_count: 0,
                tags: cleanTags,
                image_url: imageUrl
            });

            if (error) throw error;

            await loadPosts();
            setIsCreateModalOpen(false);
            setNewPostTitle('');
            setNewPostContent('');
            setNewPostTags('');
            setNewPostImage(null);
            setImageError(null);
        } catch (error: any) {
            alert(`Erreur création publication: ${error?.message || error}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSharePost = (e: React.MouseEvent, post: ForumPost) => {
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/#forum-${post.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert("Lien de la publication copié dans le presse-papiers ! 📋");
        }).catch(() => {
            alert("Impossible de copier le lien.");
        });
    };

    // Filter posts
    const filteredPosts = posts.filter(post => {
        const query = searchQuery.toLowerCase();
        const matchesQuery = post.title.toLowerCase().includes(query) || 
                             post.content.toLowerCase().includes(query) || 
                             (post.tags && post.tags.some(tag => tag.toLowerCase().includes(query)));
        const matchesCategory = selectedCategory === 'Tout' || post.category === selectedCategory;
        return matchesQuery && matchesCategory;
    });

    const openComposerWithCategory = (categoryName: string) => {
        setNewPostCategory(categoryName);
        setIsCreateModalOpen(true);
    };

    const renderPostContent = (post: ForumPost) => {
        const limit = 280;
        const isLong = post.content.length > limit;
        const isExpanded = expandedPostsText[post.id];

        if (!isLong || isExpanded) {
            return (
                <p className="text-slate-700 text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
                    {post.content}
                    {isLong && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setExpandedPostsText(prev => ({ ...prev, [post.id]: false }));
                            }}
                            className="text-emerald-600 font-bold hover:underline ml-2 text-xs"
                        >
                            Voir moins
                        </button>
                    )}
                </p>
            );
        }

        return (
            <p className="text-slate-700 text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
                {post.content.substring(0, limit)}...
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpandedPostsText(prev => ({ ...prev, [post.id]: true }));
                    }}
                    className="text-emerald-600 font-bold hover:underline ml-2 text-xs"
                >
                    Voir plus
                </button>
            </p>
        );
    };

    return (
        <div className="max-w-3xl mx-auto px-4 pb-12 font-sans bg-slate-50 min-h-screen">
            <style>{`
                @keyframes heartPop {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.4); }
                    100% { transform: scale(1); }
                }
                .animate-heart-pop {
                    animation: heartPop 0.3s ease-out;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
            `}</style>

            {/* --- TOP BRANDING BANNER --- */}
            <div className="relative h-40 md:h-48 rounded-3xl overflow-hidden mb-6 shadow-lg group mt-4">
                <img 
                    src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" 
                    alt="Communauté" 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-900/60 to-transparent flex flex-col justify-center px-8 md:px-12">
                    <span className="bg-emerald-500/20 text-emerald-300 font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-full w-max mb-2 backdrop-blur-md">Espace Communauté</span>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Le Parvis</h1>
                    <p className="text-emerald-100/90 max-w-lg text-xs md:text-sm font-medium mt-1">
                        "Là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux." — Matthieu 18:20
                    </p>
                </div>
            </div>

            {/* --- FACEBOOK-STYLE INLINE POST COMPOSER --- */}
            {currentUser && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
                    <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                        <img 
                            src={currentUser.avatar_url ? getImlrUrl(currentUser.avatar_url) : `https://ui-avatars.com/api/?name=${currentUser.name || 'U'}&background=random`} 
                            className="h-10 w-10 rounded-full object-cover border border-slate-200" 
                            alt="Mon avatar" 
                        />
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex-1 text-left bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full px-5 py-2.5 text-sm transition"
                        >
                            Qu'avez-vous à l'esprit, {currentUser.full_name || currentUser.name} ? 🙏
                        </button>
                    </div>
                    <div className="flex items-center justify-between pt-3 text-slate-600 text-xs md:text-sm font-semibold px-2">
                        <button 
                            onClick={() => { imageInputRef.current?.click(); setIsCreateModalOpen(true); }}
                            className="flex items-center space-x-2 hover:bg-slate-50 py-2 px-3 rounded-xl transition"
                        >
                            <ImageIcon size={18} className="text-emerald-500" />
                            <span>Photo</span>
                        </button>
                        <button 
                            onClick={() => openComposerWithCategory('Prière')}
                            className="flex-1 flex justify-center items-center space-x-2 hover:bg-slate-50 py-2 px-3 rounded-xl transition border-x border-slate-100"
                        >
                            <Sparkles size={18} className="text-amber-500" />
                            <span>Sujet de Prière</span>
                        </button>
                        <button 
                            onClick={() => openComposerWithCategory('Témoignages')}
                            className="flex items-center space-x-2 hover:bg-slate-50 py-2 px-3 rounded-xl transition"
                        >
                            <BookOpen size={18} className="text-indigo-500" />
                            <span>Témoignage</span>
                        </button>
                    </div>
                </div>
            )}

            {/* --- FILTRES & BARRE DE RECHERCHE --- */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input 
                        type="text" 
                        className="block w-full pl-10 pr-3 py-2 border-none bg-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" 
                        placeholder="Rechercher des discussions, versets, tags..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    )}
                </div>
                <div className="sm:w-48 relative">
                    <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <select 
                        value={selectedCategory} 
                        onChange={(e) => setSelectedCategory(e.target.value)} 
                        className="block w-full pl-10 pr-8 py-2 border-none bg-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 transition"
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat.name} value={cat.name}>{cat.emoji} {cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* --- EMOJI PILLS FOR CATEGORIES --- */}
            <div className="flex space-x-2 overflow-x-auto pb-3 mb-4 scrollbar-hide custom-scrollbar">
                {CATEGORIES.map((cat, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setSelectedCategory(cat.name)} 
                        className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-sm flex items-center gap-1.5 ${selectedCategory === cat.name ? 'bg-emerald-600 text-white scale-105' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* --- FEED (LISTE DES PUBLICATIONS) --- */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-12"><Loader className="h-8 w-8 animate-spin text-emerald-600 mx-auto" /></div>
                ) : filteredPosts.length > 0 ? (
                    filteredPosts.map(post => {
                        const isOwner = currentUser?.id === post.authorId;
                        const churchInfo = getDenominationAndChurch(post.category === 'Questions aux Pasteurs / Prêtres' ? 'Conseiller spirituel' : post.author);
                        const userSelectedReaction = postsReactions[post.id];
                        const commentsList = postsComments[post.id] || [];
                        const isCommentsExpanded = !!expandedPostComments[post.id];
                        const countOfComments = post.comments || 0;

                        return (
                            <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                {/* Top Header */}
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <img 
                                            src={post.authorAvatar} 
                                            alt={post.author} 
                                            className="h-11 w-11 rounded-full object-cover border border-slate-200" 
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="text-sm font-bold text-slate-800">{post.author}</h3>
                                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-semibold uppercase">
                                                    {post.category}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                {post.timeAgo} • {churchInfo.denomination}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        {isOwner && (
                                            <button 
                                                onClick={(e) => requestDeletePost(e, post.id)} 
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-full transition"
                                                title="Supprimer la publication"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Body content */}
                                <div className="px-4 pb-3">
                                    <h4 className="text-base font-extrabold text-slate-900 mb-1.5 tracking-tight">{post.title}</h4>
                                    {renderPostContent(post)}
                                </div>

                                {/* Image Attachment */}
                                {post.imageUrl && (
                                    <div className="w-full bg-slate-900 border-y border-slate-100 overflow-hidden max-h-[450px] flex items-center justify-center">
                                        <img src={post.imageUrl} alt="Médias" className="w-full h-auto object-cover max-h-[450px]" loading="lazy" />
                                    </div>
                                )}

                                {/* Tags list */}
                                {post.tags && post.tags.length > 0 && post.tags[0] !== "" && (
                                    <div className="px-4 pt-3 flex flex-wrap gap-1.5">
                                        {post.tags.map((tag, idx) => (
                                            <span 
                                                key={idx} 
                                                className="text-xs text-emerald-700 bg-emerald-50/70 border border-emerald-100 px-2.5 py-0.5 rounded-full font-medium"
                                                onClick={(e) => { e.stopPropagation(); setSearchQuery(tag); }}
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Status Counters (Likes/Replies totals) */}
                                <div className="px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 font-medium">
                                    <div className="flex items-center space-x-1.5">
                                        <div className="flex -space-x-1 items-center">
                                            <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white ring-2 ring-white text-[10px]">👍</span>
                                            <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white ring-2 ring-white text-[10px]">❤️</span>
                                            <span className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center text-white ring-2 ring-white text-[10px]">🙏</span>
                                        </div>
                                        <span>{post.likes} réactions</span>
                                    </div>
                                    <button onClick={() => toggleComments(post.id)} className="hover:underline">
                                        {countOfComments} commentaire{countOfComments > 1 ? 's' : ''}
                                    </button>
                                </div>

                                {/* Facebook Actions Row */}
                                <div className="px-2 py-1 flex justify-between relative border-b border-slate-100 text-sm font-semibold text-slate-600">
                                    {/* Like & React Button Container */}
                                    <div 
                                        className="relative flex-1 flex justify-center py-2 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                                        onMouseEnter={() => handleLikeMouseEnter(post.id)}
                                        onMouseLeave={() => handleLikeMouseLeave(post.id)}
                                        onClick={(e) => handleLikeClick(e, post.id)}
                                    >
                                        <button 
                                            className={`flex items-center space-x-1.5 ${post.isLiked ? (REACTIONS.find(r => r.emoji === userSelectedReaction)?.color || 'text-emerald-600') : 'text-slate-600'}`}
                                        >
                                            {post.isLiked ? (
                                                <span className="text-base animate-heart-pop">{userSelectedReaction || '👍'}</span>
                                            ) : (
                                                <ThumbsUp size={18} />
                                            )}
                                            <span>
                                                {post.isLiked ? (REACTIONS.find(r => r.emoji === userSelectedReaction)?.label || 'Aimé') : 'J\'aime'}
                                            </span>
                                        </button>

                                        {/* HOVER REACTIONS POPUP */}
                                        {activeReactionMenuPostId === post.id && (
                                            <div 
                                                className="absolute -top-12 left-4 bg-white px-3 py-1.5 rounded-full shadow-xl border border-slate-200 flex items-center space-x-3.5 z-30 reaction-panel-active"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {REACTIONS.map((react, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => handleReactToPost(post.id, react.emoji)}
                                                        className="text-2xl transform transition hover:scale-135 hover:-translate-y-1.5 active:scale-95 duration-100 emoji-hover-effect"
                                                        title={react.label}
                                                    >
                                                        {react.emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Toggle Comments Button */}
                                    <button 
                                        onClick={() => toggleComments(post.id)}
                                        className="flex-1 flex justify-center items-center space-x-1.5 py-2 hover:bg-slate-50 rounded-xl transition"
                                    >
                                        <MessageSquare size={18} />
                                        <span>Commenter</span>
                                    </button>

                                    {/* Share Button */}
                                    <button 
                                        onClick={(e) => handleSharePost(e, post)}
                                        className="flex-1 flex justify-center items-center space-x-1.5 py-2 hover:bg-slate-50 rounded-xl transition"
                                    >
                                        <Share2 size={18} />
                                        <span>Partager</span>
                                    </button>
                                </div>

                                {/* --- INLINE COMMENT DRAWER --- */}
                                {isCommentsExpanded && (
                                    <div className="bg-slate-50/60 p-4 border-t border-slate-100 space-y-4">
                                        {/* Saisie commentaire */}
                                        {currentUser && (
                                            <div className="space-y-1">
                                                {replyingToId && replyingToPostId === post.id && (
                                                    <div className="flex justify-between items-center bg-emerald-50 px-3 py-1 rounded-lg text-[11px] text-emerald-800 border border-emerald-100 max-w-sm mb-1.5">
                                                        <span>Réponse à <strong>{replyingToName}</strong></span>
                                                        <button onClick={() => cancelReply(post.id)} className="text-emerald-600 hover:text-red-500 font-bold"><X size={12} /></button>
                                                    </div>
                                                )}
                                                <form 
                                                    onSubmit={(e) => handleAddCommentToPost(e, post.id)} 
                                                    className="flex items-center gap-2"
                                                >
                                                    <img 
                                                        src={currentUser.avatar_url ? getImlrUrl(currentUser.avatar_url) : `https://ui-avatars.com/api/?name=${currentUser.name || 'U'}&background=random`} 
                                                        className="h-8 w-8 rounded-full object-cover border border-slate-200 hidden sm:block" 
                                                        alt="Avatar" 
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={commentInputs[post.id] || ''} 
                                                        onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                                        placeholder={replyingToId && replyingToPostId === post.id ? "Écrivez votre réponse..." : "Ajouter un commentaire..."}
                                                        className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                                                    />
                                                    <button 
                                                        type="submit" 
                                                        disabled={!(commentInputs[post.id] || '').trim()}
                                                        className={`p-2 rounded-full transition ${ (commentInputs[post.id] || '').trim() ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                                    >
                                                        <Send size={16} />
                                                    </button>
                                                </form>
                                            </div>
                                        )}

                                        {/* Comments list */}
                                        {loadingCommentsPostId === post.id ? (
                                            <div className="text-center py-4"><Loader className="animate-spin h-5 w-5 text-emerald-600 mx-auto" /></div>
                                        ) : commentsList.length > 0 ? (
                                            <div className="space-y-3.5 pt-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                                                {commentsList.map(comment => (
                                                    <div key={comment.id} className="space-y-1.5">
                                                        <div className="flex space-x-2.5 items-start">
                                                            <img src={comment.authorAvatar} alt={comment.author} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                {/* Bubble */}
                                                                <div className="comment-bubble">
                                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                                        <span className="text-xs font-bold text-slate-800">{comment.author}</span>
                                                                        {currentUser?.id === comment.authorId && (
                                                                            <button 
                                                                                onClick={() => setCommentToDelete({ postId: post.id, commentId: comment.id })}
                                                                                className="text-slate-400 hover:text-red-500 ml-3 transition"
                                                                                title="Supprimer mon commentaire"
                                                                            >
                                                                                <Trash2 size={11} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-slate-700 text-xs whitespace-pre-wrap break-words">{comment.content}</p>
                                                                </div>

                                                                {/* Actions */}
                                                                <div className="flex items-center space-x-4 mt-1 pl-2 text-[10px] text-slate-400 font-bold">
                                                                    <button 
                                                                        onClick={() => handleLikeComment(post.id, comment.id)} 
                                                                        className={`hover:underline flex items-center space-x-0.5 ${comment.isLiked ? 'text-emerald-600' : ''}`}
                                                                    >
                                                                        {comment.isLiked ? <span>❤️ {comment.likes}</span> : <span>J'aime</span>}
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleReplyToComment(post.id, comment.id, comment.author)} 
                                                                        className="hover:underline flex items-center space-x-0.5"
                                                                    >
                                                                        <CornerDownRight size={10} />
                                                                        <span>Répondre</span>
                                                                    </button>
                                                                    <span className="font-normal text-slate-400/70">{comment.timeAgo}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Nesting replies */}
                                                        {comment.replies && comment.replies.length > 0 && (
                                                            <div className="ml-10 space-y-2.5 border-l-2 border-slate-200/60 pl-3.5">
                                                                {comment.replies.map(reply => (
                                                                    <div key={reply.id} className="flex space-x-2 items-start">
                                                                        <img src={reply.authorAvatar} alt={reply.author} className="h-6 w-6 rounded-full object-cover flex-shrink-0" />
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="comment-bubble-reply">
                                                                                <div className="flex justify-between items-baseline mb-0.5">
                                                                                    <span className="text-[11px] font-bold text-slate-800">{reply.author}</span>
                                                                                    {currentUser?.id === reply.authorId && (
                                                                                        <button 
                                                                                            onClick={() => setCommentToDelete({ postId: post.id, commentId: reply.id })}
                                                                                            className="text-slate-400 hover:text-red-500 ml-3 transition"
                                                                                            title="Supprimer ma réponse"
                                                                                        >
                                                                                            <Trash2 size={10} />
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-slate-700 text-xs whitespace-pre-wrap break-words">{reply.content}</p>
                                                                            </div>
                                                                            <div className="flex items-center space-x-2 mt-0.5 pl-2 text-[9px] text-slate-400">
                                                                                <span className="font-normal">{reply.timeAgo}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-xs text-slate-400 italic">Aucun commentaire. Soyez le premier à réagir !</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 border-dashed">
                        <p className="text-slate-500">Aucune discussion trouvée pour ces critères.</p>
                    </div>
                )}
            </div>

            {/* --- MODALE DE CONFIRMATION DE SUPPRESSION POST --- */}
            {postToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setPostToDelete(null)} />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-4">
                                <AlertTriangle className="h-8 w-8 text-red-600 animate-pulse" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Supprimer cette publication ?</h3>
                            <p className="text-slate-500 text-xs mb-6">
                                Cette action supprimera définitivement le sujet et tous les commentaires associés.
                            </p>
                            <div className="flex w-full gap-3">
                                <button 
                                    onClick={() => setPostToDelete(null)} 
                                    disabled={isDeleting} 
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-sm transition"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={confirmDeletePost} 
                                    disabled={isDeleting} 
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 text-sm shadow-md transition"
                                >
                                    {isDeleting ? <Loader className="animate-spin h-4 w-4 mx-auto" /> : 'Supprimer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALE DE CONFIRMATION DE SUPPRESSION COMMENTAIRE --- */}
            {commentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !isDeleting && setCommentToDelete(null)} />
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 p-6 animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-100 p-3 rounded-full mb-4">
                                <Trash2 className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">Supprimer ce commentaire ?</h3>
                            <p className="text-slate-500 text-xs mb-6">Cette action est irréversible.</p>
                            <div className="flex w-full gap-3">
                                <button 
                                    onClick={() => setCommentToDelete(null)} 
                                    disabled={isDeleting} 
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 text-sm transition"
                                >
                                    Annuler
                                </button>
                                <button 
                                    onClick={confirmDeleteComment} 
                                    disabled={isDeleting} 
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 text-sm shadow-md transition"
                                >
                                    {isDeleting ? <Loader className="animate-spin h-4 w-4 mx-auto" /> : 'Supprimer'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALE DE CRÉATION DE SUJET (CREATE MODAL) --- */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-in fade-in zoom-in max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-55 sticky top-0 z-20">
                            <h3 className="font-extrabold text-lg text-slate-800">Créer une publication</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:bg-slate-100 rounded-full p-1.5 transition">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreatePost} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                            {/* Titre */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Titre du sujet</label>
                                <input 
                                    type="text" 
                                    value={newPostTitle} 
                                    onChange={(e) => setNewPostTitle(e.target.value)} 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" 
                                    placeholder="Ex: Comment fortifier sa foi au quotidien ?"
                                    required 
                                />
                            </div>

                            {/* Catégorie */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Catégorie</label>
                                <select 
                                    value={newPostCategory} 
                                    onChange={(e) => setNewPostCategory(e.target.value)} 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition bg-white"
                                >
                                    {CATEGORIES.filter(c => c.name !== 'Tout').map(cat => (
                                        <option key={cat.name} value={cat.name}>{cat.emoji} {cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ajouter une image</label>
                                <input 
                                    type="file" 
                                    ref={imageInputRef} 
                                    onChange={handleImageChange} 
                                    className="hidden" 
                                    accept="image/*" 
                                />
                                {!newPostImage ? (
                                    <button 
                                        type="button" 
                                        onClick={() => imageInputRef.current?.click()} 
                                        className={`w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center transition cursor-pointer ${imageError ? 'border-red-300 bg-red-50 text-red-500' : 'border-slate-200 hover:bg-slate-50 hover:border-emerald-400 text-slate-500'}`}
                                    >
                                        <ImageIcon size={28} className={`mb-2 ${imageError ? 'text-red-400 animate-bounce' : 'text-slate-400'}`} />
                                        <span className="text-xs font-bold">{imageError || "Cliquez pour sélectionner un fichier (Max 5 Mo)"}</span>
                                    </button>
                                ) : (
                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-48 flex items-center justify-center bg-slate-50">
                                        <img src={URL.createObjectURL(newPostImage)} className="w-full h-auto object-cover max-h-48" alt="Upload" />
                                        <button 
                                            type="button" 
                                            onClick={() => setNewPostImage(null)} 
                                            className="absolute top-2.5 right-2.5 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition shadow-md"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Contenu */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message</label>
                                <textarea 
                                    rows={5} 
                                    value={newPostContent} 
                                    onChange={(e) => setNewPostContent(e.target.value)} 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" 
                                    placeholder="Exprimez-vous avec bienveillance..."
                                    required 
                                />
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tags (séparés par des virgules)</label>
                                <input 
                                    type="text" 
                                    value={newPostTags} 
                                    onChange={(e) => setNewPostTags(e.target.value)} 
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition" 
                                    placeholder="Ex: foi, couple, priere, temoignage"
                                />
                            </div>

                            {/* Submit */}
                            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3 bg-white sticky bottom-0 z-20">
                                <button 
                                    type="button" 
                                    onClick={() => setIsCreateModalOpen(false)} 
                                    className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                                >
                                    Annuler
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-2.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition flex items-center justify-center" 
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader className="animate-spin h-4 w-4" /> : 'Publier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
