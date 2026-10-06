import type { Ref } from 'react';

export interface NavItem {
  id: string;
  label: string;
}

interface Props {
  items: NavItem[];
  active: string;
  navRef: Ref<HTMLElement>;
}

/** Sidebar on desktop; a sticky horizontal strip on narrow screens (CSS only). */
export function SectionNav({ items, active, navRef }: Props) {
  return (
    <nav className="section-nav" aria-label="Report sections" ref={navRef} data-sticky>
      <ul className="nav-inner">
        {items.map((n) => (
          <li key={n.id}>
            <a href={`#${n.id}`} aria-current={active === n.id ? 'location' : undefined}>{n.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
