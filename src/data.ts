import { Tool, PricingPlan } from './types';

export const TOOLS: Tool[] = [
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into one clean document, in any order you choose.',
    category: 'pdf',
    icon: 'Merge',
    badge: 'Popular',
    color: 'indigo'
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Extract specific page ranges or split every page into standalone PDF files.',
    category: 'pdf',
    icon: 'Split',
    color: 'emerald'
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce the file size of your PDFs while maintaining maximum resolution quality.',
    category: 'pdf',
    icon: 'FileArchive',
    badge: 'Highly Efficient',
    color: 'violet'
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    description: 'Extract all pages inside a PDF and save them as high-quality PNG or JPG files.',
    category: 'pdf',
    icon: 'FileImage',
    color: 'amber'
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert JPG, PNG, or WebP images into a single professional PDF document.',
    category: 'image',
    icon: 'FileUp',
    color: 'teal'
  },
  {
    id: 'image-converter',
    name: 'Image Converter',
    description: 'Instantly convert images between PNG, JPG, WebP, SVG, and other popular formats.',
    category: 'image',
    icon: 'RefreshCw',
    color: 'pink'
  },
  {
    id: 'encrypt-pdf',
    name: 'Password Protect & Decrypt',
    description: 'Protect files with passwords (AES-256) or unlock already encrypted secure PDFs.',
    category: 'security',
    icon: 'Lock',
    color: 'rose'
  },
  {
    id: 'ocr-scan',
    name: 'OCR Scan',
    description: 'Extract copyable text from scanned PDFs, invoices, and physical screenshots.',
    category: 'ai',
    icon: 'ScanText',
    badge: 'AI Powered',
    color: 'sky'
  },
  {
    id: 'ai-fix',
    name: 'AI Smart Fix',
    description: 'Correct typos, proofread, and automatically reformat documents using Gemini AI.',
    category: 'ai',
    icon: 'Sparkles',
    badge: 'New',
    color: 'fuchsia'
  },
  {
    id: 'view-metadata',
    name: 'View Metadata',
    description: 'Inspect internal document properties, authors, titles, creation dates, and format specifications.',
    category: 'pdf',
    icon: 'Info',
    badge: 'New',
    color: 'blue'
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate Pages',
    description: 'Rotate specific pages or all pages of a PDF document by 90, 180, or 270 degrees clockwise or counter-clockwise.',
    category: 'pdf',
    icon: 'RotateCw',
    badge: 'New',
    color: 'amber'
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark',
    description: 'Overlay custom styled text strings or logo graphic layers onto target document page structures.',
    category: 'pdf',
    icon: 'Layers',
    badge: 'New',
    color: 'rose'
  }
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free Starter',
    priceMonthly: 0,
    priceAnnually: 0,
    description: 'Perfect for individuals and light personal document conversions.',
    features: [
      'Up to 5 file conversions per day',
      'Maximum 15 MB file size limit',
      'Merge, Split, and Compress core tools',
      'Standard processing speeds',
      'Secure client-side offline rendering'
    ]
  },
  {
    id: 'pro',
    name: 'Professional Pro',
    priceMonthly: 9,
    priceAnnually: 7,
    description: 'Our most popular plan for freelancers, students, and active creators.',
    features: [
      'Unlimited file conversions',
      'Maximum 500 MB file size limit',
      'All 9+ PDF and Image tools unlocked',
      'AI-powered OCR and Smart Fix',
      'Priority express cloud-assisted speed',
      'Premium dark & light custom theme panels',
      'Priority customer email support'
    ],
    badge: 'Most Popular',
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise Plus',
    priceMonthly: 29,
    priceAnnually: 22,
    description: 'Collaborative workspaces and high-capacity pipelines for organizations.',
    features: [
      'Everything in Professional Pro',
      'Unlimited users inside team workspace',
      'No file size restrictions',
      'Batch background folder automation',
      'Enterprise SSO & custom domain integrations',
      'Dedicated success manager & 24/7 Slack support',
      'Custom API access with 99.9% uptime SLA'
    ]
  }
];

export const MOCK_FILES = [
  { id: 'mock-1', name: 'Invoice_June_2025.pdf', size: 4851200, type: 'application/pdf', pageCount: 3, uploadedAt: new Date() },
  { id: 'mock-2', name: 'Tax_Review_Draft.pdf', size: 8192000, type: 'application/pdf', pageCount: 8, uploadedAt: new Date() },
  { id: 'mock-3', name: 'Portfolio_v2_Compressed.pdf', size: 1572800, type: 'application/pdf', pageCount: 4, uploadedAt: new Date() }
];
