/**
 * ExportContext — Export library tab data.
 *
 * Loads real jobs from the API (aggregated across the user’s projects).
 * Does NOT seed mock rows. Stale AsyncStorage from the old mock era is
 * cleared on launch when CONFIG.USE_MOCK is false.
 *
 * After ReviewExport finishes a job, call `prependExport` (or `fetchExports`)
 * so the library updates immediately.
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Export } from '../types';
import { exportService } from '../services/exportService';
import { useAuth } from './Authcontext';
import { CONFIG } from '../config';

const POLL_INTERVAL_MS = 15000;

interface ExportContextType {
  exports: Export[];
  isLoading: boolean;
  error: string | null;
  fetchExports: () => Promise<void>;
  /** Insert a just-created export at the top of the library (and persist). */
  prependExport: (item: Export) => Promise<void>;
  deleteExport: (exportId: string) => Promise<void>;
  retryExport: (exportId: string) => Promise<void>;
  getExportsByStatus: (status: Export['status'] | 'All') => Export[];
}

const ExportContext = createContext<ExportContextType | undefined>(undefined);

export function ExportProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [exports, setExports] = useState<Export[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Drop legacy mock cache so the library starts empty until a real fetch/create.
  useEffect(() => {
    const boot = async () => {
      if (CONFIG.USE_MOCK) {
        try {
          const cached = await AsyncStorage.getItem(
            CONFIG.ASYNC_STORAGE_KEYS.EXPORTS
          );
          if (cached) setExports(JSON.parse(cached));
        } catch (e) {
          console.log('Export rehydration failed', e);
        }
        return;
      }
      try {
        await AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.EXPORTS);
      } catch {
        /* ignore */
      }
      setExports([]);
    };
    boot();
  }, []);

  useEffect(() => {
    if (token && !CONFIG.USE_MOCK) fetchExports();
  }, [token]);

  const persist = async (next: Export[]) => {
    await AsyncStorage.setItem(
      CONFIG.ASYNC_STORAGE_KEYS.EXPORTS,
      JSON.stringify(next)
    );
  };

  const fetchExports = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await exportService.getExports(token);
      setExports(data);
      await persist(data);
    } catch (e: any) {
      setError(e.message);
      // Don't keep fake/stale rows when the live API fails — show empty instead.
      if (!CONFIG.USE_MOCK) {
        setExports([]);
        await AsyncStorage.removeItem(CONFIG.ASYNC_STORAGE_KEYS.EXPORTS).catch(
          () => {}
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const prependExport = async (item: Export) => {
    const next = [item, ...exports.filter((e) => e.id !== item.id)];
    setExports(next);
    await persist(next);
  };

  const deleteExport = async (exportId: string) => {
    try {
      setError(null);
      await exportService.deleteExport(exportId, token!);
      const updated = exports.filter((e) => e.id !== exportId);
      setExports(updated);
      await persist(updated);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const retryExport = async (exportId: string) => {
    try {
      setError(null);
      const updatedItem = await exportService.retryExport(exportId, token!);
      const updated = exports.map((e) =>
        e.id === exportId ? updatedItem : e
      );
      // Retry creates a new job id on the backend — also prepend if id changed.
      const next =
        updatedItem.id !== exportId
          ? [updatedItem, ...exports.filter((e) => e.id !== exportId)]
          : updated;
      setExports(next);
      await persist(next);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const getExportsByStatus = (status: Export['status'] | 'All'): Export[] => {
    if (status === 'All') return exports;
    return exports.filter((e) => e.status === status);
  };

  useEffect(() => {
    const hasProcessing = exports.some((e) => e.status === 'Processing');
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(() => {
        fetchExports();
      }, POLL_INTERVAL_MS);
    }
    if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [exports]);

  return (
    <ExportContext.Provider
      value={{
        exports,
        isLoading,
        error,
        fetchExports,
        prependExport,
        deleteExport,
        retryExport,
        getExportsByStatus,
      }}
    >
      {children}
    </ExportContext.Provider>
  );
}

export function useExport() {
  const context = useContext(ExportContext);
  if (!context) throw new Error('useExport must be used within ExportProvider');
  return context;
}
