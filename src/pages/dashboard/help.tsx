import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Info,
  BookOpen,
  MessageCircle,
  ChevronDown,
  UploadCloud,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { t } = useTranslation();
  const steps = t.helpPage.steps;
  const faqs = t.helpPage.faqs;

  return (
    <div className="p-4 lg:p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        {...fadeUp} 
        className="relative overflow-hidden rounded-3xl p-8 lg:p-12 bg-gradient-to-br from-primary/10 via-background to-accent/5 border border-primary/20 shadow-glow"
      >
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-lg">
            <HelpCircle className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">{t.helpPage.title}</h1>
          <p className="text-muted-foreground text-lg">
            {t.helpPage.subtitle}
          </p>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-accent/20 blur-[100px]" />
      </motion.div>

      {/* Apa itu DocuMind */}
      <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
        <Card className="overflow-hidden border-border/50">
          <CardHeader className="bg-surface-2 border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Info className="h-5 w-5 text-primary" /> {t.helpPage.whatTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              {t.helpPage.whatBody1}
            </p>
            <p>
              {t.helpPage.whatBody2}
            </p>
            <p>
              {t.helpPage.whatBody3}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tutorial Singkat */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <h2 className="flex items-center gap-2 text-xl font-bold mb-4 px-1">
          <BookOpen className="h-5 w-5 text-primary" /> {t.helpPage.tutorialTitle}
        </h2>
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid gap-4 sm:grid-cols-3"
        >
          {/* Step 1 */}
          <motion.div variants={fadeUp}>
            <Card className="h-full bg-surface-1 hover:border-primary/30 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <UploadCloud className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{steps[0][0]}</h3>
                  <p className="text-sm text-muted-foreground">
                    {steps[0][1]}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Step 2 */}
          <motion.div variants={fadeUp}>
            <Card className="h-full bg-surface-1 hover:border-accent/30 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{steps[1][0]}</h3>
                  <p className="text-sm text-muted-foreground">
                    {steps[1][1]}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Step 3 */}
          <motion.div variants={fadeUp}>
            <Card className="h-full bg-surface-1 hover:border-emerald-500/30 transition-colors">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <MessageCircle className="h-7 w-7 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">{steps[2][0]}</h3>
                  <p className="text-sm text-muted-foreground">
                    {steps[2][1]}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* FAQ */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-5 w-5 text-primary" /> {t.helpPage.faqTitle}
            </CardTitle>
            <CardDescription>
              {t.helpPage.faqDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0 space-y-2">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className="border border-border/50 rounded-xl overflow-hidden bg-surface-1"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex items-center justify-between w-full p-4 sm:px-6 text-left hover:bg-surface-2 transition-colors focus:outline-none"
                >
                  <span className="font-medium">{faq[0]}</span>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 sm:px-6 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/50 bg-background/50">
                        {faq[1]}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Spacer */}
      <div className="h-8" />
    </div>
  );
}
