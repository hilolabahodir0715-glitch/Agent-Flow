import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, increment, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Client, Product, Order, Payment } from '../types';
import { Search, Plus, User as UserIcon, Phone, MapPin, DollarSign, ChevronRight, ShoppingCart, ArrowLeft, X, Save, AlertCircle, Bell, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientsView({ user }: { user: User }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isRenamingReminder, setIsRenamingReminder] = useState(false); // Using for naming consistency but it's adding reminder
  const [isSettingReminder, setIsSettingReminder] = useState(false);

  // Defer the search term to allow for smoother typing (asynchronous rendering)
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // New Client Form State
  // ...
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'clients'), where('agentId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(docs);
    }, (err) => handleFirestoreError(err, 'list', 'clients'));
    return unsubscribe;
  }, [user.uid]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'clients'), {
        name: newName,
        phone: newPhone,
        address: newAddress,
        balance: 0,
        agentId: user.uid,
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewName('');
      setNewPhone('');
      setNewAddress('');
    } catch (err) {
      handleFirestoreError(err, 'create', 'clients');
    }
  };

  const filteredClients = useMemo(() => {
    const cleanSearch = deferredSearchTerm.trim().toLowerCase();
    if (!cleanSearch) return clients;

    return clients.filter(c => 
      c.name.toLowerCase().includes(cleanSearch) || 
      (c.phone && c.phone.toLowerCase().includes(cleanSearch))
    );
  }, [clients, deferredSearchTerm]);

  const isStale = searchTerm !== deferredSearchTerm;

  return (
    <div className="space-y-4">
      {/* Search & Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isStale ? 'text-zinc-500' : 'text-zinc-400'}`} size={18} />
          <input 
            type="text" 
            placeholder="Поиск клиентов..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-none focus:ring-2 focus:ring-zinc-200 transition-all shadow-sm ${isStale ? 'opacity-70' : 'opacity-100'}`}
          />
          {isStale && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-3 bg-zinc-900 text-white rounded-2xl shadow-lg shadow-zinc-200 active:scale-95 transition-transform"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Client List */}
      <div className="space-y-3 min-h-[200px]">
        <AnimatePresence initial={false}>
          {filteredClients.map((client) => (
            <motion.div 
              key={client.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setSelectedClient(client)}
              className="bg-white p-4 rounded-3xl shadow-sm border border-zinc-50 active:scale-95 transition-transform cursor-pointer flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-600">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900">{client.name}</h3>
                  <p className="text-xs text-zinc-400 font-medium">{client.phone || 'Нет телефона'}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${client.balance < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                  {client.balance.toLocaleString()} сум
                </div>
                <ChevronRight size={16} className="text-zinc-300 ml-auto" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredClients.length === 0 && !isStale && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
               <AlertCircle className="text-zinc-200" size={32} />
            </div>
            <p className="text-zinc-400 font-medium">Ничего не найдено</p>
            <p className="text-xs text-zinc-300">Попробуйте изменить запрос</p>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAdding && (
          <Modal onClose={() => setIsAdding(false)} title="Новый клиент">
            <form onSubmit={handleAddClient} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Имя Клиента</label>
                <input 
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200" 
                  placeholder="ООО 'Пример' или Иван Иванов"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Телефон</label>
                <input 
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200" 
                  placeholder="+998 90..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Адрес</label>
                <textarea 
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200" 
                  placeholder="Улица, ориентир..."
                />
              </div>
              <button className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold mt-4 shadow-xl shadow-zinc-200">
                Создать клиента
              </button>
            </form>
          </Modal>
        )}

        {selectedClient && !isOrdering && !isPaying && (
          <Modal onClose={() => setSelectedClient(null)} title={selectedClient.name}>
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-50 p-4 rounded-3xl">
                  <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Баланс</p>
                  <p className={`text-lg font-bold ${selectedClient.balance < 0 ? 'text-red-500' : 'text-zinc-900'}`}>
                    {selectedClient.balance.toLocaleString()}
                  </p>
                </div>
                <div className="bg-zinc-50 p-4 rounded-3xl flex items-center justify-center">
                   <Phone className="text-zinc-400 mr-2" size={16} />
                   <span className="text-sm font-medium">{selectedClient.phone || '—'}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button 
                  onClick={() => setIsOrdering(true)}
                  className="w-full py-4 px-6 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-100 rounded-xl"><ShoppingCart size={20} /></div>
                    Новый заказ
                  </div>
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => setIsPaying(true)}
                  className="w-full py-4 px-6 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 text-green-600 rounded-xl"><DollarSign size={20} /></div>
                    Принять оплату
                  </div>
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => setIsSettingReminder(true)}
                  className="w-full py-4 px-6 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><Bell size={20} /></div>
                    Поставить задачу
                  </div>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </Modal>
        )}

        {selectedClient && isOrdering && (
           <OrderModal 
            client={selectedClient} 
            user={user} 
            onClose={() => setIsOrdering(false)} 
            onSuccess={() => { setIsOrdering(false); setSelectedClient(null); }}
          />
        )}

        {selectedClient && isPaying && (
           <PaymentModal 
            client={selectedClient} 
            user={user} 
            onClose={() => setIsPaying(false)} 
            onSuccess={() => { setIsPaying(false); setSelectedClient(null); }}
          />
        )}

        {selectedClient && isSettingReminder && (
          <ReminderModal 
            client={selectedClient} 
            user={user} 
            onClose={() => setIsSettingReminder(false)} 
            onSuccess={() => { setIsSettingReminder(false); setSelectedClient(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode, onClose: () => void, title: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 backdrop-blur-sm p-4"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-white rounded-t-[40px] rounded-b-[20px] p-8 pb-10 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-zinc-900">{title}</h2>
          <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full text-zinc-500"><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function OrderModal({ client, user, onClose, onSuccess }: { client: Client, user: User, onClose: () => void, onSuccess: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'products'), where('agentId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (s) => {
      setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    });
    return unsubscribe;
  }, [user.uid]);

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  const handleCreateOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const orderData = {
        clientId: client.id,
        agentId: user.uid,
        items: cart.map(i => ({
          productId: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.price
        })),
        totalAmount: total,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'orders'), orderData);
      
      // Update stock for each item
      for (const item of cart) {
        await updateDoc(doc(db, 'products', item.product.id!), {
          stock: increment(-item.quantity)
        });
      }

      // Update client balance (negative means they owe money)
      await updateDoc(doc(db, 'clients', client.id!), {
        balance: increment(-total)
      });
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, 'create', 'orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Новый заказ">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {products.map(product => {
          const cartItem = cart.find(i => i.product.id === product.id);
          return (
            <div key={product.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-2xl">
              <div>
                <p className="font-bold text-zinc-800">{product.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-zinc-400">{product.price.toLocaleString()} сум / {product.unit}</p>
                  <span className={`text-[10px] font-bold px-1.5 rounded-md ${product.stock <= 0 ? 'bg-red-50 text-red-500' : 'bg-zinc-100 text-zinc-500'}`}>
                    Склад: {product.stock || 0}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                    setCart(prev => {
                      const existing = prev.find(i => i.product.id === product.id);
                      if (existing && existing.quantity > 1) {
                        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity - 1 } : i);
                      }
                      return prev.filter(i => i.product.id !== product.id);
                    });
                  }}
                  className="w-8 h-8 rounded-full bg-white border border-zinc-100 flex items-center justify-center text-zinc-900"
                >-</button>
                <span className="w-8 text-center font-bold">{cartItem?.quantity || 0}</span>
                <button 
                  disabled={!product.stock || (cartItem?.quantity || 0) >= product.stock}
                  onClick={() => {
                    setCart(prev => {
                      const existing = prev.find(i => i.product.id === product.id);
                      if (existing) {
                        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
                      }
                      return [...prev, { product, quantity: 1 }];
                    });
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center disabled:opacity-30 disabled:bg-zinc-400"
                >+</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 pt-6 border-t border-zinc-100">
        <div className="flex justify-between items-center mb-4">
          <span className="text-zinc-400 font-bold uppercase text-xs">Итого к оплате</span>
          <span className="text-2xl font-bold text-zinc-900">{total.toLocaleString()} сум</span>
        </div>
        <button 
          disabled={cart.length === 0 || isSubmitting}
          onClick={handleCreateOrder}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Сохранение...' : 'Оформить заказ'}
        </button>
      </div>
    </Modal>
  );
}

function PaymentModal({ client, user, onClose, onSuccess }: { client: Client, user: User, onClose: () => void, onSuccess: () => void }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<'cash' | 'transfer' | 'bill'>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const debtAmount = client.balance < 0 ? Math.abs(client.balance) : 0;

  const handleFillDebt = () => {
    setAmount(debtAmount.toString());
  };

  const handlePayment = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'payments'), {
        clientId: client.id,
        agentId: user.uid,
        amount: val,
        method,
        note,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, 'clients', client.id!), {
        balance: increment(val)
      });
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, 'create', 'payments');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Прием оплаты">
      <div className="space-y-6">
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-bold uppercase text-zinc-400 block">Сумма оплаты</label>
            {debtAmount > 0 && (
              <button 
                onClick={handleFillDebt}
                className="text-[10px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors"
                type="button"
              >
                Весь долг: {debtAmount.toLocaleString()}
              </button>
            )}
          </div>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-6 pl-12 bg-zinc-50 rounded-3xl border-none focus:ring-2 focus:ring-zinc-200 text-2xl font-bold" 
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
           <label className="text-[10px] font-bold uppercase text-zinc-400 mb-2 block">Способ оплаты</label>
           <div className="grid grid-cols-3 gap-2">
             {[
               { id: 'cash', label: 'Наличные' },
               { id: 'transfer', label: 'Перевод' },
               { id: 'bill', label: 'Счет' }
             ].map((m) => (
               <button
                 key={m.id}
                 type="button"
                 onClick={() => setMethod(m.id as any)}
                 className={`py-3 px-2 rounded-2xl text-[11px] font-bold transition-all border ${
                   method === m.id 
                    ? 'bg-zinc-900 text-white border-zinc-900' 
                    : 'bg-white text-zinc-500 border-zinc-100 hover:bg-zinc-50'
                 }`}
               >
                 {m.label}
               </button>
             ))}
           </div>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Комментарий</label>
          <input 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200" 
            placeholder="Доп. информация..."
          />
        </div>

        <button 
          disabled={!amount || isSubmitting}
          onClick={handlePayment}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold shadow-xl shadow-zinc-200 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isSubmitting ? 'Сохранение...' : 'Зачислить оплату'}
        </button>
      </div>
    </Modal>
  );
}

