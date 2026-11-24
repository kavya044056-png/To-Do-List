import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Minus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Task, TaskPriority } from '../types/task';
import {
  formatDueDate,
  isTaskDueToday,
  isTaskOverdue,
} from '../utils/storage';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onRequestDelete: (task: Task) => void;
}

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; colorClass: string; Icon: typeof ArrowUp }
> = {
  [TaskPriority.HIGH]: {
    label: 'High priority',
    colorClass: 'text-red-600',
    Icon: ArrowUp,
  },
  [TaskPriority.MEDIUM]: {
    label: 'Medium priority',
    colorClass: 'text-amber-700',
    Icon: Minus,
  },
  [TaskPriority.LOW]: {
    label: 'Low priority',
    colorClass: 'text-slate-600',
    Icon: ArrowDown,
  },
};

export function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onRequestDelete,
}: TaskCardProps) {
  const overdue = isTaskOverdue(task);
  const dueToday = !task.completed && isTaskDueToday(task);
  const priorityInfo = PRIORITY_META[task.priority];
  const PriorityIcon = priorityInfo.Icon;

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`group rounded-xl border p-4 sm:p-5 transition-colors duration-150 ${
        task.completed
          ? 'bg-slate-50/70 border-slate-200/80'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={() => onToggleComplete(task.id)}
          aria-pressed={task.completed}
          aria-label={
            task.completed
              ? `Mark "${task.title}" as pending`
              : `Mark "${task.title}" as completed`
          }
          className="flex items-center justify-center w-10 h-10 -ml-2 -mt-1.5 rounded-lg shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <span
            className={`flex items-center justify-center w-5 h-5 rounded-md border transition-colors duration-150 ${
              task.completed
                ? 'bg-blue-700 border-blue-700 text-white'
                : 'bg-white border-slate-300 group-hover:border-blue-600'
            }`}
          >
            {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3
                className={`text-base font-semibold leading-snug break-words ${
                  task.completed
                    ? 'line-through text-slate-400'
                    : 'text-slate-900'
                }`}
              >
                {task.title}
              </h3>

              {task.description && (
                <p
                  className={`mt-1.5 text-sm leading-relaxed break-words ${
                    task.completed ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {task.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0 sm:ml-2">
              <button
                type="button"
                onClick={() => onEdit(task)}
                aria-label={`Edit "${task.title}"`}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => onRequestDelete(task)}
                aria-label={`Delete "${task.title}"`}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-medium text-red-600 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs">
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                task.completed ? 'text-slate-400' : priorityInfo.colorClass
              }`}
            >
              <PriorityIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{priorityInfo.label}</span>
            </span>

            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>

            <span
              className={`inline-flex items-center gap-1.5 font-mono tabular-nums ${
                task.completed
                  ? 'text-slate-400'
                  : overdue
                    ? 'text-red-600 font-medium'
                    : dueToday
                      ? 'text-amber-700 font-medium'
                      : 'text-slate-600'
              }`}
            >
              {overdue ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              )}
              <span>
                {overdue
                  ? `Overdue · ${formatDueDate(task.dueDate)}`
                  : dueToday
                    ? `Due today · ${formatDueDate(task.dueDate)}`
                    : formatDueDate(task.dueDate)}
              </span>
            </span>

            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>

            <span
              className={`inline-flex items-center gap-1 font-medium ${
                task.completed ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              {task.completed ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Completed</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Pending</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
