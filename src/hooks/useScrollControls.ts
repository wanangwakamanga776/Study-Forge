import { useEffect, useCallback } from 'react';

/**
 * Hook to enable smooth keyboard scrolling for a specific element or the window.
 * Handles arrow keys and scroll wheel interactions.
 */
export const useScrollControls = (options = { speed: 60 }) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Prevent interference with input fields
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                    target.tagName === 'TEXTAREA' || 
                    target.isContentEditable ||
                    target.closest('[contenteditable="true"]');
    
    if (isInput) return;

    // Find the scrollable container. 
    // Usually we want the one under the mouse or the main window.
    // For simplicity, we search for the scrollable parent of the target or look for known scroll areas.
    
    const findScrollable = (el: HTMLElement | null, horizontal: boolean): HTMLElement | null => {
        if (!el) return null;
        const style = window.getComputedStyle(el);
        const overflow = horizontal ? style.overflowX : style.overflowY;
        if ((overflow === 'auto' || overflow === 'scroll') && 
            (horizontal ? el.scrollWidth > el.clientWidth : el.scrollHeight > el.clientHeight)) {
            return el;
        }
        return findScrollable(el.parentElement, horizontal);
    };

    const isHorizontal = ['ArrowLeft', 'ArrowRight'].includes(e.key);
    const isVertical = ['ArrowUp', 'ArrowDown'].includes(e.key);

    if (!isHorizontal && !isVertical) return;

    // Special case: if we are in a text-heavy area or modal, we might want to scroll it.
    // Otherwise, we default to the window.
    const scrollContainer = findScrollable(target, isHorizontal) || document.scrollingElement as HTMLElement;

    if (!scrollContainer) return;

    const distance = options.speed;

    switch (e.key) {
      case 'ArrowLeft':
        scrollContainer.scrollBy({ left: -distance, behavior: 'smooth' });
        e.preventDefault();
        break;
      case 'ArrowRight':
        scrollContainer.scrollBy({ left: distance, behavior: 'smooth' });
        e.preventDefault();
        break;
      case 'ArrowUp':
        scrollContainer.scrollBy({ top: -distance, behavior: 'smooth' });
        e.preventDefault();
        break;
      case 'ArrowDown':
        scrollContainer.scrollBy({ top: distance, behavior: 'smooth' });
        e.preventDefault();
        break;
    }
  }, [options.speed]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
