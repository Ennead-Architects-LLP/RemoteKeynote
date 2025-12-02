import { useEffect, useCallback, useRef } from 'react';
import { logError, setUserAction } from '../utils/errorLogger';

/**
 * Hook to wrap async operations with error handling
 */
export function useErrorHandler() {
  const handleError = useCallback((error: Error, context?: Record<string, any>) => {
    logError(error, {
      ...context,
      hook: 'useErrorHandler',
    });
  }, []);

  const wrapAsync = useCallback(
    <T extends (...args: any[]) => Promise<any>>(
      fn: T,
      context?: string
    ): T => {
      return (async (...args: any[]) => {
        try {
          return await fn(...args);
        } catch (error) {
          handleError(error instanceof Error ? error : new Error(String(error)), {
            functionName: fn.name,
            context,
          });
          throw error;
        }
      }) as T;
    },
    [handleError]
  );

  return { handleError, wrapAsync };
}

/**
 * Hook to wrap event handlers with error handling
 */
export function useEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  actionName?: string
): T {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  return useCallback(
    ((...args: any[]) => {
      try {
        if (actionName) {
          setUserAction(actionName);
        }
        return handlerRef.current(...args);
      } catch (error) {
        logError(error instanceof Error ? error : new Error(String(error)), {
          component: 'useEventHandler',
          actionName,
          eventHandler: handler.name || 'anonymous',
        });
        throw error;
      }
    }) as T,
    [actionName]
  );
}

/**
 * Hook to wrap useEffect with error handling
 */
export function useSafeEffect(
  effect: () => void | (() => void),
  deps?: React.DependencyList
) {
  useEffect(() => {
    let cleanup: (() => void) | void;
    
    try {
      cleanup = effect();
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        component: 'useSafeEffect',
        hook: 'useEffect',
      });
    }

    return () => {
      if (cleanup && typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), {
            component: 'useSafeEffect',
            hook: 'useEffect cleanup',
          });
        }
      }
    };
  }, deps);
}

/**
 * Hook to wrap async operations in useEffect
 */
export function useAsyncEffect(
  effect: () => Promise<void | (() => void)>,
  deps?: React.DependencyList
) {
  useEffect(() => {
    let isMounted = true;
    let cleanup: (() => void) | void;

    const runEffect = async () => {
      try {
        const result = await effect();
        if (isMounted && result && typeof result === 'function') {
          cleanup = result;
        }
      } catch (error) {
        if (isMounted) {
          logError(error instanceof Error ? error : new Error(String(error)), {
            component: 'useAsyncEffect',
            hook: 'useEffect async',
          });
        }
      }
    };

    runEffect();

    return () => {
      isMounted = false;
      if (cleanup && typeof cleanup === 'function') {
        try {
          cleanup();
        } catch (error) {
          logError(error instanceof Error ? error : new Error(String(error)), {
            component: 'useAsyncEffect',
            hook: 'useEffect async cleanup',
          });
        }
      }
    };
  }, deps);
}

