'use client';

import { ChatInterface } from '@/components/ChatInterface';

export default function SearchPage() {
  return (
    <div className="h-[calc(100vh-8rem)] md:h-[calc(100vh-5rem)] flex flex-col">
      <ChatInterface />
    </div>
  );
}
