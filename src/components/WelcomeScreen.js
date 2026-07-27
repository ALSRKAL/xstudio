import { memo, useMemo } from 'react';
import { ArrowUpRight, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { EXAMPLE_ICONS, FEATURE_ICONS } from '../config/icons';
import { APP_CONFIG } from '../config/api';
import { useTranslation } from '../utils/translations';

// Feature cards and example prompts are data, not markup: one definition per
// mode keeps the two modes from drifting apart.
const FEATURES = {
  text: [
    { icon: 'code', title: 'codeGeneration', desc: 'codeGenerationDesc', prompt: 'codeGenerationPrompt' },
    { icon: 'writing', title: 'contentWriting', desc: 'contentWritingDesc', prompt: 'contentWritingPrompt' },
    { icon: 'analysis', title: 'analysis', desc: 'analysisDesc', prompt: 'analysisPrompt' },
    { icon: 'learning', title: 'learning', desc: 'learningDesc', prompt: 'learningPrompt' },
  ],
  image: [
    { icon: 'art', title: 'artDesign', desc: 'artDesignDesc', prompt: 'artDesignPrompt' },
    { icon: 'landscape', title: 'landscapes', desc: 'landscapesDesc', prompt: 'landscapesPrompt' },
    { icon: 'character', title: 'characters', desc: 'charactersDesc', prompt: 'charactersPrompt' },
    { icon: 'fantasy', title: 'fantasy', desc: 'fantasyDesc', prompt: 'fantasyPrompt' },
  ],
};

const EXAMPLES = {
  text: [
    { icon: 'terminal', main: 'exampleText1', sub: 'exampleText1Sub' },
    { icon: 'science', main: 'exampleText2', sub: 'exampleText2Sub' },
    { icon: 'component', main: 'exampleText3', sub: 'exampleText3Sub' },
  ],
  image: [
    { icon: 'city', main: 'exampleImage1', sub: 'exampleImage1Sub' },
    { icon: 'robot', main: 'exampleImage2', sub: 'exampleImage2Sub' },
    { icon: 'nature', main: 'exampleImage3', sub: 'exampleImage3Sub' },
  ],
};

const WelcomeScreen = memo(({ mode, onPromptClick, language = 'ar' }) => {
  const { t } = useTranslation(language);
  const isText = mode === 'text';

  const features = useMemo(() => FEATURES[isText ? 'text' : 'image'], [isText]);
  const examples = useMemo(() => EXAMPLES[isText ? 'text' : 'image'], [isText]);

  return (
    <div className="welcome">
      <div className="welcome-header">
        <div className="welcome-icon-wrapper">
          {isText ? (
            <MessageSquare className="welcome-icon" aria-hidden="true" />
          ) : (
            <ImageIcon className="welcome-icon" aria-hidden="true" />
          )}
        </div>
        <h2>{isText ? t('welcomeTitle') : t('welcomeTitleImage')}</h2>
        <p className="welcome-subtitle">
          {isText ? t('welcomeSubtitle') : t('welcomeSubtitleImage')}
        </p>
      </div>

      <div className="features-grid">
        {features.map((feature) => {
          const Icon = FEATURE_ICONS[feature.icon];
          return (
            <button
              type="button"
              key={feature.title}
              className="feature-card"
              onClick={() => onPromptClick(t(feature.prompt))}
            >
              <span className="feature-icon">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="feature-body">
                <span className="feature-title">{t(feature.title)}</span>
                <span className="feature-desc">{t(feature.desc)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="example-prompts">
        <h3 className="example-title">{t('examplesTitle')}</h3>
        {examples.map((example) => {
          const Icon = EXAMPLE_ICONS[example.icon];
          return (
            <button
              type="button"
              key={example.main}
              className="example-prompt"
              onClick={() => onPromptClick(t(example.main))}
            >
              <span className="example-icon">
                <Icon size={16} aria-hidden="true" />
              </span>
              <span className="example-text">
                <span className="example-main">{t(example.main)}</span>
                <span className="example-sub">{t(example.sub)}</span>
              </span>
              <ArrowUpRight size={15} className="example-arrow" aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <p className="welcome-footnote">{APP_CONFIG.name} · {t('shortcutNewChat')}</p>
    </div>
  );
});

WelcomeScreen.displayName = 'WelcomeScreen';

export default WelcomeScreen;
