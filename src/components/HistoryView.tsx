import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Order, Payment, Client } from '../types';
import { ShoppingCart, DollarSign, Clock, User as UserIcon, ArrowDownCircle, Calendar, XCircle } from 'lucide-react';

export default function HistoryView({ user }: { user: User }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  
  // Date Filter State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Fetch clients to map names
    const qClients = query(collection(db, 'clients'), where('agentId', '==', user.uid));
    const unsubClients = onSnapshot(qClients, (s) => {
      const map: Record<string, string> = {};
      s.docs.forEach(d => map[d.id] = d.data().name);
      setClients(map);
    });

    // We fetch a larger window to allow for client-side filtering of the "recent" items, 
    // or we could implement dynamic queries. For now, we'll fetch more to make the UI snappy.
    const qOrders = query(collection(db, 'orders'), where('agentId', '==', user.uid), orderBy('createdAt', 'desc'), limit(100));
    const qPayments = query(collection(db, 'payments'), where('agentId', '==', user.uid), orderBy('createdAt', 'desc'), limit(100));
    const qReceipts = query(collection(db, 'receipts'), where('agentId', '==', user.uid), orderBy('createdAt', 'desc'), limit(100));

    let _orders: any[] = [];
    let _payments: any[] = [];
    let _receipts: any[] = [];

    const updateActivities = () => {
      const combined = [..._orders, ..._payments, ..._receipts].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setActivities(combined);
    };

    const unsubOrders = onSnapshot(qOrders, (s) => {
      _orders = s.docs.map(d => ({ id: d.id, type: 'order', ...d.data() }));
      updateActivities();
    });

    const unsubPayments = onSnapshot(qPayments, (s) => {
      _payments = s.docs.map(d => ({ id: d.id, type: 'payment', ...d.data() }));
      updateActivities();
    });

    const unsubReceipts = onSnapshot(qReceipts, (s) => {
      _receipts = s.docs.map(d => ({ id: d.id, type: 'receipt', ...d.data() }));
      updateActivities();
    });

    return () => {
      unsubClients();
      unsubOrders();
      unsubPayments();
      unsubReceipts();
    };
  }, [user.uid]);

  const filteredActivities = useMemo(() => {
    if (!startDate && !endDate) return activities;

    return activities.filter(activity => {
      const activityDate = activity.createdAt?.toDate?.() || new Date(0);
      
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (activityDate < start) return false;
      }
      
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (activityDate > end) return false;
      }
      
      return true;
    });
  }, [activities, startDate, endDate]);

  const formatDate = (ts: any) => {
    if (!ts) return '...';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 rounded-3xl p-6 text-white mb-4">
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Последние действия</p>
        <h2 className="text-2xl font-bold">Активность</h2>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-zinc-50 space-y-3">
        <div className="flex items-center gap-2 text-zinc-400 mb-1">
          <Calendar size={14} />
          <span className="text-[10px] font-bold uppercase">Фильтр по дате</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex-1 space-y-1">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs p-2 bg-zinc-50 rounded-xl border-none focus:ring-1 focus:ring-zinc-200 font-medium"
            />
          </div>
          <div className="text-zinc-300">—</div>
          <div className="flex-1 space-y-1">
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs p-2 bg-zinc-50 rounded-xl border-none focus:ring-1 focus:ring-zinc-200 font-medium"
            />
          </div>
          {(startDate || endDate) && (
            <button 
              onClick={clearFilters}
              className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
            >
              <XCircle size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 pb-24">
        {filteredActivities.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-3xl shadow-sm border border-zinc-50 flex gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              item.type === 'order' ? 'bg-zinc-100 text-zinc-900' : 
              item.type === 'payment' ? 'bg-green-50 text-green-600' :
              'bg-emerald-50 text-emerald-600'
            }`}>
              {item.type === 'order' && <ShoppingCart size={22} />}
              {item.type === 'payment' && <DollarSign size={22} />}
              {item.type === 'receipt' && <ArrowDownCircle size={22} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight mb-0.5">
                    {item.type === 'order' ? 'Продажа' : 
                     item.type === 'payment' ? `Оплата (${item.method === 'cash' ? 'Нал.' : item.method === 'transfer' ? 'Пер.' : 'Счет'})` : 
                     'Приемка товаров'}
                  </p>
                  <h4 className="font-bold text-zinc-900 leading-tight">
                    {item.type === 'receipt' ? item.source : (clients[item.clientId] || 'Загрузка...')}
                  </h4>
                </div>
                <div className="text-right">
                   <p className={`font-bold ${
                     item.type === 'order' ? 'text-zinc-900' : 'text-green-600'
                   }`}>
                    {item.type === 'order' ? '-' : '+'}{item.amount || item.totalAmount || item.quantity?.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium">{formatDate(item.createdAt)}</p>
                </div>
              </div>
              {item.type === 'order' && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.items?.map((p: any, idx: number) => (
                    <span key={idx} className="text-[10px] bg-zinc-50 px-2 py-0.5 rounded-full text-zinc-500 border border-zinc-100">
                      {p.name} x{p.quantity}
                    </span>
                  ))}
                </div>
              )}
              {item.type === 'receipt' && (
                <div className="mt-2">
                   <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full text-emerald-600 border border-emerald-100 font-bold">
                      {item.productName} +{item.quantity}
                    </span>
                </div>
              )}
              {item.note && (
                <p className="mt-2 text-xs text-zinc-500 italic">“{item.note}”</p>
              )}
            </div>
          </div>
        ))}

        {filteredActivities.length === 0 && (
          <div className="py-20 text-center space-y-3">
            <Clock className="w-12 h-12 text-zinc-200 mx-auto" />
            <p className="text-zinc-400 font-medium font-sans">
              {(startDate || endDate) ? 'В этом диапазоне ничего не найдено' : 'История пуста'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
