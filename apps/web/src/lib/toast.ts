import toast from 'react-hot-toast';
import { AlertTriangle, Info } from 'lucide-react';
import { createElement } from 'react';

export function toastSuccess(mensagem: string) {
  toast.success(mensagem);
}

export function toastError(mensagem: string) {
  toast.error(mensagem);
}

export function toastWarning(mensagem: string) {
  toast.custom((t) =>
    createElement(
      'div',
      {
        className: `flex items-center gap-2 rounded-md bg-warning-light px-4 py-3 text-sm font-medium text-warning shadow-card ${
          t.visible ? 'opacity-100' : 'opacity-0'
        }`,
      },
      createElement(AlertTriangle, { size: 16 }),
      mensagem
    )
  );
}

export function toastInfo(mensagem: string) {
  toast.custom((t) =>
    createElement(
      'div',
      {
        className: `flex items-center gap-2 rounded-md bg-primary-xlight px-4 py-3 text-sm font-medium text-primary shadow-card ${
          t.visible ? 'opacity-100' : 'opacity-0'
        }`,
      },
      createElement(Info, { size: 16 }),
      mensagem
    )
  );
}
