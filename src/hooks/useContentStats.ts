import { useMemo } from 'react';

interface ContentStats {
  characters: number;
  words: number;
}

export function useContentStats(content: string, enabled: boolean): ContentStats {
  return useMemo(() => {
    if (!enabled || !content) {
      return { characters: 0, words: 0 };
    }

    const characters = content.length;
    const words = content.trim() 
      ? content.trim().split(/\s+/).filter(word => word.length > 0).length 
      : 0;

    return { characters, words };
  }, [content, enabled]);
}