import { memo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { EXAMPLE_ICONS, FEATURE_ICONS, WELCOME_ICON } from '../config/icons';
import { APP_CONFIG } from '../config/api';
import { useTranslation } from '../utils/translations';

const FEATURES = [
  { icon: 'code', title: 'codeGeneration', desc: 'codeGenerationDesc', prompt: 'codeGenerationPrompt' },
  { icon: 'analysis', title: 'analysis', desc: 'analysisDesc', prompt: 'analysisPrompt' },
  { icon: 'art', title: 'artDesign', desc: 'artDesignDesc', prompt: 'artDesignPrompt' },
  { icon: 'learning', title: 'learning', desc: 'learningDesc', prompt: 'learningPrompt' },
];

const EXAMPLES = [
  { icon: 'terminal', main: 'exampleText1', sub: 'exampleText1Sub' },
  { icon: 'science', main: 'exampleText2', sub: 'exampleText2Sub' },
  { icon: 'city', main: 'exampleImage1', sub: 'exampleImage1Sub' },
  { icon: 'nature', main: 'exampleImage3', sub: 'exampleImage3Sub' },
];

const WelcomeScreen = memo(({ onPromptClick, language = 'ar' }) => {
  const { t } = useTranslation(language);

  return (
    <div className="welcome">
      <div className="welcome-header">
        <div className="welcome-icon-wrapper">
          <WELCOME_ICON className="welcome-icon" aria-hidden="true" />
        </div>
        <h2>{t('welcomeTitle')}</h2>
        <p className="welcome-subtitle">{t('welcomeSubtitle')}</p>
      </div>

      <div className="features-grid">
        {FEATURES.map((feature) => {
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
        {EXAMPLES.map((example) => {
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
