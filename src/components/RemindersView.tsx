import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Reminder } from '../types';
import { Bell, CheckCircle, Clock, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RemindersView({ user }: { user: User }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'reminders'), 
      where('agentId', '==', user.uid),
      orderBy('dueDate', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reminder)));
    }, (err) => handleFirestoreError(err, 'list', 'reminders'));
    return unsubscribe;
  }, [user.uid]);

  const toggleComplete = async (reminder: Reminder) => {
    try {
      await updateDoc(doc(db, 'reminders', reminder.id!), {
        completed: !reminder.completed
      });
    } catch (err) {
      handleFirestoreError(err, 'update', 'reminders');
    }
  };

  const deleteReminder = async (id: string) => {
    if (!confirm('Удалить напоминание?')) return;
    try {
      await deleteDoc(doc(db, 'reminders', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'reminders');
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '...';
    const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const isOverdue = (ts: any) => {
    if (!ts) return false;
    const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
    return date < new Date() && !reminders.find(r => r.dueDate === ts)?.completed;
  };

  const activeReminders = reminders.filter(r => !r.completed);
  const completedReminders = reminders.filter(r => r.completed);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 rounded-3xl p-6 text-white mb-6 flex justify-between items-center">
        <div>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Ваши задачи</p>
          <h2 className="text-2xl font-bold">Напоминания</h2>
        </div>
        <div className="bg-zinc-800 p-3 rounded-2xl">
          <Bell size={24} className={activeReminders.length > 0 ? "text-orange-400 animate-pulse" : "text-zinc-500"} />
        </div>
      </div>

      <div className="space-y-6 pb-24">
        {/* Active Reminders */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase text-zinc-400 px-2 flex items-center gap-2">
            <Clock size={12} /> Активные
          </h3>
          <AnimatePresence initial={false}>
            {activeReminders.map((reminder) => (
              <ReminderItem 
                key={reminder.id} 
                reminder={reminder} 
                onToggle={() => toggleComplete(reminder)} 
                onDelete={() => deleteReminder(reminder.id!)}
                formatDate={formatDate}
                isOverdue={isOverdue(reminder.dueDate)}
              />
            ))}
          </AnimatePresence>
          {activeReminders.length === 0 && (
            <div className="py-12 bg-white/50 rounded-3xl border border-dashed border-zinc-200 text-center">
              <p className="text-sm text-zinc-400">Нет активных напоминаний</p>
            </div>
          )}
        </section>

        {/* Completed Reminders */}
        {completedReminders.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase text-zinc-400 px-2 flex items-center gap-2">
              <CheckCircle size={12} /> Выполнено
            </h3>
            <div className="opacity-60 grayscale">
              {completedReminders.map((reminder) => (
                <ReminderItem 
                  key={reminder.id} 
                  reminder={reminder} 
                  onToggle={() => toggleComplete(reminder)} 
                  onDelete={() => deleteReminder(reminder.id!)}
                  formatDate={formatDate}
                  isOverdue={false}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ReminderItem({ reminder, onToggle, onDelete, formatDate, isOverdue }: any) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`bg-white p-4 rounded-3xl shadow-sm border border-zinc-50 flex items-center gap-4 transition-all ${isOverdue ? 'ring-2 ring-orange-100' : ''}`}
    >
      <button 
        onClick={onToggle}
        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
          reminder.completed 
            ? 'bg-zinc-100 text-zinc-400' 
            : isOverdue ? 'bg-orange-50 text-orange-500' : 'bg-zinc-50 text-zinc-400'
        }`}
      >
        {reminder.completed ? <CheckCircle size={20} /> : <Clock size={20} />}
      </button>

      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className={`font-bold text-sm leading-tight ${reminder.completed ? 'line-through text-zinc-400' : 'text-zinc-900'}`}>
            {reminder.clientName}
          </h4>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            reminder.completed ? 'bg-zinc-100 text-zinc-400' :
            isOverdue ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-500'
          }`}>
            {formatDate(reminder.dueDate)}
          </span>
        </div>
        <p className={`text-xs mt-1 ${reminder.completed ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {reminder.note}
        </p>
      </div>

      <button 
        onClick={onDelete}
        className="p-2 text-zinc-300 hover:text-red-500 transition-colors"
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  );
}
