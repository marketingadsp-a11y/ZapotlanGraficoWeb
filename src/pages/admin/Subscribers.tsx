import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Subscriber } from '@/types';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Download, 
  Trash2, 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Phone,
  User,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const q = query(collection(db, 'subscribers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subsList: Subscriber[] = [];
      snapshot.forEach((doc) => {
        subsList.push({ id: doc.id, ...doc.data() } as Subscriber);
      });
      setSubscribers(subsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching subscribers:", error);
      toast.error("Error al cargar la lista de suscriptores.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter subscribers based on search query (by Name or phone number)
  const filteredSubscribers = subscribers.filter(sub => {
    const queryClean = searchQuery.toLowerCase().trim();
    if (!queryClean) return true;
    return (
      sub.name.toLowerCase().includes(queryClean) ||
      sub.phoneNumber.includes(queryClean)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
  const paginatedSubscribers = filteredSubscribers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    // Reset page on search
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDeleteSub = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas dar de baja a ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'subscribers', id));
        toast.success(`Se ha dado de baja a ${name} correctamente.`);
      } catch (error) {
        console.error("Error deleting subscriber:", error);
        toast.error("No se pudo dar de baja al suscriptor.");
      }
    }
  };

  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      toast.warning("No hay suscriptores registrados para exportar.");
      return;
    }

    try {
      // Define BOM representing UTF-8 clearly to allow Excel to render accents correctly in Spanish
      const BOM = "\uFEFF";
      
      // Header matching Excel localization standards
      let csvContent = "Nombre,Número Celular,Fecha de Registro\n";
      
      subscribers.forEach(sub => {
        const formattedDate = sub.createdAt 
          ? format(sub.createdAt.toDate(), "dd/MM/yyyy HH:mm:ss") 
          : "N/A";
        
        // Escape dynamic spaces and quotes safely
        const escapedName = `"${sub.name.replace(/"/g, '""')}"`;
        const escapedPhone = `"${sub.phoneNumber}"`;
        
        csvContent += `${escapedName},${escapedPhone},${formattedDate}\n`;
      });

      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      link.setAttribute("href", url);
      link.setAttribute("download", `suscriptores_zapotlan_grafico_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Excel (CSV) generado con éxito. Revisa tus descargas.");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Error al exportar los datos.");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Listado de Suscriptores</h1>
            <p className="text-sm font-medium text-slate-500">Administra y exporta tu base de datos de usuarios para promociones del comercio local.</p>
          </div>
          
          <Button 
            onClick={handleExportCSV}
            className="h-14 bg-green-600 text-white hover:bg-green-700 rounded-2xl px-6 shadow-lg shadow-green-100 transition-all font-black text-xs uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Download className="h-4 w-4" />
            Exportar a Excel
          </Button>
        </div>

        {/* Highlight Stats Bar */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total de Suscriptores</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{subscribers.length}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-[#00AEEF]/10 text-[#00AEEF] flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Coincidencias en Búsqueda</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{filteredSubscribers.length}</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-[#ED1C24]/10 text-[#ED1C24] flex items-center justify-center">
                <Activity className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white overflow-hidden group">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Estatus del Canal</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                  <p className="text-xs font-black text-green-500 uppercase tracking-wider">Activo & Recibiendo</p>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-green-50 text-green-500 flex items-center justify-center border border-green-100">
                <Phone className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Table Card */}
        <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b border-slate-50 p-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Base de Datos de Lectores</CardTitle>
              <CardDescription className="text-xs font-medium text-slate-400">Total de números verificados de 10 dígitos.</CardDescription>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              <Input 
                type="text"
                placeholder="Buscar por nombre o celular..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white text-xs font-bold transition-all"
              />
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#00AEEF] border-t-transparent"></div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-2">Cargando suscriptores...</p>
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                  <Users className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <p className="font-black text-slate-900 text-sm">No se encontraron suscriptores</p>
                  <p className="text-xs font-medium text-slate-400">Prueba con un término de búsqueda distinto u ofrece incentivos en el sitio público.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableRow className="border-b border-slate-50">
                      <TableHead className="h-14 font-black uppercase tracking-widest text-slate-400 text-[9px] px-8">Lector</TableHead>
                      <TableHead className="h-14 font-black uppercase tracking-widest text-slate-400 text-[9px]">Número Celular</TableHead>
                      <TableHead className="h-14 font-black uppercase tracking-widest text-slate-400 text-[9px]">Fecha de Registro</TableHead>
                      <TableHead className="h-14 font-black uppercase tracking-widest text-slate-400 text-[9px] text-right px-8">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {paginatedSubscribers.map((sub) => (
                        <TableRow 
                          key={sub.id} 
                          className="border-b border-slate-50/80 hover:bg-slate-50/30 transition-colors group"
                        >
                          {/* Name / User */}
                          <TableCell className="py-4 px-8 font-black text-sm text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[#00AEEF]/10 group-hover:text-[#00AEEF] transition-all">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="tracking-tight leading-none">{sub.name}</span>
                            </div>
                          </TableCell>

                          {/* 10 Digit Phone */}
                          <TableCell className="py-4 text-slate-500 font-mono font-bold text-xs">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-[#ED1C24] opacity-50" />
                              <span>{sub.phoneNumber}</span>
                              <Badge className="bg-green-50 text-green-600 hover:bg-green-50 border-none rounded-full ml-1 font-bold text-[8px] uppercase tracking-wider scale-90">
                                10 Dígitos
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Created date */}
                          <TableCell className="py-4 text-slate-400 font-bold text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-slate-300" />
                              <span>
                                {sub.createdAt 
                                  ? format(sub.createdAt.toDate(), "dd MMM, yyyy HH:mm", { locale: es }) 
                                  : "N/A"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-4 text-right px-8">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSub(sub.id, sub.name)}
                              className="h-10 w-10 text-slate-400 hover:text-brand-red hover:bg-red-50 rounded-xl transition-all"
                              title="Dar de baja"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination block */}
            {totalPages > 1 && (
              <div className="p-8 border-t border-slate-50 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Página {currentPage} de {totalPages} • Mostrando {paginatedSubscribers.length} de {filteredSubscribers.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-10 w-10 rounded-xl hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-10 w-10 rounded-xl hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
