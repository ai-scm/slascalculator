import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Warning, Info, X } from 'phosphor-react';
import { useApp } from '../../context/AppContext';

const TOAST_DURATION = 4000;

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: Warning,
  info: Info,
};

const styles = {
  success: 'bg-success-light border-success text-success-dark',
  error: 'bg-danger-light border-danger text-danger-dark',
  warning: 'bg-warning-light border-warning text-warning-dark',
  info: 'bg-info-light border-info text-info',
};

const ToastItem = ({ toast, onRemove }) => {
  const [exiting, setExiting] = useState(false);
  const Icon = icons[toast.type] || Info;

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-button border shadow-card-hover max-w-sm transition-all duration-300 ${
        styles[toast.type] || styles.info
      } ${exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" weight="fill" />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const { state, dispatch } = useApp();

  const handleRemove = (id) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  };

  if (state.toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {state.toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={handleRemove} />
      ))}
    </div>
  );
};

export default ToastContainer;
