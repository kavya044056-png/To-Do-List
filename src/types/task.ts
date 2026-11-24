export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TaskStatusFilter {
  ALL = 'all',
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export enum TaskSortBy {
  DUE_DATE = 'dueDate',
  PRIORITY = 'priority',
  NEWEST = 'newest',
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD or empty string
  priority: TaskPriority;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormValues {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
}

export interface ToastItem {
  id: string;
  message: string;
  tone: 'success' | 'info' | 'danger';
}
