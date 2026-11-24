import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Menu,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { TaskCard } from './components/TaskCard';
import { TaskFormModal } from './components/TaskFormModal';
import { ToastContainer } from './components/ToastContainer';
import {
  Task,
  TaskFormValues,
  TaskPriority,
  TaskSortBy,
  TaskStatusFilter,
  ToastItem,
} from './types/task';
import { isTaskOverdue, loadTasks, saveTasks } from './utils/storage';

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  [TaskPriority.HIGH]: 3,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 1,
};

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatusFilter>(
    TaskStatusFilter.ALL
  );
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>(
    'all'
  );
  const [sortBy, setSortBy] = useState<TaskSortBy>(TaskSortBy.DUE_DATE);

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [formModalState, setFormModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    task: Task | null;
  }>({ open: false, mode: 'create', task: null });

  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'single'; task: Task }
    | { type: 'clear-completed'; count: number }
    | null
  >(null);

  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const pushToast = useCallback(
    (message: string, tone: ToastItem['tone'] = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 3200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const counts = useMemo(() => {
    let completed = 0;
    let overdue = 0;
    for (const task of tasks) {
      if (task.completed) completed += 1;
      if (isTaskOverdue(task)) overdue += 1;
    }
    const total = tasks.length;
    const pending = total - completed;
    const completionPct =
      total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, overdue, completionPct };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      if (statusFilter === TaskStatusFilter.COMPLETED && !task.completed) {
        return false;
      }
      if (statusFilter === TaskStatusFilter.PENDING && task.completed) {
        return false;
      }
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }
      if (query) {
        const titleMatch = task.title.toLowerCase().includes(query);
        const descMatch = task.description.toLowerCase().includes(query);
        if (!titleMatch && !descMatch) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === TaskSortBy.PRIORITY) {
        const diff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (diff !== 0) return diff;
      }

      if (sortBy === TaskSortBy.DUE_DATE) {
        if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
      }

      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, sortBy]);

  const handleOpenCreate = () => {
    setFormModalState({ open: true, mode: 'create', task: null });
    setIsMobileNavOpen(false);
  };

  const handleOpenEdit = (task: Task) => {
    setFormModalState({ open: true, mode: 'edit', task });
  };

  const handleCloseForm = () => {
    setFormModalState((prev) => ({ ...prev, open: false }));
  };

  const handleFormSubmit = (values: TaskFormValues) => {
    const now = new Date().toISOString();

    if (formModalState.mode === 'create') {
      const newTask: Task = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: values.title,
        description: values.description,
        dueDate: values.dueDate,
        priority: values.priority,
        completed: false,
        createdAt: now,
        updatedAt: now,
      };
      setTasks((prev) => [newTask, ...prev]);
      handleCloseForm();
      pushToast('Task created successfully', 'success');
      return;
    }

    if (formModalState.mode === 'edit' && formModalState.task) {
      const targetId = formModalState.task.id;
      setTasks((prev) =>
        prev.map((item) =>
          item.id === targetId
            ? {
                ...item,
                title: values.title,
                description: values.description,
                dueDate: values.dueDate,
                priority: values.priority,
                updatedAt: now,
              }
            : item
        )
      );
      handleCloseForm();
      pushToast('Task updated successfully', 'success');
    }
  };

  const handleToggleComplete = (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;
    const nextCompleted = !target.completed;
    const now = new Date().toISOString();

    setTasks((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, completed: nextCompleted, updatedAt: now }
          : item
      )
    );
    pushToast(
      nextCompleted ? 'Task marked as completed' : 'Task moved back to pending',
      nextCompleted ? 'success' : 'info'
    );
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'single') {
      const id = deleteTarget.task.id;
      setTasks((prev) => prev.filter((item) => item.id !== id));
      setDeleteTarget(null);
      pushToast('Task deleted', 'danger');
      return;
    }

    if (deleteTarget.type === 'clear-completed') {
      setTasks((prev) => prev.filter((item) => !item.completed));
      setDeleteTarget(null);
      pushToast('Cleared completed tasks', 'danger');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter(TaskStatusFilter.ALL);
    setPriorityFilter('all');
  };

  const activeViewLabel =
    statusFilter === TaskStatusFilter.ALL
      ? 'All Tasks'
      : statusFilter === TaskStatusFilter.PENDING
        ? 'Pending Tasks'
        : 'Completed Tasks';

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== TaskStatusFilter.ALL ||
    priorityFilter !== 'all';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleResetFilters();
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Cadence
          </a>
        </div>

        <div className="p-4 space-y-6 flex-1 overflow-y-auto">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Task</span>
          </button>

          <nav aria-label="Task views" className="space-y-1">
            <p className="px-3 pb-1 text-xs font-medium text-slate-500">
              Views
            </p>
            {(
              [
                {
                  id: TaskStatusFilter.ALL,
                  label: 'All Tasks',
                  count: counts.total,
                  Icon: ClipboardList,
                },
                {
                  id: TaskStatusFilter.PENDING,
                  label: 'Pending',
                  count: counts.pending,
                  Icon: Clock,
                },
                {
                  id: TaskStatusFilter.COMPLETED,
                  label: 'Completed',
                  count: counts.completed,
                  Icon: CheckCircle2,
                },
              ] as const
            ).map(({ id, label, count, Icon }) => {
              const active = statusFilter === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStatusFilter(id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    active
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 whitespace-nowrap">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{label}</span>
                  </span>
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      active ? 'text-blue-700' : 'text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="space-y-1 pt-2 border-t border-slate-200">
            <p className="px-3 pb-1 text-xs font-medium text-slate-500">
              Priority Filter
            </p>
            {(
              [
                { value: 'all', label: 'All Priorities' },
                { value: TaskPriority.HIGH, label: 'High Priority' },
                { value: TaskPriority.MEDIUM, label: 'Medium Priority' },
                { value: TaskPriority.LOW, label: 'Low Priority' },
              ] as const
            ).map((option) => {
              const active = priorityFilter === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriorityFilter(option.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    active
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="whitespace-nowrap">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
            <span>Progress</span>
            <span className="font-mono tabular-nums font-medium text-slate-900">
              {counts.completed}/{counts.total} · {counts.completionPct}%
            </span>
          </div>
          <div
            className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={counts.completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Task completion progress"
          >
            <div
              className="h-full bg-blue-700 transition-[width] duration-300 ease-out rounded-full"
              style={{ width: `${counts.completionPct}%` }}
            />
          </div>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden bg-slate-900/40 backdrop-blur-[2px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsMobileNavOpen(false);
          }}
        >
          <aside className="w-72 max-w-[85vw] h-full bg-white border-r border-slate-200 flex flex-col">
            <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200">
              <span className="font-display text-lg font-bold text-slate-900">
                Cadence
              </span>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-5 flex-1 overflow-y-auto">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>New Task</span>
              </button>

              <div className="space-y-1">
                <p className="px-3 pb-1 text-xs font-medium text-slate-500">
                  Views
                </p>
                {(
                  [
                    {
                      id: TaskStatusFilter.ALL,
                      label: 'All Tasks',
                      count: counts.total,
                    },
                    {
                      id: TaskStatusFilter.PENDING,
                      label: 'Pending',
                      count: counts.pending,
                    },
                    {
                      id: TaskStatusFilter.COMPLETED,
                      label: 'Completed',
                      count: counts.completed,
                    },
                  ] as const
                ).map(({ id, label, count }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(id);
                      setIsMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg ${
                      statusFilter === id
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-xs font-mono tabular-nums">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Workspace Bar */}
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 whitespace-nowrap">Tasks</span>
              <span className="text-slate-300" aria-hidden="true">
                /
              </span>
              <span className="font-medium text-slate-900 truncate">
                {activeViewLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>New Task</span>
          </button>
        </header>

        <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                Task Workspace
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Organize priorities, track due dates, and keep daily work moving forward.
              </p>
            </div>
            {counts.completed > 0 && (
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget({
                    type: 'clear-completed',
                    count: counts.completed,
                  })
                }
                className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Clear Completed ({counts.completed})</span>
              </button>
            )}
          </div>

          {/* Task Counter Strip (single-elevation horizontal summary) */}
          <section
            aria-label="Task summary counters"
            className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200"
          >
            <div className="p-4 sm:px-5 sm:py-4">
              <p className="text-xs font-medium text-slate-500">Total Tasks</p>
              <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-slate-900">
                {counts.total}
              </p>
            </div>
            <div className="p-4 sm:px-5 sm:py-4 border-l border-slate-200 lg:border-l-0">
              <p className="text-xs font-medium text-slate-500">Completed</p>
              <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-emerald-700">
                {counts.completed}
              </p>
            </div>
            <div className="p-4 sm:px-5 sm:py-4">
              <p className="text-xs font-medium text-slate-500">Pending</p>
              <p className="mt-1 text-2xl font-display font-bold font-mono tabular-nums text-blue-700">
                {counts.pending}
              </p>
            </div>
            <div className="p-4 sm:px-5 sm:py-4 border-l border-slate-200 lg:border-l-0">
              <p className="text-xs font-medium text-slate-500">Overdue</p>
              <p
                className={`mt-1 text-2xl font-display font-bold font-mono tabular-nums ${
                  counts.overdue > 0 ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                {counts.overdue}
              </p>
            </div>
          </section>

          {/* Search, Filter & Sort Toolbar */}
          <section
            aria-label="Search and filter tasks"
            className="flex flex-col md:flex-row md:items-center justify-between gap-3"
          >
            <div className="relative flex-1 min-w-0">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks by title or description..."
                aria-label="Search tasks"
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Segmented Status Filter */}
              <div
                className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg"
                role="tablist"
                aria-label="Filter tasks by status"
              >
                {(
                  [
                    { id: TaskStatusFilter.ALL, label: 'All' },
                    { id: TaskStatusFilter.PENDING, label: 'Pending' },
                    { id: TaskStatusFilter.COMPLETED, label: 'Completed' },
                  ] as const
                ).map((tab) => {
                  const active = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Priority Dropdown (accessible for mobile & quick desktop use) */}
              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(e) =>
                  setPriorityFilter(e.target.value as TaskPriority | 'all')
                }
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                <option value="all">All Priorities</option>
                <option value={TaskPriority.HIGH}>High Priority</option>
                <option value={TaskPriority.MEDIUM}>Medium Priority</option>
                <option value={TaskPriority.LOW}>Low Priority</option>
              </select>

              {/* Sort Selector */}
              <select
                aria-label="Sort tasks"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as TaskSortBy)}
                className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              >
                <option value={TaskSortBy.DUE_DATE}>Sort: Due Date</option>
                <option value={TaskSortBy.PRIORITY}>Sort: Priority</option>
                <option value={TaskSortBy.NEWEST}>Sort: Newest</option>
              </select>
            </div>
          </section>

          {/* Task List */}
          <section aria-label="Task list" className="space-y-3">
            {filteredTasks.length > 0 ? (
              <AnimatePresence initial={false} mode="popLayout">
                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEdit={handleOpenEdit}
                    onRequestDelete={(t) =>
                      setDeleteTarget({ type: 'single', task: t })
                    }
                  />
                ))}
              </AnimatePresence>
            ) : tasks.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                <div className="mx-auto w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                  <ClipboardList className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">
                  No tasks yet
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 max-w-sm mx-auto">
                  Create your first task with a title, due date, and priority to start organizing your schedule.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>Create First Task</span>
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                <div className="mx-auto w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
                  <Search className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">
                  No matching tasks
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 max-w-sm mx-auto">
                  No tasks matched your current search or filter criteria.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <span>Reset Filters</span>
                  </button>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Create / Edit Task Modal */}
      <AnimatePresence>
        {formModalState.open && (
          <TaskFormModal
            mode={formModalState.mode}
            initialTask={formModalState.task}
            onClose={handleCloseForm}
            onSubmit={handleFormSubmit}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteConfirmModal
            title={
              deleteTarget.type === 'single'
                ? 'Delete task?'
                : 'Clear completed tasks?'
            }
            description={
              deleteTarget.type === 'single'
                ? `Are you sure you want to permanently delete "${deleteTarget.task.title}"? This action cannot be undone.`
                : `Are you sure you want to remove all ${deleteTarget.count} completed task${deleteTarget.count === 1 ? '' : 's'}?`
            }
            confirmLabel={
              deleteTarget.type === 'single'
                ? 'Delete Task'
                : 'Clear Completed'
            }
            onCancel={() => setDeleteTarget(null)}
            onConfirm={handleConfirmDelete}
          />
        )}
      </AnimatePresence>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
