
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { Export } from '../types';
import { exportService } from '../services/exportService';
import { useAuth } from './Authcontext';
// ─── Config ────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 15000; // 15s — exports are background work, not live editing
// ─── Context Type ─────────────────────────────────────────────────────────────
interface ExportContextType {
  exports: Export[];
  isLoading: boolean;
  error: string | null;
  fetchExports: () => Promise<void>;
  deleteExport: (exportId: string) => Promise<void>;
  retryExport: (exportId: string) => Promise<void>;
  getExportsByStatus: (status: Export['status'] | 'All') => Export[];
}
// ─── Context ─────────────────────────────────────────────────────────────────
const ExportContext = createContext<ExportContextType | undefined>(undefined);
// ─── Provider ────────────────────────────────────────────────────────────────
export function ExportProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [exports, setExports] = useState<Export[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Global fetch — no projectId, this pulls every export for the logged-in user.
  const fetchExports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await exportService.getExports(token!);
      setExports(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  const deleteExport = async (exportId: string) => {
    try {
      setError(null);
      await exportService.deleteExport(exportId, token!);
      setExports(prev => prev.filter(e => e.id !== exportId));
    } catch (e: any) {
      setError(e.message);
    }
  };
  const retryExport = async (exportId: string) => {
    try {
      setError(null);
      const updated = await exportService.retryExport(exportId, token!);
      setExports(prev => prev.map(e => (e.id === exportId ? updated : e)));
    } catch (e: any) {
      setError(e.message);
    }
  };
  const getExportsByStatus = (status: Export['status'] | 'All'): Export[] => {
    if (status === 'All') return exports;
    return exports.filter(e => e.status === status);
  };
  // ── Initial fetch once authenticated ──
  useEffect(() => {
    if (token) fetchExports();
  }, [token]);
  // ── Poll only while something is actively Processing. ──
  // Starts an interval when a Processing export appears, clears it once
  // nothing's left in that state — avoids polling forever for no reason.
  useEffect(() => {
    const hasProcessing = exports.some(e => e.status === 'Processing');
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
    <ExportContext.Provider value={{
      exports,
      isLoading,
      error,
      fetchExports,
      deleteExport,
      retryExport,
      getExportsByStatus,
    }}>
      {children}
    </ExportContext.Provider>
  );
}
// ─── Hook ────────────────────────────────────────────────────────────────────
export function useExport() {
  const context = useContext(ExportContext);
  if (!context) throw new Error('useExport must be used within ExportProvider');
  return context;
}