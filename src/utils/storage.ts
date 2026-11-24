import { Task, TaskPriority } from '../types/task';

const TASKS_STORAGE_KEY = 'cadence_todo_tasks_v1';
const INITIALIZED_STORAGE_KEY = 'cadence_todo_initialized_v1';

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysISO(baseISO: string, days: number): string {
  const [y, m, d] = baseISO.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildStarterTasks(): Task[] {
  const today = getTodayISO();
  const now = new Date().toISOString();

  return [
    {
      id: 'task-starter-1',
      title: 'Finalize Q4 product roadmap presentation',
      description: 'Review milestone timelines with engineering leads and attach updated sprint capacity estimates.',
      dueDate: addDaysISO(today, 1),
      priority: TaskPriority.HIGH,
      completed: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-starter-2',
      title: 'Audit onboarding checklist copy',
      description: 'Simplify step descriptions for first-time workspace setup and verify keyboard navigation states.',
      dueDate: addDaysISO(today, 3),
      priority: TaskPriority.MEDIUM,
      completed: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-starter-3',
      title: 'Send weekly project digest to stakeholders',
      description: 'Summarize completed deliverables, upcoming release notes, and open blockers.',
      dueDate: today,
      priority: TaskPriority.HIGH,
      completed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'task-starter-4',
      title: 'Archive completed sprint retrospectives',
      description: 'Organize October and November action items into the shared team knowledge folder.',
      dueDate: addDaysISO(today, 6),
      priority: TaskPriority.LOW,
      completed: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_STORAGE_KEY);
    const initialized = localStorage.getItem(INITIALIZED_STORAGE_KEY);

    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    if (!initialized) {
      const starter = buildStarterTasks();
      localStorage.setItem(INITIALIZED_STORAGE_KEY, 'true');
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(starter));
      return starter;
    }

    return [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(INITIALIZED_STORAGE_KEY, 'true');
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Ignore storage quota or private-mode exceptions gracefully
  }
}

export function isTaskOverdue(task: Task): boolean {
  if (task.completed || !task.dueDate) return false;
  return task.dueDate < getTodayISO();
}

export function isTaskDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  return task.dueDate === getTodayISO();
}

export function formatDueDate(dateISO: string): string {
  if (!dateISO) return 'No due date';
  const [y, m, d] = dateISO.split('-').map(Number);
  if (!y || !m || !d) return dateISO;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
