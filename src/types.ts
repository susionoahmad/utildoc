export interface DocumentFile {
  id: string;
  name: string;
  size: number; // in bytes
  type: string; // e.g. 'application/pdf', 'image/png'
  pageCount: number;
  uploadedAt: Date;
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  pagesRange?: string; // e.g. 'All', '1-5'
  orientation?: 'keep' | 'portrait' | 'landscape';
}

export type ToolCategory = 'all' | 'pdf' | 'image' | 'security' | 'ai';

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string; // Lucide icon name
  badge?: string; // e.g. 'New', 'Popular'
  color: string; // Tailwind color class
}

export interface PricingPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnually: number;
  description: string;
  features: string[];
  badge?: string;
  popular?: boolean;
}
