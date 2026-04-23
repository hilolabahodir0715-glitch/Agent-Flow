/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Package, 
  History, 
  Plus, 
  LogOut, 
  User as UserIcon,
  Search,
  ShoppingCart,
  DollarSign,
  ChevronRight,
  ArrowLeft,
  X,
  Bell,
  ClipboardList
} from 'lucide-react';

// Components (will be moved to separate files later)
import ClientsView from './components/ClientsView';
import ProductsView from './components/ProductsView';
import HistoryView from './components/HistoryView';
import RemindersView from './components/RemindersView';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';

type View = 'clients' | 'products' | 'reminders' | 'history';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<View>('clients');
  const [remindersCount, setRemindersCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'reminders'), 
        where('agentId', '==', user.uid), 
        where('completed', '==', false)
      );
      const unsub = onSnapshot(q, (s) => setRemindersCount(s.size));
      return unsub;
    }
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F5F5]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-zinc-400 font-medium"
        >
          Загрузка...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <ShoppingCart className="w-10 h-10 text-zinc-800" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 font-sans">AgentFlow</h1>
          <p className="text-zinc-500 font-sans">
            Управляйте клиентами, заказами и платежами в режиме реального времени.
          </p>
          <button 
            onClick={loginWithGoogle}
            className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-zinc-800 transition-colors shadow-xl shadow-zinc-200"
          >
            Войти через Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F5F5F5] overflow-hidden max-w-md mx-auto relative shadow-2xl">
      {/* Header */}
      <header className="px-6 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex justify-between items-center border-b border-zinc-100">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">
            {activeView === 'clients' && 'Клиенты'}
            {activeView === 'products' && 'Товары'}
            {activeView === 'reminders' && 'Задачи'}
            {activeView === 'history' && 'История'}
          </h1>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
            {user.displayName || 'Агент'}
          </p>
        </div>
        <button 
          onClick={logout}
          className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeView === 'clients' && <ClientsView user={user} />}
            {activeView === 'products' && <ProductsView user={user} />}
            {activeView === 'reminders' && <RemindersView user={user} />}
            {activeView === 'history' && <HistoryView user={user} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-zinc-100 px-6 py-3 flex justify-between items-center z-30 pb-safe">
        <NavButton 
          active={activeView === 'clients'} 
          onClick={() => setActiveView('clients')} 
          icon={<Users size={22} />} 
          label="Клиенты" 
        />
        <NavButton 
          active={activeView === 'products'} 
          onClick={() => setActiveView('products')} 
          icon={<Package size={22} />} 
          label="Товары" 
        />
        <NavButton 
          active={activeView === 'reminders'} 
          onClick={() => setActiveView('reminders')} 
          icon={
            <div className="relative">
              <Bell size={22} />
              {remindersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold ring-2 ring-white">
                  {remindersCount}
                </span>
              )}
            </div>
          } 
          label="Задачи" 
        />
        <NavButton 
          active={activeView === 'history'} 
          onClick={() => setActiveView('history')} 
          icon={<History size={22} />} 
          label="История" 
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-zinc-900' : 'text-zinc-400'}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
      {active && <motion.div layoutId="indicator" className="w-1 h-1 rounded-full bg-zinc-900 mt-0.5" />}
    </button>
  );
}

