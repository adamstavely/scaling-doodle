import { isResizeObserverLoop } from './error-handler';

describe('isResizeObserverLoop', () => {
  it('spots the browser notice, directly or as the cause Angular wraps it in', () => {
    const notice = new ErrorEvent('error', { message: 'ResizeObserver loop completed with undelivered notifications.' });
    expect(isResizeObserverLoop(notice)).toBe(true);
    expect(isResizeObserverLoop(new Error('An ErrorEvent with no error occurred', { cause: notice }))).toBe(true);
  });

  it('lets every other error through', () => {
    expect(isResizeObserverLoop(new Error('Http failure response'))).toBe(false);
    expect(isResizeObserverLoop(new ErrorEvent('error', { message: 'Script error.' }))).toBe(false);
    expect(isResizeObserverLoop(undefined)).toBe(false);
  });
});
