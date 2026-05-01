
import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw,
  Lightbulb,
  Clock,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AIKnowledge: React.FC = () => {
  const [memory, setMemory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchMemory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('cm_auth_token');
      const res = await fetch('/api/ai_memory', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMemory(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemory();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    try {
      const token = localStorage.getItem('cm_auth_token');
      await fetch('/api/ai_memory', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ content: newContent })
      });
      setNewContent('');
      setIsAdding(false);
      fetchMemory();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Excluir este conhecimento?')) return;
    try {
      const token = localStorage.getItem('cm_auth_token');
      await fetch(`/api/ai_memory/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchMemory();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredMemory = memory.filter(m => 
    (m.content || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Brain className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Base de Conhecimento IA</h1>
            <p className="text-gray-500 text-sm">Informações e contextos que a IA usará para responder</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Conhecimento
          </button>
          <button 
            onClick={fetchMemory}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Memory List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar na memória..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center p-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filteredMemory.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center text-gray-400">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum conhecimento armazenado ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemory.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-200 transition-colors relative group">
                  <div className="flex items-start gap-4 pr-10">
                    <div className="mt-1">
                      <Lightbulb className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{item.content}</p>
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        {item.trigger_at && (
                          <span className="flex items-center gap-1 text-blue-500 font-medium">
                            <Sparkles className="w-3 h-3" /> Gatilho em: {format(new Date(item.trigger_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="absolute right-3 top-4 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm group-hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info/Add Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-500" /> Como funciona?
            </h2>
            <ul className="space-y-3 text-sm text-gray-600 leading-relaxed">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                <span>As informações aqui salvas são enviadas como contexto para a IA em todas as conversas.</span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                <span>Você pode adicionar regras de negócio, dados de clientes, ou procedimentos da empresa.</span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0" />
                <span>A IA usará esses dados para ser mais assertiva e personalizada nas respostas.</span>
              </li>
            </ul>
          </div>

          <div className="bg-indigo-600 p-6 rounded-xl text-white shadow-lg shadow-indigo-200">
             <MessageSquare className="w-8 h-8 mb-4 opacity-50" />
             <h3 className="font-bold text-lg mb-2">Exemplo</h3>
             <p className="text-sm opacity-90 leading-relaxed italic">
               "Nossa política de folgas exige aviso prévio de 7 dias úteis via portal interno."
             </p>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Novo Conhecimento</h3>
              <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600">
                 <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <textarea 
                className="w-full h-40 p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Descreva o que a IA deve saber..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newContent.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIKnowledge;
