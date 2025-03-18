import { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { toast } from 'react-toastify';

interface UseSupabaseQueryOptions<T> {
  table: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  filter?: { column: string; value: any };
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}

export function useSupabaseQuery<T>({
  table,
  select = '*',
  orderBy,
  filter,
  onSuccess,
  onError,
}: UseSupabaseQueryOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        let query = supabase.from(table).select(select);

        if (orderBy) {
          query = query.order(orderBy.column, { 
            ascending: orderBy.ascending ?? false 
          });
        }

        if (filter) {
          query = query.eq(filter.column, filter.value);
        }

        const { data: result, error: supabaseError } = await query;

        if (supabaseError) throw supabaseError;

        setData(result as T[]);
        onSuccess?.(result as T[]);
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);
        toast.error(`Error fetching data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [table, select, orderBy?.column, orderBy?.ascending, filter?.column, filter?.value]);

  return { data, loading, error, refetch: () => {} };
} 