import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { MessageCircle, Menu, X, Edit2, CheckCheck, Plus, Trash2, ImageIcon, Download, HardDrive } from 'lucide-react';
import { Column, Chat, Tag, Message } from '../types';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';

const socket = io('/', { transports: ['websocket', 'polling'] });

const AudioPlayer = ({ src }: { src: string }) => {
    return <audio controls src={src} className="w-full max-w-[250px]" />;
};

export default function Dashboard() {
  const [waStatus, setWaStatus] = useState('disconnected');
  const [columns, setColumns] = useState<Column[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#e2e8f0');
  
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editColumnName, setEditColumnName] = useState('');
  const [editColumnColor, setEditColumnColor] = useState('#e2e8f0');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(384);
  const isResizingRef = useRef(false);

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = document.body.clientWidth - e.clientX;
      if (newWidth > 300 && newWidth < 800) {
        setChatPanelWidth(newWidth);
      }
    };
    const handleMouseUp = () => { if (isResizingRef.current) { isResizingRef.current = false; document.body.style.cursor = ''; } };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp); };
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };
  useEffect(() => { scrollToBottom('auto'); }, [messages, selectedChat?.id]);

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('cm_auth_token') || 'admin';
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer session-123-${token}`);
    const res = await fetch(url, { ...options, headers });
    return res;
  };

  const fetchData = async () => {
    try {
      const [colsRes, chatsRes, tagsRes] = await Promise.all([
        apiFetch('/api/columns'), apiFetch('/api/chats'), apiFetch('/api/tags')
      ]);
      const columnsData = await colsRes.json();
      const chatsData = await chatsRes.json();
      const tagsData = await tagsRes.json();

      setColumns(Array.isArray(columnsData) ? columnsData : []);
      setChats(Array.isArray(chatsData) ? chatsData : []);
      setTags(Array.isArray(tagsData) ? tagsData : []);
      
      setSelectedChat((prev: Chat | null) => {
        if (!prev) return null;
        const updated = Array.isArray(chatsData) ? chatsData.find((c: Chat) => c.id === prev.id) : null;
        return updated ? { ...prev, ...updated } : prev;
      });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchData();
    socket.on('wa_status', (data) => { setWaStatus(data.status); });
    socket.on('columns_updated', fetchData);
    socket.on('tags_updated', fetchData);
    socket.on('chat_updated', fetchData);
    socket.on('new_chat', fetchData);
    socket.on('chat_deleted', (data: { id: string }) => {
      if (selectedChat?.id === data.id) setSelectedChat(null);
      fetchData();
    });
    socket.on('chat_tags_updated', fetchData);
    socket.on('new_message', (msg: Message) => {
      if (selectedChat && msg.chat_id === selectedChat.id) {
        setMessages(prev => [...prev, msg]);
      }
      fetchData();
    });
    return () => {
      socket.off('wa_status'); socket.off('columns_updated'); socket.off('tags_updated');
      socket.off('chat_updated'); socket.off('new_chat'); socket.off('chat_tags_updated'); socket.off('new_message');
    };
  }, [selectedChat]);

  const loadMessages = async (chatId: string) => {
    try {
      const res = await apiFetch(`/api/chats/${chatId}/messages`);
      setMessages(await res.json());
    } catch (e) {}
  };

  const handleChatSelect = async (chat: Chat) => {
    setSelectedChat(chat);
    setIsRightSidebarOpen(true);
    if (chat.unread_count > 0) {
      await apiFetch(`/api/chats/${chat.id}/read`, { method: 'PUT' });
      setChats(prev => (Array.isArray(prev) ? prev : []).map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c));
    }
    loadMessages(chat.id);
  };

  const handleDeleteChat = async (chatId: string) => {
    if (window.confirm('Excluir conversa?')) {
      await apiFetch(`/api/chats/${chatId}`, { method: 'DELETE' });
      if (selectedChat?.id === chatId) setSelectedChat(null);
      fetchData();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    try {
      await apiFetch(`/api/chats/${selectedChat.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: newMessage })
      });
      setNewMessage('');
    } catch (e) {}
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedChat) return;
    setUploadingMedia(true);
    const formData = new FormData();
    formData.append('media', file);
    if (newMessage.trim()) formData.append('body', newMessage);
    try {
      await apiFetch(`/api/chats/${selectedChat.id}/messages`, { method: 'POST', body: formData });
      setNewMessage('');
    } catch (e) {} finally { setUploadingMedia(false); }
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.files?.length > 0) handleFileUpload(e.dataTransfer.files[0]); };
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleMoveChat = async (chatId: string, columnId: string) => {
    try { await apiFetch(`/api/chats/${chatId}/column`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ column_id: columnId }) }); } catch (e) {}
  };

  const handleColumnDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('chatId');
    if (chatId) handleMoveChat(chatId, columnId);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    try {
      await apiFetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 'col-' + Date.now(), name: newColumnName, position: columns.length, color: newColumnColor })
      });
      setNewColumnName(''); setNewColumnColor('#e2e8f0'); setIsAddingColumn(false);
    } catch (error) {}
  };

  const handleEditColumn = async (columnId: string, oldPosition: number) => {
    if (!editColumnName.trim()) return;
    try {
      await apiFetch(`/api/columns/${columnId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editColumnName, position: oldPosition, color: editColumnColor })
      });
      setEditingColumnId(null);
    } catch (error) {}
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (columns.length <= 1) return alert('Não é possível excluir a última coluna.');
    if (window.confirm('Excluir esta coluna? Os chats serão movidos.')) {
      await apiFetch(`/api/columns/${columnId}`, { method: 'DELETE' });
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    await apiFetch('/api/tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'tag-' + Date.now(), name: newTagName, color: newTagColor }) });
    setNewTagName(''); setIsAddingTag(false);
  };

  const filteredChats = chats.filter(c => {
    const matchesTags = selectedTagFilters.length === 0 || selectedTagFilters.some(t => c.tag_ids?.includes(t));
    const matchesSearch = searchQuery === '' || 
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.last_message && c.last_message.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTags && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full absolute inset-0 -top-6 -left-6 -right-6 min-w-0 bg-[#f3f4f6]">
      {/* Top Bar for Search and Tags (To save lateral space) */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 border-b border-gray-200 z-10 shadow-sm shrink-0">
        <div className="flex gap-4 items-center flex-1 max-w-xl">
          <input
            type="text"
            placeholder="Buscar chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 shadow-inner bg-gray-50"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">Tags:</span>
          {(tags || []).map(tag => {
            const isSelected = selectedTagFilters.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => setSelectedTagFilters(prev => isSelected ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                className={`text-xs px-3 py-1.5 rounded-full border flex items-center gap-1.5 shadow-sm transition-all ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }}></div>
                {tag.name}
              </button>
            );
          })}
          {isAddingTag ? (
             <div className="flex items-center gap-1 bg-white p-1 rounded-full border shadow-sm">
                <input type="text" value={newTagName} onChange={e=>setNewTagName(e.target.value)} placeholder="Nova tag" className="w-20 text-xs px-2 focus:outline-none" />
                <input type="color" value={newTagColor} onChange={e=>setNewTagColor(e.target.value)} className="w-5 h-5 border-0 p-0 rounded-full" />
                <button onClick={handleAddTag} className="text-blue-500 p-1 hover:bg-blue-50 rounded-full"><CheckCheck size={14}/></button>
                <button onClick={()=>setIsAddingTag(false)} className="text-gray-400 p-1 hover:bg-gray-50 rounded-full"><X size={14}/></button>
             </div>
          ) : (
             <button onClick={() => setIsAddingTag(true)} className="text-xs px-3 py-1.5 rounded-full border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center gap-1 transition-colors bg-white">
                <Plus size={14} /> Tag
             </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex gap-6 items-start items-stretch">
        {(columns || []).map(column => (
          <div 
            key={column.id} 
            className="flex-shrink-0 w-[300px] bg-slate-100/50 rounded-2xl border border-slate-200/60 flex flex-col max-h-full overflow-hidden shadow-sm"
            onDrop={(e) => handleColumnDrop(e, column.id)}
            onDragOver={handleDragOver}
          >
            <div 
              className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-100/80 group"
              style={{ borderTop: `4px solid ${column.color || '#cbd5e1'}` }}
            >
              {editingColumnId === column.id ? (
                 <div className="flex-1 flex flex-col gap-2">
                   <input type="text" value={editColumnName} onChange={(e) => setEditColumnName(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none" />
                   <div className="flex items-center gap-2">
                     <input type="color" value={editColumnColor} onChange={(e) => setEditColumnColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                     <button onClick={() => handleEditColumn(column.id, column.position)} className="text-blue-600 text-xs font-medium">Salvar</button>
                     <button onClick={() => setEditingColumnId(null)} className="text-gray-500 text-xs font-medium">Cancel</button>
                     <button onClick={() => handleDeleteColumn(column.id)} className="text-red-600 text-xs font-medium ml-auto"><Trash2 size={14}/></button>
                   </div>
                 </div>
              ) : (
                <h3 className="font-semibold text-slate-700 flex-1 flex items-center gap-2 cursor-pointer hover:text-emerald-600" onClick={()=>{setEditingColumnId(column.id); setEditColumnName(column.name); setEditColumnColor(column.color || '#cbd5e1');}}>
                  <span className="w-3 h-3 rounded-full shadow-sm border border-slate-200" style={{ backgroundColor: column.color || '#e2e8f0' }}></span>
                  <span className="tracking-tight">{column.name}</span>
                </h3>
              )}
              {editingColumnId !== column.id && (
                <span className="bg-white text-slate-500 shadow-sm border border-slate-200 text-xs px-2.5 py-0.5 rounded-full font-bold ml-2">
                  {filteredChats.filter(c => c.column_id === column.id).length}
                </span>
              )}
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto space-y-3 no-scrollbar custom-column-scroll">
              {(filteredChats || []).filter(c => c.column_id === column.id).map(chat => (
                <div 
                  key={chat.id} 
                  onClick={() => handleChatSelect(chat)}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('chatId', chat.id)}
                  className={`group bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md hover:border-slate-300 transition-all ${selectedChat?.id === chat.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200'} flex flex-col relative`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {chat.profile_pic ? (
                        <img src={chat.profile_pic} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold flex-shrink-0">
                           {chat.name ? chat.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <h4 className="font-semibold text-slate-800 tracking-tight truncate pr-2 flex items-center gap-1 group/name">
                        {chat.name || chat.phone}
                      </h4>
                    </div>
                    {chat.unread_count > 0 && (
                      <span className="bg-emerald-500 text-white shadow-sm text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mb-3 flex items-center gap-1.5 opacity-90 leading-relaxed">
                    {chat.last_message_from_me === 1 && <CheckCheck size={14} className="text-sky-500 flex-shrink-0" />}
                    <span className="truncate">{chat.last_message}</span>
                  </p>
                  
                  <div className="flex justify-between items-center mt-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {chat.tag_ids?.map((tagId: string) => {
                        const tag = tags.find(t => t.id === tagId);
                        if (!tag) return null;
                        return (
                          <div key={tagId} className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-600 shadow-sm">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                            <span>{tag.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {isAddingColumn ? (
            <div className="flex-shrink-0 w-[300px] bg-white p-4 rounded-2xl border shadow-sm">
              <input type="text" value={newColumnName} onChange={e=>setNewColumnName(e.target.value)} placeholder="Nova coluna" className="w-full border rounded-lg px-3 py-2 text-sm mb-3 autoFocus bg-gray-50"/>
              <div className="flex gap-2">
                <button onClick={handleAddColumn} className="bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg flex-1">Salvar</button>
                <button onClick={()=>setIsAddingColumn(false)} className="bg-gray-100 text-gray-600 text-xs px-4 py-2 rounded-lg flex-1">Cancelar</button>
              </div>
            </div>
        ) : (
            <button onClick={() => setIsAddingColumn(true)} className="flex-shrink-0 w-[300px] h-12 flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors">
               <Plus size={20}/> Nova Coluna
            </button>
        )}
        </div>

        {/* Chat Panel */}
        {selectedChat && isRightSidebarOpen && (
          <div 
            className="bg-white border-l border-slate-200 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.05)] z-20 relative flex-shrink-0"
            style={{ width: `${chatPanelWidth}px` }}
          >
            <div 
              className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-emerald-400 opacity-50 z-30 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); isResizingRef.current = true; document.body.style.cursor = 'col-resize'; }}
            />
            <div className="p-4 border-b border-slate-100 flex flex-col bg-white">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                     {selectedChat.profile_pic ? <img src={selectedChat.profile_pic} alt="" className="w-full h-full object-cover" /> : selectedChat.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{selectedChat.name || selectedChat.phone}</h3>
                    <p className="text-sm text-slate-500">{selectedChat.phone}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleDeleteChat(selectedChat.id)} className="text-red-400 hover:bg-red-50 p-2 rounded-md"><Trash2 size={20} /></button>
                  <button onClick={() => setSelectedChat(null)} className="text-gray-400 hover:bg-gray-100 p-2 rounded-md"><X size={20} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 items-center">
                {selectedChat.tag_ids?.map((tagId: string) => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                      <span key={tagId} className="text-[10px] px-2 py-0.5 rounded-full text-white flex items-center gap-1" style={{ backgroundColor: tag.color }}>
                        {tag.name}
                        <X size={10} className="cursor-pointer hover:text-red-200" onClick={async () => {
                            await apiFetch(`/api/chats/${selectedChat.id}/tags/${tagId}`, {method:'DELETE'});
                        }} />
                      </span>
                  );
                })}
                <div className="relative">
                  <button onClick={() => {
                        const newTagId = prompt("Enter tag ID from the tags list");
                        if(newTagId) apiFetch(`/api/chats/${selectedChat.id}/tags`, {method:'POST', body: JSON.stringify({tag_id: newTagId}), headers:{'Content-Type':'application/json'}});
                  }} className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full hover:bg-gray-300 flex items-center gap-1">
                    <Plus size={10} /> Add Tag
                  </button>
                </div>
              </div>
            </div>
            
            <div ref={chatScrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]" onDrop={handleDrop} onDragOver={handleDragOver} style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundRepeat: 'repeat', backgroundSize: '400px' }}>
              {(messages || []).map((msg, index) => {
                const currentMsgDate = new Date(msg.timestamp);
                const prevMsgDate = index > 0 ? new Date(messages[index - 1].timestamp) : null;
                const showDateSeparator = !prevMsgDate || !isSameDay(currentMsgDate, prevMsgDate);

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-4">
                        <span className="bg-[#e1f3fb] border border-[#d6eaf5] text-slate-600 font-medium text-[11px] uppercase px-3 py-1 rounded-lg">
                          {isToday(currentMsgDate) ? 'Hoje' : isYesterday(currentMsgDate) ? 'Ontem' : format(currentMsgDate, 'dd/MM/yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 text-[14px] leading-relaxed shadow-sm flex flex-col ${msg.from_me ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                        {msg.media_url && (
                          <div className="mb-2">
                            {msg.media_type?.startsWith('image/') ? (
                              <img src={msg.media_url} alt="Media" className="max-w-full rounded-md max-h-64 object-contain cursor-pointer" onClick={() => setZoomedImage(msg.media_url!)} />
                            ) : msg.media_type?.startsWith('audio/') ? (
                              <AudioPlayer src={msg.media_url} />
                            ) : (
                              <a href={msg.media_url} target="_blank" className="flex items-center gap-3 p-3 rounded-lg border bg-black/5 hover:bg-black/10"><span className="text-2xl">📄</span><span className="truncate max-w-[200px]">{msg.media_name||'Documento'}</span></a>
                            )}
                          </div>
                        )}
                        {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                        <span className={`text-[10px] font-medium block text-right mt-1 ${msg.from_me ? 'text-gray-500' : 'text-gray-400'}`}>
                          {format(new Date(msg.timestamp), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              {uploadingMedia && (
                <div className="flex justify-end"><div className="bg-[#dcf8c6] px-4 py-2 rounded-lg text-sm italic opacity-70 flex items-center gap-2"><div className="animate-spin h-3 w-3 border-b-2 border-emerald-500 rounded-full" /> Enviando...</div></div>
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="p-3 border-t bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <label className="cursor-pointer text-slate-400 p-2 hover:bg-slate-100 rounded-full flex items-center justify-center">
                  <Plus size={22} /><input type="file" className="hidden" onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} />
                </label>
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Digite ou arraste arquivo..." className="flex-1 bg-slate-50 border rounded-full px-4 text-sm focus:border-emerald-500 focus:outline-none" />
                <button type="submit" disabled={!newMessage.trim() && !uploadingMedia} className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center disabled:opacity-50"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="ml-1"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg></button>
              </form>
            </div>
          </div>
        )}
      </div>
      
      {zoomedImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <button className="absolute top-4 right-4 text-white"><X size={32} /></button>
          <img src={zoomedImage} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
}
