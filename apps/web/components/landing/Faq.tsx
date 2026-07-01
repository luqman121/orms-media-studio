'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Sparkles } from 'lucide-react';

const faqs = [
  {
    q: 'ما هي منصة ORMS؟',
    a: 'ORMS استوديو ذكاء اصطناعي عربي لتوليد الصور والفيديوهات من وصف نصي، عبر نماذج OpenRouter المتعددة في واجهة واحدة بسيطة.',
  },
  {
    q: 'هل أحتاج خبرة تقنية لاستخدامها؟',
    a: 'إطلاقًا. اكتب فكرتك بلغتك، واستخدم مساعد البرومبت لتحسين الوصف تلقائيًا، ثم اضغط توليد.',
  },
  {
    q: 'ما أنواع المحتوى التي يمكنني إنشاؤها؟',
    a: 'صور واقعية وفنية، فيديوهات قصيرة، إعلانات منتجات، تصاميم سوشيال ميديا، ومشاهد سينمائية وثلاثية الأبعاد.',
  },
  {
    q: 'هل يمكنني استخدام صورة مرجعية؟',
    a: 'نعم، يمكنك رفع صورة مرجعية لتوليد صورة من صورة (img2img) أو لبدء فيديو من إطار أول.',
  },
  {
    q: 'هل تدعم المنصة اللغة العربية بالكامل؟',
    a: 'نعم، الواجهة مصممة عربية RTL بالكامل، ويمكنك كتابة الأوصاف بالعربية أو الإنجليزية.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative mx-auto max-w-[760px] scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="mb-10 text-center">
        <span className="badge mx-auto">الأسئلة الشائعة</span>
        <h2 className="font-display mt-4 text-balance text-[clamp(1.9rem,4.5vw,2.6rem)] font-extrabold leading-tight">
          أسئلة يطرحها الجميع
        </h2>
      </div>

      <div className="space-y-3">
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 p-5 text-right"
              >
                <span className="text-base font-bold text-text-100">{f.q}</span>
                <ChevronDown
                  size={20}
                  className={`shrink-0 text-primary-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              <div
                className="grid transition-all duration-300"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm leading-relaxed text-text-400">{f.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-sm text-text-500">
        لديك سؤال آخر؟{' '}
        <Link href="/auth" className="inline-flex items-center gap-1 font-semibold text-primary-400 hover:text-primary-500">
          <Sparkles size={14} /> جرّب المنصة الآن
        </Link>
      </p>
    </section>
  );
}
