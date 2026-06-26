import type { Task } from '../types';

interface BehavioralSuggestionProps {
  tasks: Task[];
}

export function BehavioralSuggestion(props: BehavioralSuggestionProps) {
  void props.tasks;
  return null;
}
