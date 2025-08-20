import React from 'react';

// Cache para ícones já carregados para evitar reimportação
const iconCache = new Map<string, React.ComponentType<any>>();

/**
 * Função similar ao setIcon do Obsidian
 * Carrega um ícone dinamicamente do lucide-react usando o ID do ícone
 * 
 * @param iconId - ID do ícone do lucide (ex: 'file-text', 'download', 'settings')
 * @returns Componente React do ícone ou null se não encontrado
 */
export async function loadIcon(iconId: string): Promise<React.ComponentType<any> | null> {
  // Verifica se já está no cache
  if (iconCache.has(iconId)) {
    return iconCache.get(iconId)!;
  }

  try {
    // Mapeamento manual dos ícones mais comuns do lucide-react
    const iconMap: Record<string, () => Promise<any>> = {
      'file-text': () => import('lucide-react').then(m => m.FileText),
      'edit': () => import('lucide-react').then(m => m.Edit),
      'edit-2': () => import('lucide-react').then(m => m.Edit2),
      'edit-3': () => import('lucide-react').then(m => m.Edit3),
      'trash': () => import('lucide-react').then(m => m.Trash),
      'trash-2': () => import('lucide-react').then(m => m.Trash2),
      'download': () => import('lucide-react').then(m => m.Download),
      'upload': () => import('lucide-react').then(m => m.Upload),
      'save': () => import('lucide-react').then(m => m.Save),
      'copy': () => import('lucide-react').then(m => m.Copy),
      'settings': () => import('lucide-react').then(m => m.Settings),
      'search': () => import('lucide-react').then(m => m.Search),
      'plus': () => import('lucide-react').then(m => m.Plus),
      'minus': () => import('lucide-react').then(m => m.Minus),
      'check': () => import('lucide-react').then(m => m.Check),
      'x': () => import('lucide-react').then(m => m.X),
      'eye': () => import('lucide-react').then(m => m.Eye),
      'eye-off': () => import('lucide-react').then(m => m.EyeOff),
      'home': () => import('lucide-react').then(m => m.Home),
      'folder': () => import('lucide-react').then(m => m.Folder),
      'file': () => import('lucide-react').then(m => m.File),
      'star': () => import('lucide-react').then(m => m.Star),
      'heart': () => import('lucide-react').then(m => m.Heart),
      'bookmark': () => import('lucide-react').then(m => m.Bookmark),
      'link': () => import('lucide-react').then(m => m.Link),
      'external-link': () => import('lucide-react').then(m => m.ExternalLink),
      'mail': () => import('lucide-react').then(m => m.Mail),
      'phone': () => import('lucide-react').then(m => m.Phone),
      'message-circle': () => import('lucide-react').then(m => m.MessageCircle),
      'bell': () => import('lucide-react').then(m => m.Bell),
      'calendar': () => import('lucide-react').then(m => m.Calendar),
      'clock': () => import('lucide-react').then(m => m.Clock),
      'user': () => import('lucide-react').then(m => m.User),
      'users': () => import('lucide-react').then(m => m.Users),
      'tag': () => import('lucide-react').then(m => m.Tag),
      'image': () => import('lucide-react').then(m => m.Image),
      'camera': () => import('lucide-react').then(m => m.Camera),
      'video': () => import('lucide-react').then(m => m.Video),
      'play': () => import('lucide-react').then(m => m.Play),
      'pause': () => import('lucide-react').then(m => m.Pause),
      'stop': () => import('lucide-react').then(m => m.Square),
      'volume-2': () => import('lucide-react').then(m => m.Volume2),
      'volume-x': () => import('lucide-react').then(m => m.VolumeX),
      'share': () => import('lucide-react').then(m => m.Share),
      'print': () => import('lucide-react').then(m => m.Printer),
      'info': () => import('lucide-react').then(m => m.Info),
      'alert-triangle': () => import('lucide-react').then(m => m.AlertTriangle),
      'alert-circle': () => import('lucide-react').then(m => m.AlertCircle),
      'check-circle': () => import('lucide-react').then(m => m.CheckCircle),
      'x-circle': () => import('lucide-react').then(m => m.XCircle),
      'help-circle': () => import('lucide-react').then(m => m.HelpCircle),
      'more-horizontal': () => import('lucide-react').then(m => m.MoreHorizontal),
      'more-vertical': () => import('lucide-react').then(m => m.MoreVertical),
      'chevron-down': () => import('lucide-react').then(m => m.ChevronDown),
      'chevron-up': () => import('lucide-react').then(m => m.ChevronUp),
      'chevron-left': () => import('lucide-react').then(m => m.ChevronLeft),
      'chevron-right': () => import('lucide-react').then(m => m.ChevronRight),
      'arrow-down': () => import('lucide-react').then(m => m.ArrowDown),
      'arrow-up': () => import('lucide-react').then(m => m.ArrowUp),
      'arrow-left': () => import('lucide-react').then(m => m.ArrowLeft),
      'arrow-right': () => import('lucide-react').then(m => m.ArrowRight),
    };

    if (iconMap[iconId]) {
      const IconComponent = await iconMap[iconId]();
      if (IconComponent) {
        iconCache.set(iconId, IconComponent);
        return IconComponent;
      }
    }

    console.warn(`Icon "${iconId}" not found in icon map. Available icons:`, Object.keys(iconMap).slice(0, 10));
    return null;
  } catch (error) {
    console.error(`Failed to load icon "${iconId}":`, error);
    return null;
  }
}

