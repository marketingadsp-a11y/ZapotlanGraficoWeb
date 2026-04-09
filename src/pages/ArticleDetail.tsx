import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, increment, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article } from '@/types';
import PublicLayout from '@/components/Layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { Share2, MessageCircle, Eye, Facebook, Twitter, Link as LinkIcon, ArrowLeft, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { getSafeImageUrl } from '@/lib/utils';
import { useSettings } from '@/lib/SettingsContext';

export default function ArticleDetail() {
  const { settings } = useSettings();
  const { slug } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      const q = query(collection(db, 'articles'), where('slug', '==', slug));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Article;
        setArticle(data);
        
        // Increment views
        const articleRef = doc(db, 'articles', data.id);
        await updateDoc(articleRef, { views: increment(1) });

        // Log activity
        await addDoc(collection(db, 'activity'), {
          type: 'view',
          articleId: data.id,
          timestamp: Timestamp.now(),
          userId: 'anonymous'
        });
      }
      setLoading(false);
    };

    fetchArticle();
  }, [slug]);

  const handleShare = async (platform: string) => {
    if (!article) return;
    const url = window.location.href;
    
    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      toast.success('Enlace copiado al portapapeles');
    } else {
      // Log share activity
      await addDoc(collection(db, 'activity'), {
        type: 'share',
        articleId: article.id,
        timestamp: Timestamp.now(),
        userId: 'anonymous'
      });
      toast.info(`Compartiendo en ${platform}...`);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
        </div>
      </PublicLayout>
    );
  }

  if (!article) {
    return (
      <PublicLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center space-y-6">
          <div className="text-8xl font-black text-slate-200">404</div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">Nota no encontrada</h1>
          <Link to="/">
            <Button className="rounded-full bg-[#00AEEF] hover:bg-[#00AEEF]/90 px-8">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
            </Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <motion.article 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-4xl space-y-10"
        >
          {/* Breadcrumbs & Meta */}
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {article.categories?.map(cat => (
                <Badge key={cat} className="bg-[#ED1C24] text-white border-none px-4 py-1 text-[10px] font-black uppercase tracking-widest">
                  {cat}
                </Badge>
              ))}
            </div>
            
            <h1 className="text-4xl font-black leading-[1.1] tracking-tighter sm:text-5xl lg:text-6xl text-slate-900">
              {article.title}
            </h1>

            <p className="text-xl font-medium text-slate-500 leading-relaxed border-l-4 border-[#FFF200] pl-6">
              {article.summary}
            </p>

            <div className="flex flex-wrap items-center gap-6 py-4 border-y border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {settings.showAuthor !== false && (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[#00AEEF] flex items-center justify-center text-white font-black">
                    {article.author[0]}
                  </div>
                  <span className="text-slate-900">{article.author}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#ED1C24]" />
                <span>{format(article.createdAt.toDate(), "d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#00AEEF]" />
                <span>{article.views} vistas</span>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl">
            {article.videoUrl ? (
              <div className="aspect-video w-full">
                <iframe
                  src={article.videoUrl.includes('facebook.com') 
                    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(article.videoUrl)}&show_text=0&width=560`
                    : article.videoUrl.replace('watch?v=', 'embed/')
                  }
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <img
                src={getSafeImageUrl(article.imageUrl)}
                alt={article.title}
                className="w-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {/* Content Body */}
          <div className="grid gap-12 lg:grid-cols-[1fr_100px]">
            <div className="prose prose-slate prose-lg max-w-none 
              prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase
              prose-p:leading-relaxed prose-p:text-slate-600 prose-p:font-medium
              prose-strong:text-slate-900 prose-strong:font-black
              prose-a:text-[#00AEEF] prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-3xl prose-img:shadow-xl">
              <ReactMarkdown>{article.content}</ReactMarkdown>
            </div>

            {/* Sticky Sidebar Actions */}
            <aside className="hidden lg:block">
              <div className="sticky top-32 space-y-6">
                <div className="flex flex-col gap-3">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-14 w-14 rounded-2xl border-slate-200 hover:bg-[#00AEEF] hover:text-white hover:border-[#00AEEF] transition-all shadow-sm"
                    onClick={() => handleShare('facebook')}
                  >
                    <Facebook className="h-6 w-6" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-14 w-14 rounded-2xl border-slate-200 hover:bg-[#ED1C24] hover:text-white hover:border-[#ED1C24] transition-all shadow-sm"
                    onClick={() => handleShare('twitter')}
                  >
                    <Twitter className="h-6 w-6" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-14 w-14 rounded-2xl border-slate-200 hover:bg-[#FFF200] hover:text-slate-900 hover:border-[#FFF200] transition-all shadow-sm"
                    onClick={() => handleShare('copy')}
                  >
                    <LinkIcon className="h-6 w-6" />
                  </Button>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex flex-col items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <MessageCircle className="h-6 w-6 text-[#00AEEF]" />
                  <span>{article.interactions}</span>
                </div>
              </div>
            </aside>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center justify-center gap-6 border-t border-slate-100 py-10 lg:hidden">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-slate-100" onClick={() => handleShare('facebook')}>
              <Facebook className="h-5 w-5 text-[#00AEEF]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-slate-100" onClick={() => handleShare('twitter')}>
              <Twitter className="h-5 w-5 text-[#ED1C24]" />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-full bg-slate-100" onClick={() => handleShare('copy')}>
              <LinkIcon className="h-5 w-5 text-slate-600" />
            </Button>
          </div>
        </motion.article>
      </div>
    </PublicLayout>
  );
}
