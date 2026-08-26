import { createContext, useContext, useEffect, type ReactNode } from "react";

export type NavigationGuard = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export type RegisterNavigationGuard = (guard: NavigationGuard) => () => void;
export type RequestGuardedNavigation = (action: () => void | Promise<void>) => void;

type NavigationGuardContextValue = {
  register: RegisterNavigationGuard;
  request: RequestGuardedNavigation;
};

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export function NavigationGuardProvider(props: {
  register: RegisterNavigationGuard;
  request: RequestGuardedNavigation;
  children: ReactNode;
}) {
  return (
    <NavigationGuardContext.Provider value={{ register: props.register, request: props.request }}>
      {props.children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard(guard: NavigationGuard | null) {
  const context = useContext(NavigationGuardContext);
  const register = context?.register;
  const title = guard?.title;
  const description = guard?.description;
  const confirmLabel = guard?.confirmLabel;
  const cancelLabel = guard?.cancelLabel;

  useEffect(() => {
    if (!register || !title || !description) return;
    return register({ title, description, confirmLabel, cancelLabel });
  }, [cancelLabel, confirmLabel, description, register, title]);
}

export function useGuardedNavigation(): RequestGuardedNavigation {
  const context = useContext(NavigationGuardContext);
  return context?.request ?? runNavigationImmediately;
}

function runNavigationImmediately(action: () => void | Promise<void>) {
  void action();
}
