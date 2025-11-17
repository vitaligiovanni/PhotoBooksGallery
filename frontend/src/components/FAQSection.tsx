import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  title?: string;
  items?: FAQItem[];
}

export function FAQSection({ title, items }: FAQSectionProps) {
  const { t } = useTranslation();
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  
  const defaultItems: FAQItem[] = [
    {
      question: t('faqQuestion1'),
      answer: t('faqAnswer1')
    },
    {
      question: t('faqQuestion2'),
      answer: t('faqAnswer2')
    },
    {
      question: t('faqQuestion3'),
      answer: t('faqAnswer3')
    },
    {
      question: t('faqQuestion4'),
      answer: t('faqAnswer4')
    },
    {
      question: t('faqQuestion5'),
      answer: t('faqAnswer5')
    }
  ];

  const faqItems = items || defaultItems;
  const sectionTitle = title || t('faqTitle');

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-serif font-bold text-center mb-2 text-gray-800">
        {sectionTitle}
      </h2>
      <p className="text-center text-gray-600 mb-8">
        {t('faqSubtitle')}
      </p>
      
      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <Card key={index} className="card-hover border-0 bg-white shadow-sm">
            <CardContent className="p-0">
              <button
                className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
                onClick={() => toggleItem(index)}
              >
                <h3 className="font-semibold text-gray-800 pr-4">
                  {item.question}
                </h3>
                {openItems.has(index) ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              
              {openItems.has(index) && (
                <div className="px-6 pb-6 pt-0">
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-gray-600 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center mt-8">
        <p className="text-gray-600 mb-4">
          {t('contactUs')}
        </p>
        <a 
          href="mailto:support@photobooksgallery.am" 
          className="link-animate inline-flex items-center text-primary font-semibold hover:text-primary/80"
        >
          {t('support')}
        </a>
      </div>
    </div>
  );
}