import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, increment } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Product } from '../types';
import { Search, Plus, Package, Edit2, Trash2, X, Save, ArrowDownCircle, Warehouse } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductsView({ user }: { user: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('шт');

  // Receipt State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [receiveQty, setReceiveQty] = useState('');
  const [source, setSource] = useState('MEGAMIR');

  useEffect(() => {
    const q = query(collection(db, 'products'), where('agentId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, 'list', 'products'));
    return unsubscribe;
  }, [user.uid]);

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    if (!name || isNaN(priceNum)) return;

    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id!), {
          name,
          price: priceNum,
          unit
        });
      } else {
        await addDoc(collection(db, 'products'), {
          name,
          price: priceNum,
          unit,
          stock: 0,
          agentId: user.uid
        });
      }
      closeProductModal();
    } catch (err) {
      handleFirestoreError(err, editingProduct ? 'update' : 'create', 'products');
    }
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(receiveQty);
    if (!selectedProductId || isNaN(qty) || qty <= 0) return;

    try {
      const product = products.find(p => p.id === selectedProductId);
      await addDoc(collection(db, 'receipts'), {
        productId: selectedProductId,
        productName: product?.name || '',
        quantity: qty,
        source: source,
        agentId: user.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'products', selectedProductId), {
        stock: increment(qty)
      });

      closeReceiptModal();
    } catch (err) {
      handleFirestoreError(err, 'create', 'receipts');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить товар?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      handleFirestoreError(err, 'delete', 'products');
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setUnit(product.unit || 'шт');
    setIsAdding(true);
  };

  const closeProductModal = () => {
    setIsAdding(false);
    setEditingProduct(null);
    setName('');
    setPrice('');
    setUnit('шт');
  };

  const closeReceiptModal = () => {
    setIsReceiving(false);
    setSelectedProductId('');
    setReceiveQty('');
    setSource('MEGAMIR');
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Поиск товаров..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border-none focus:ring-2 focus:ring-zinc-200 shadow-sm"
          />
        </div>
        <button 
          onClick={() => setIsReceiving(true)}
          className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-center transition-transform active:scale-95"
          title="Приемка"
        >
          <ArrowDownCircle size={24} />
        </button>
        <button 
          onClick={() => { closeReceiptModal(); setIsAdding(true); }}
          className="p-3 bg-zinc-900 text-white rounded-2xl shadow-lg transition-transform active:scale-95"
          title="Новый товар"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 pb-24">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white p-4 rounded-3xl shadow-sm border border-zinc-50 flex justify-between items-center transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400 border border-zinc-100 relative">
                <Package size={24} />
                {product.stock <= 5 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white"></span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-zinc-900">{product.name}</h3>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-zinc-500 font-bold">{product.price.toLocaleString()} сум</p>
                  <span className="text-[10px] bg-zinc-100 text-zinc-400 px-2 py-0.5 rounded-full font-bold">Остаток: {product.stock || 0} {product.unit}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => openEdit(product)}
                className="p-2 text-zinc-400 hover:text-zinc-600"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => handleDelete(product.id!)}
                className="p-2 text-zinc-400 hover:text-red-500"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Product Modal */}
        {isAdding && (
          <Modal onClose={closeProductModal} title={editingProduct ? 'Редактировать' : 'Новый товар'}>
            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Название</label>
                <input 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200" 
                  placeholder="Напр. Кола 0.5л"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Цена (сум)</label>
                  <input 
                    required
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200" 
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Ед. изм.</label>
                  <input 
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200" 
                    placeholder="шт"
                  />
                </div>
              </div>
              <button className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold mt-4 shadow-lg active:scale-95 transition-transform">
                Сохранить товар
              </button>
            </form>
          </Modal>
        )}

        {/* Receipt Modal */}
        {isReceiving && (
          <Modal onClose={closeReceiptModal} title="Приемка товаров">
            <form onSubmit={handleReceive} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Источник</label>
                <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-2xl text-emerald-700 font-bold">
                  <Warehouse size={20} />
                  <input 
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 w-full font-bold"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Выбор товара</label>
                <select 
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200 appearance-none font-bold"
                >
                  <option value="">— Выберите из списка —</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.stock || 0} {p.unit})</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={() => { closeReceiptModal(); setIsAdding(true); }}
                   className="text-[11px] text-zinc-400 font-bold uppercase mt-2 hover:text-zinc-600 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} /> Создать новый вид товара
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 mb-1 block">Количество</label>
                <input 
                  required
                  type="number"
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(e.target.value)}
                  className="w-full p-4 bg-zinc-50 rounded-2xl border-none focus:ring-2 focus:ring-zinc-200 font-bold text-xl" 
                  placeholder="0"
                />
              </div>

              <button className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold mt-4 shadow-lg shadow-emerald-100 active:scale-95 transition-transform flex items-center justify-center gap-2">
                Принять на склад
              </button>
            </form>
          </Modal>
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
          <h2 className="text-2xl font-bold text-zinc-900 leading-tight">{title}</h2>
          <button onClick={onClose} className="p-2 bg-zinc-100 rounded-full text-zinc-500"><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
