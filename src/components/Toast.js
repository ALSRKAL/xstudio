import { memo } from 'react';
import { AlertCircle, CheckCircle2, Info, X, WifiOff } from 'lucide-react';
import './Toast.css';

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertCircle,
  offline: WifiOff,
  info: Info,
};

const ToastStack = memo(({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type] || Info;
        return (
          <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
            <Icon size={18} className="toast-icon" aria-hidden="true" />
            <span className="toast-message">{toast.message}</span>
            {toast.action && (
              <button type="button" className="toast-action" onClick={toast.action.onClick}>
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
});

ToastStack.displayName = 'ToastStack';

export default ToastStack;