/**
 * Função setIcon similar ao Obsidian
 * Define um ícone em um elemento DOM
 * 
 * @param element - Elemento DOM ou ref onde o ícone será definido
 * @param iconId - ID do ícone do lucide
 * @param size - Tamanho do ícone (padrão: 16)
 */
export async function setIcon(
  element: HTMLElement | { current: HTMLElement | null }, 
  iconId: string, 
  size: number = 16
): Promise<void> {
  const targetElement = 'current' in element ? element.current : element;
  
  if (!targetElement) {
    console.warn('setIcon: target element is null');
    return;
  }

  const IconComponent = await loadIcon(iconId);
  
  if (IconComponent) {
    // Cria um container temporário para renderizar o ícone
    const tempDiv = document.createElement('div');
    
    // Renderiza o ícone usando React
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(tempDiv);
    
    root.render(React.createElement(IconComponent, { size }));
    
    // Aguarda a renderização e move o SVG para o elemento alvo
    setTimeout(() => {
      const svgElement = tempDiv.querySelector('svg');
      if (svgElement) {
        // Limpa o conteúdo anterior
        targetElement.innerHTML = '';
        // Adiciona o novo ícone
        targetElement.appendChild(svgElement.cloneNode(true));
      }
      
      // Cleanup
      root.unmount();
      tempDiv.remove();
    }, 0);
  }
}

/**
 * Função utilitária para criar um componente React com ícone
 * Útil para uso em componentes React
 */
export function createIconComponent(iconId: string, size: number = 16) {
  return React.memo(function DynamicIcon() {
    const [IconComponent, setIconComponent] = React.useState<React.ComponentType<any> | null>(null);

    React.useEffect(() => {
      loadIcon(iconId).then(setIconComponent);
    }, [iconId]);

    if (!IconComponent) {
      return null;
    }

    return React.createElement(IconComponent, { size });
  });
}

/**
 * Hook para usar ícones em componentes React
 */
export function useIcon(iconId: string, size: number = 16) {
  const [IconComponent, setIconComponent] = React.useState<React.ComponentType<any> | null>(null);

  React.useEffect(() => {
    loadIcon(iconId).then(setIconComponent);
  }, [iconId]);

  return IconComponent ? React.createElement(IconComponent, { size }) : null;
}