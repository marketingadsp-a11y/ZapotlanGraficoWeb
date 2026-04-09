import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Article } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, ExternalLink, Plus, Search, Filter, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { getSafeImageUrl } from '@/lib/utils';

export default function ArticleList() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Article)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = async (id: string) => {
    // Using a simple confirm for now, but styled better in the future
    if (window.confirm('¿Estás seguro de eliminar esta nota?')) {
      try {
        await deleteDoc(doc(db, 'articles', id));
        toast.success('Nota eliminada correctamente');
      } catch (error) {
        toast.error('Error al eliminar la nota');
      }
    }
  };

  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Artículos</h1>
            <p className="text-sm font-medium text-slate-500">Gestiona y publica tus notas periodísticas.</p>
          </div>
          <Link to="/admin/articulos/nuevo">
            <Button className="rounded-full bg-[#00AEEF] hover:bg-[#00AEEF]/90 text-white font-black uppercase tracking-widest px-6 shadow-lg shadow-[#00AEEF]/20">
              <Plus className="mr-2 h-4 w-4" /> Nueva Nota
            </Button>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Buscar por título o autor..." 
              className="pl-10 rounded-2xl border-slate-100 bg-white shadow-sm focus:ring-[#00AEEF]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="rounded-2xl border-slate-100 bg-white text-slate-600 font-bold">
            <Filter className="mr-2 h-4 w-4" /> Filtros
          </Button>
        </div>

        <div className="rounded-[2rem] border-none bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-50">
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6">Artículo</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Categorías</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400">Fecha</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">Rendimiento</TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredArticles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium">
                    No se encontraron artículos.
                  </TableCell>
                </TableRow>
              ) : (
                filteredArticles.map((article) => (
                  <TableRow key={article.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                    <TableCell className="py-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                          <img 
                            src={getSafeImageUrl(article.imageUrl)} 
                            alt="" 
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 truncate max-w-[200px] lg:max-w-md">{article.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{article.author}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {article.categories?.slice(0, 2).map(cat => (
                          <Badge key={cat} variant="secondary" className="bg-slate-100 text-slate-600 border-none text-[9px] font-black uppercase tracking-widest px-2">
                            {cat}
                          </Badge>
                        ))}
                        {article.categories && article.categories.length > 2 && (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-400 border-none text-[9px] font-black uppercase tracking-widest px-2">
                            +{article.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {format(article.createdAt.toDate(), "d MMM, yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-4 text-[10px] font-black">
                        <span className="flex items-center gap-1 text-[#00AEEF]"><Eye className="h-3 w-3" /> {article.views}</span>
                        <span className="flex items-center gap-1 text-[#ED1C24]"><MessageCircle className="h-3 w-3" /> {article.interactions}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link to={`/nota/${article.slug}`} target="_blank">
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-[#FFF200]/20 hover:text-slate-900">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to={`/admin/articulos/editar/${article.id}`}>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-[#00AEEF]/10 hover:text-[#00AEEF]">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-xl hover:bg-[#ED1C24]/10 hover:text-[#ED1C24]"
                          onClick={() => handleDelete(article.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}

