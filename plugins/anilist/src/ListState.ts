type ListState = {
  status: 'watching' | 'completed' | 'planning' | 'paused' | 'dropped' | 'repeating';
  progress: number;
  repeat: number | null;
};

export type { ListState };
