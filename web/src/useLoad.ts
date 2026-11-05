// Hook para carregar dados da API: devolve os dados, o erro e uma função para recarregar.
import { useCallback, useEffect, useState } from 'react';

export function useLoad<T>(load: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
    // `load` costuma ser uma função nova a cada render; carregamos só ao montar e quando pedirem.
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload };
}
