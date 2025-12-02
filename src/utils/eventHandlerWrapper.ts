import { logError, setUserAction } from './errorLogger';

/**
 * Wrap event handler to catch all errors
 */
export function wrapEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  actionName?: string,
  context?: Record<string, any>
): T {
  return ((...args: any[]) => {
    try {
      if (actionName) {
        setUserAction(actionName);
      }
      const result = handler(...args);
      
      // Handle async handlers (promises)
      if (result instanceof Promise) {
        return result.catch((error) => {
          logError(error instanceof Error ? error : new Error(String(error)), {
            component: 'eventHandlerWrapper',
            actionName,
            eventHandler: handler.name || 'anonymous',
            isAsync: true,
            ...context,
          });
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      logError(error instanceof Error ? error : new Error(String(error)), {
        component: 'eventHandlerWrapper',
        actionName,
        eventHandler: handler.name || 'anonymous',
        isAsync: false,
        ...context,
      });
      throw error;
    }
  }) as T;
}

/**
 * Create a safe event handler factory
 */
export function createSafeEventHandler(actionName?: string) {
  return <T extends (...args: any[]) => any>(handler: T, context?: Record<string, any>): T => {
    return wrapEventHandler(handler, actionName, context);
  };
}

