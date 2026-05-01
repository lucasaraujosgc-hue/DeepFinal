
import React, { useState, useEffect } from 'react';
import { 
  File, 
  Download, 
  Trash2, 
  Search, 
  RefreshCw,
  Image as ImageIcon,
  FileText,
  Video,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MediaGallery: React.FC = () => {
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('cm_auth_token');
      const res = await fetch('/api/media', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMedia(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este arquivo permanentemente?')) return;
    try {
      const token = localStorage.getItem('cm_auth_token');
      await fetch(`/api/media/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchMedia();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredMedia = media.filter(m => 
    (m.media_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.chat_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const getIcon = (type: string) => {
    if (type?.includes('image')) return <ImageIcon className="text-blue-500" />;
    if (type?.includes('video')) return <Video className="text-purple-500" />;
    return <FileText className="text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Galeria de Arquivos</h1>
          <p className="text-gray-500 text-sm">Gerencie todos os arquivos trocados via WhatsApp</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou contato..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchMedia}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center text-gray-400">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Nenhum arquivo encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
              <div className="aspect-video bg-gray-100 flex items-center justify-center relative overflow-hidden">
                {item.media_type?.includes('image') ? (
                  <img 
                    src={item.media_url} 
                    alt={item.media_name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    {getIcon(item.media_type)}
                    <span className="text-[10px] text-gray-400 font-mono text-center px-4 line-clamp-1">{item.media_type}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <a 
                    href={item.media_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 bg-white rounded-full text-gray-800 hover:bg-blue-50"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-800 text-sm line-clamp-1 flex-1" title={item.media_name}>
                    {item.media_name || 'Sem nome'}
                  </h3>
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-700">De:</span> {item.chat_name || item.chat_phone}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-700">Data:</span> {format(new Date(item.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-700">Tamanho:</span> {(item.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
