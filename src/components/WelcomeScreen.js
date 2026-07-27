import { memo, useMemo } from 'react';
import { MessageSquare, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from '../utils/translations';

// Feature cards and example prompts are data, not markup: one definition per
// mode keeps the two modes from drifting apart.
const FEATURES = {
  text: [
    { icon: '💻', title: 'codeGeneration', desc: 'codeGenerationDesc', prompt: 'codeGenerationPrompt' },
    { icon: '📝', title: 'contentWriting', desc: 'contentWritingDesc', prompt: 'contentWritingPrompt' },
    { icon: '🔍', title: 'analysis', desc: 'analysisDesc', prompt: 'analysisPrompt' },
    { icon: '🎓', title: 'learning', desc: 'learningDesc', prompt: 'learningPrompt' },
  ],
  image: [
    { icon: '🎨', title: 'artDesign', desc: 'artDesignDesc', prompt: 'artDesignPrompt' },
    { icon: '🌍', title: 'landscapes', desc: 'landscapesDesc', prompt: 'landscapesPrompt' },
    { icon: '🤖', title: 'characters', desc: 'charactersDesc', prompt: 'charactersPrompt' },
    { icon: '✨', title: 'fantasy', desc: 'fantasyDesc', prompt: 'fantasyPrompt' },
  ],
};

const EXAMPLES = {
  text: [
    { icon: '💻', main: 'exampleText1', sub: 'exampleText1Sub' },
    { icon: '🔬', main: 'exampleText2', sub: 'exampleText2Sub' },
    { icon: '⚛️', main: 'exampleText3', sub: 'exampleText3Sub' },
  ],
  image: [
    { icon: '🌆', main: 'exampleImage1', sub: 'exampleImage1Sub' },
    { icon: '🤖', main: 'exampleImage2', sub: 'exampleImage2Sub' },
    { icon: '🌲', main: 'exampleImage3', sub: 'exampleImage3Sub' },
  ],
};

const WelcomeScreen = memo(({ mode, onPromptClick, language = 'ar' }) => {
  const { t } = useTranslation(language);
  const isText = mode === 'text';

  const features = useMemo(() => FEATURES[isText ? 'text' : 'image'], [isText]);
  const examples = useMemo(() => EXAMPLES[isText ? 'text' : 'image'], [isText]);

  return (
    <div className="welcome">
      <div className="welcome-icon-wrapper">
        {isText ? (
          <MessageSquare className="welcome-icon" />
        ) : (
          <ImageIcon className="welcome-icon" />
        )}
      </div>

      <h2>{isText ? t('welcomeTitle') : t('welcomeTitleImage')}</h2>
      <p className="welcome-subtitle">
        {isText ? t('welcomeSubtitle') : t('welcomeSubtitleImage')}
      </p>

      <div className="features-grid">
        {features.map((feature) => (
          <button
            type="button"
            key={feature.title}
            className="feature-card"
            onClick={() => onPromptClick(t(feature.prompt))}
          >
            <div className="feature-icon" aria-hidden="true">
              {feature.icon}
            </div>
            <h4>{t(feature.title)}</h4>
            <p>{t(feature.desc)}</p>
          </button>
        ))}
      </div>

      <div className="example-prompts">
        <h3 className="example-title">✨ {t('examplesTitle')}</h3>
        {examples.map((example) => (
          <button
            type="button"
            key={example.main}
            className="example-prompt"
            onClick={() => onPromptClick(t(example.main))}
          >
            <span className="example-icon" aria-hidden="true">
              {example.icon}
            </span>
            <span className="example-text">
              <span className="example-main">{t(example.main)}</span>
              <span className="example-sub">{t(example.sub)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

WelcomeScreen.displayName = 'WelcomeScreen';

export default WelcomeScreen;
