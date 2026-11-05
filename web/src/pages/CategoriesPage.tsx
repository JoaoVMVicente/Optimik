// Categorias de tarefa (somente gestor): o tipo de trabalho de cada lançamento de horas.
import { useState, type FormEvent } from 'react';
import { api, type Category } from '../api';
import { Card, EmptyState, ErrorMessage, inputClass, linkButton, PageHeader, primaryButton } from '../components/ui';
import { useLoad } from '../useLoad';

export function CategoriesPage() {
  const { data: categories, error, loading, reload } = useLoad(api.categories, [] as Category[]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [actionError, setActionError] = useState('');

  async function run(action: () => Promise<unknown>) {
    try {
      await action();
      setActionError('');
      reload();
      return true;
    } catch (err) {
      setActionError((err as Error).message);
      return false;
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api.createCategory(newName))) setNewName('');
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault();
    if (await run(() => api.updateCategory(editingId!, editName))) setEditingId(null);
  }

  return (
    <>
      <PageHeader title="Categorias" subtitle="O tipo de trabalho de cada lançamento. Elas aparecem nos gráficos de distribuição de horas." />
      <ErrorMessage>{error || actionError}</ErrorMessage>

      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <input className={inputClass} placeholder="Nova categoria (ex.: Testes)" maxLength={50} required value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button type="submit" className={`${primaryButton} shrink-0`}>Adicionar</button>
      </form>

      <Card>
        {!loading && categories.length === 0 ? (
          <EmptyState>Nenhuma categoria.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                {editingId === c.id ? (
                  <form onSubmit={handleRename} className="flex flex-1 gap-2">
                    <input className={inputClass} autoFocus maxLength={50} required value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <button type="submit" className={linkButton}>Salvar</button>
                    <button type="button" onClick={() => setEditingId(null)} className={linkButton}>Cancelar</button>
                  </form>
                ) : (
                  <>
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      className={linkButton}
                    >
                      Renomear
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
