import { MemoDetail } from '@/components/MemoDetail';

// Required for static export - generates a template page
export function generateStaticParams() {
  // Return a placeholder to generate the page template
  // Cloudflare Pages _redirects will handle dynamic routing
  return [{ id: '_placeholder' }];
}

export default async function MemoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MemoDetail id={id} />;
}
