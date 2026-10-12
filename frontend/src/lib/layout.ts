import { useEffect, useRef, useState } from 'react';

/** Publishes an element's height as a CSS variable on :root, so sticky offsets use the real value. */
export function useCssHeightVar<T extends HTMLElement>(name: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty(name, `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, [name]);
  return ref;
}

/** The last section whose top has scrolled past the sticky header line. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      // Bottom edge of whatever is currently stuck to the top (top bar, and the nav strip on narrow screens).
      let stickyBottom = 0;
      document.querySelectorAll('[data-sticky]').forEach((el) => {
        if (getComputedStyle(el).position !== 'sticky') return;
        stickyBottom = Math.max(stickyBottom, el.getBoundingClientRect().bottom);
      });
      const line = stickyBottom + 32;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // At the very bottom the last section may never reach the line.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = ids[ids.length - 1];
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);
  return active;
}
