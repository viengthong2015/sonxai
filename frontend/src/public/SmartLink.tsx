import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isExternal, isInternalPath, isSafeUrl } from '../lib/url';
import { useSite } from './SiteContext';

interface Props {
  href: string | null | undefined;
  className?: string;
  newTab?: boolean;
  children: ReactNode;
  onClick?: () => void;
}

/** Renders a router Link for site paths, a plain anchor otherwise. Unsafe URLs render as text. */
export function SmartLink({ href, className, newTab, children, onClick }: Props) {
  const { resolvePath } = useSite();
  if (!isSafeUrl(href)) return <span className={className}>{children}</span>;

  if (isInternalPath(href) && !newTab) {
    return (
      <Link to={resolvePath(href)} className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  const blank = newTab || isExternal(href);
  return (
    <a
      href={href}
      className={className}
      onClick={onClick}
      target={blank ? '_blank' : undefined}
      rel={blank ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  );
}

interface ActionProps {
  action?: string;
  url?: string;
  className?: string;
  children: ReactNode;
}

/** A CMS button: either opens the application form or follows a link. */
export function ActionButton({ action, url, className, children }: ActionProps) {
  const { openApply } = useSite();
  if (action === 'apply') {
    return (
      <button type="button" onClick={openApply} className={className}>
        {children}
      </button>
    );
  }
  if (action === 'none') return null;
  return (
    <SmartLink href={url} className={className}>
      {children}
    </SmartLink>
  );
}