function ReminderModal({ client, user, onClose, onSuccess }: { client: Client, user: User, onClose: () => void, onSuccess: () => void }) {
  const [note, setNote] = useState('Сбор долга');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default due date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleSetReminder = async () => {
    if (!dueDate || !note) return;
    setIsSubmitting(true);
    try {
      const due = new Date(dueDate);
      // Set to 9 AM of the chosen day
      due.setHours(9, 0, 0, 0);

      await addDoc(collection(db, 'reminders'), {
        clientId: client.id,
        clientName: client.name,
        agentId: user.uid,
        dueDate: Timestamp.fromDate(due),
        note,
        completed: false,
        createdAt: serverTimestamp()
      });
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, 'create', 'reminders');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Поставить задачу">
      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Когда напомнить?</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-6 pl-12 bg-zinc-50 rounded-3xl border-none focus:ring-2 focus:ring-zinc-200 text-lg font-bold" 
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Что сделать?</label>
          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200 min-h-[100px]" 
            placeholder="Напр. Собрать долг за вчерашний заказ"
          />
        </div>
        <button 
          disabled={!dueDate || !note || isSubmitting}
          onClick={handleSetReminder}
          className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold shadow-xl shadow-zinc-200 disabled:opacity-50 active:scale-95 transition-transform"
        >
          {isSubmitting ? 'Сохранение...' : 'Поставить задачу'}
        </button>
      </div>
    </Modal>
  );
}
