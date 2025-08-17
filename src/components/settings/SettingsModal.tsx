import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { X } from 'lucide-react';
import { SettingsSidebar } from './SettingsSidebar';
import { WorkspaceSettings } from './sections/WorkspaceSettings';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { EditorSettings } from './sections/EditorSettings';

const CommunitySettings = lazy(() => import('./sections/CommunitySettings').then(m => ({ default: m.CommunitySettings })));
const PluginsSettings = lazy(() => import('./sections/PluginsSettings').then(m => ({ default: m.PluginsSettings })));
const ShortcutsSettings = lazy(() => import('./sections/ShortcutsSettings').then(m => ({ default: m.ShortcutsSettings })));
const UpdateSettings = lazy(() => import('./sections/UpdateSettings').then(m => ({ default: m.UpdateSettings })));
const AppSettings = lazy(() => import('./sections/AppSettings').then(m => ({ default: m.AppSettings })));

export type SettingsSection = 'workspace' | 'appearance' | 'editor' | 'preferences' | 'community' | 'plugins' | 'updates' | 'app';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
}

export function SettingsModal({ isOpen, onClose, initialSection = 'workspace' }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSectionChange = useCallback((section: SettingsSection) => {
    setActiveSection(section);
  }, []);

  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      handleClose();
    }
  }, [handleClose]);

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, handleKeyDown]);

  const LoadingFallback = useMemo(() => (
    <div className="flex items-center justify-center py-8">
      <div 
        className="animate-spin rounded-full h-6 w-6 border-b-2"
        style={{ borderColor: 'var(--text-accent)' }}
      />
    </div>
  ), []);

  const renderSection = useMemo(() => {
    switch (activeSection) {
      case 'workspace':
        return <WorkspaceSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'editor':
        return <EditorSettings />;
      case 'preferences':
        return (
          <Suspense fallback={LoadingFallback}>
            <ShortcutsSettings />
          </Suspense>
        );
      case 'community':
        return (
          <Suspense fallback={LoadingFallback}>
            <CommunitySettings />
          </Suspense>
        );
      case 'plugins':
        return (
          <Suspense fallback={LoadingFallback}>
            <PluginsSettings />
          </Suspense>
        );
      case 'updates':
        return (
          <Suspense fallback={LoadingFallback}>
            <UpdateSettings />
          </Suspense>
        );
      case 'app':
        return (
          <Suspense fallback={LoadingFallback}>
            <AppSettings />
          </Suspense>
        );
      default:
        return <WorkspaceSettings />;
    }
  }, [activeSection, LoadingFallback]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'var(--modal-overlay)' }}
    >
      <div className="absolute inset-0" onClick={handleBackdropClick} />
      
      <div 
        className="relative rounded-lg shadow-xl w-[900px] h-[650px] max-w-[90vw] max-h-[85vh] flex overflow-hidden"
        style={{ 
          backgroundColor: 'var(--modal-background)',
          border: '1px solid var(--modal-border)'
        }}
      >
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
          style={{ 
            borderBottom: '1px solid var(--modal-border)',
            backgroundColor: 'var(--modal-background)'
          }}
        >
          <h2 
            className="text-base font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Configurações
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded transition-colors hover:opacity-70"
            style={{ 
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex w-full pt-12">
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
          />
          
          <div className="flex-1 p-5 overflow-y-auto text-sm">
            {renderSection}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;