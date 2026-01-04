import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation before importing the component
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

import { Navbar } from './Navbar';

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  describe('rendering', () => {
    it('renders navigation element', () => {
      render(<Navbar />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('renders Vox Mind logo on desktop', () => {
      render(<Navbar />);

      expect(screen.getByText('Vox Mind')).toBeInTheDocument();
    });

    it('renders all navigation items', () => {
      render(<Navbar />);

      // Each nav item appears twice (desktop and mobile)
      expect(screen.getAllByText('녹음')).toHaveLength(2);
      expect(screen.getAllByText('메모')).toHaveLength(2);
      expect(screen.getAllByText('검색')).toHaveLength(2);
    });
  });

  describe('navigation links', () => {
    it('has link to home page', () => {
      render(<Navbar />);

      const homeLinks = screen.getAllByRole('link', { name: /녹음/i });
      expect(homeLinks[0]).toHaveAttribute('href', '/');
    });

    it('has link to memos page', () => {
      render(<Navbar />);

      const memoLinks = screen.getAllByRole('link', { name: /메모/i });
      expect(memoLinks[0]).toHaveAttribute('href', '/memos');
    });

    it('has link to search page', () => {
      render(<Navbar />);

      const searchLinks = screen.getAllByRole('link', { name: /검색/i });
      expect(searchLinks[0]).toHaveAttribute('href', '/search');
    });

    it('has logo link to home page', () => {
      mockUsePathname.mockReturnValue('/memos');
      render(<Navbar />);

      const logoLink = screen.getByText('Vox Mind').closest('a');
      expect(logoLink).toHaveAttribute('href', '/');
    });
  });

  describe('active state', () => {
    it('highlights home link when on home page', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Navbar />);

      const homeLinks = screen.getAllByRole('link', { name: /녹음/i });
      // Desktop link
      expect(homeLinks[0]).toHaveClass('text-primary');
    });

    it('highlights memos link when on memos page', () => {
      mockUsePathname.mockReturnValue('/memos');
      render(<Navbar />);

      const memoLinks = screen.getAllByRole('link', { name: /메모/i });
      // Desktop link
      expect(memoLinks[0]).toHaveClass('text-primary');
    });

    it('highlights search link when on search page', () => {
      mockUsePathname.mockReturnValue('/search');
      render(<Navbar />);

      const searchLinks = screen.getAllByRole('link', { name: /검색/i });
      // Desktop link
      expect(searchLinks[0]).toHaveClass('text-primary');
    });

    it('does not highlight inactive links', () => {
      mockUsePathname.mockReturnValue('/');
      render(<Navbar />);

      const memoLinks = screen.getAllByRole('link', { name: /메모/i });
      const searchLinks = screen.getAllByRole('link', { name: /검색/i });

      // Desktop links should not have primary color when not active
      expect(memoLinks[0]).toHaveClass('text-text-secondary');
      expect(searchLinks[0]).toHaveClass('text-text-secondary');
    });
  });

  describe('layout', () => {
    it('has fixed positioning for mobile', () => {
      render(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('fixed');
      expect(nav).toHaveClass('bottom-0');
    });

    it('has desktop header container', () => {
      render(<Navbar />);

      // Desktop header is hidden on mobile - look for the container with the logo
      const nav = screen.getByRole('navigation');
      const desktopHeaderContainer = nav.querySelector('.hidden.md\\:flex');
      expect(desktopHeaderContainer).toBeInTheDocument();
    });

    it('has mobile bottom nav container', () => {
      render(<Navbar />);

      // Mobile nav is shown on mobile, hidden on desktop
      const nav = screen.getByRole('navigation');
      const mobileNav = nav.querySelector('.flex.md\\:hidden');
      expect(mobileNav).toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('renders mic icon for recording', () => {
      render(<Navbar />);

      const homeLinks = screen.getAllByRole('link', { name: /녹음/i });
      const svg = homeLinks[0].querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders list icon for memos', () => {
      render(<Navbar />);

      const memoLinks = screen.getAllByRole('link', { name: /메모/i });
      const svg = memoLinks[0].querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('renders search icon for search', () => {
      render(<Navbar />);

      const searchLinks = screen.getAllByRole('link', { name: /검색/i });
      const svg = searchLinks[0].querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has backdrop blur effect', () => {
      render(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('backdrop-blur-md');
    });

    it('has high z-index for overlay', () => {
      render(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('z-50');
    });

    it('has border styling', () => {
      render(<Navbar />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('border-t');
      expect(nav).toHaveClass('border-surface-lighter');
    });
  });
});
