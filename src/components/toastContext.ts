import { createContext, useContext } from 'react';

export type ToastTone = 'info' | 'error' | 'success';

export const ToastCtx = createContext<(msg: string, tone?: ToastTone) => void>(() => {});

export const useToast = () => useContext(ToastCtx);
