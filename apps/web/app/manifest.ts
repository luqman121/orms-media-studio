import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'استوديو الميديا',
    short_name: 'ORMS',
    description: 'توليد الصور والفيديو بالذكاء الاصطناعي عبر OpenRouter',
    start_url: '/generate',
    display: 'standalone',
    background_color: '#07040D',
    theme_color: '#864FF2',
    orientation: 'any',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcuts: [
      { name: 'توليد صورة', url: '/generate?type=image', description: 'إنشاء صورة جديدة' },
      { name: 'توليد فيديو', url: '/generate?type=video', description: 'إنشاء فيديو جديد' },
      { name: 'السجل', url: '/history', description: 'عرض الوسائط المولّدة' },
    ],
  };
}
