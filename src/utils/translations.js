// Translation system for X Studio

import { useCallback } from 'react';

export const translations = {
  ar: {
    // Sidebar
    newChat: 'محادثة جديدة',
    currentModel: 'النموذج الحالي',
    chatHistory: 'سجل المحادثات',
    noHistory: 'لا يوجد سجل محادثات بعد',
    settings: 'الإعدادات',
    poweredBy: 'مدعوم بواسطة',
    
    // Chat
    you: 'أنت',
    thinking: 'يفكر...',
    generatingImage: 'يولد الصورة...',
    
    // Input
    textChat: 'محادثة نصية',
    imageGenerator: 'مولد الصور',
    messagePlaceholder: 'اسأل أي شيء أو صف الصورة التي تريد إنشاءها...',
    imagePlaceholder: 'صف الصورة التي تريد إنشاءها...',
    sendHint: 'Enter للإرسال، Shift+Enter لسطر جديد — اطلب صورة بالكلام أو ابدأ بـ /صورة',
    generateHint: 'اضغط Enter لتوليد الصورة',
    
    // Welcome Screen
    welcomeTitle: 'مرحباً بك في X Studio',
    welcomeSubtitle: 'اسأل، أنشئ، حلّل، أو صف صورة وسيختار X Studio الأداة المناسبة تلقائياً',
    textMode: 'وضع النص',
    textModeDesc: 'محادثات ذكية مع نماذج AI متقدمة',
    imageMode: 'وضع الصور',
    imageModeDesc: 'إنشاء صور مذهلة من النص',
    examplesTitle: 'أمثلة للبدء',
    
    // Messages
    loadingImage: 'تحميل الصورة...',
    prompt: 'الوصف',
    download: 'تحميل',
    copyUrl: 'نسخ الرابط',
    copied: 'تم النسخ',
    regenerate: 'إعادة التوليد',
    copy: 'نسخ',
    
    // Settings
    settingsTitle: 'الإعدادات',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    theme: 'المظهر',
    light: 'فاتح',
    dark: 'داكن',
    clearData: 'مسح البيانات',
    clearAllChats: 'مسح جميع المحادثات',
    close: 'إغلاق',
    
    // Model Selector
    selectModel: 'اختر النموذج',
    freeUnlimited: 'مجاني وغير محدود',
    professional: 'احترافي',
    messagesPerMonth: 'رسالة كل 30 يوم',
    select: 'اختيار',
    selected: 'محدد',
    
    // Limit Dialog
    limitReached: 'وصلت للحد الأقصى المجاني',
    limitMessage: 'لقد استخدمت جميع الطلبات المجانية للنماذج الاحترافية!',
    resetIn: 'إعادة التعيين بعد',
    days: 'يوم',
    option1: 'احصل على وصول غير محدود',
    option1Desc: 'تواصل مع المطور للحصول على استخدام غير محدود للنماذج الاحترافية',
    contactNow: 'تواصل الآن للترقية',
    option2: 'استمر مع النموذج الأساسي',
    option2Desc: 'نموذج مجاني بدون حدود - استخدام غير محدود',
    switchToBase: 'التبديل إلى النموذج الأساسي',
    or: 'أو',
    
    // Errors
    errorGeneratingText: 'حدث خطأ في توليد النص. يرجى المحاولة مرة أخرى.',
    errorGeneratingImage: 'حدث خطأ في توليد الصورة. يرجى المحاولة مرة أخرى.',
    
    // Load More
    loadOlderMessages: 'تحميل رسائل أقدم',
    more: 'المزيد',
    
    // Alerts
    confirmClearChats: 'حذف جميع المحادثات؟\n\nسيتم حذف السجل بالكامل وكل الرسائل والصور.\nلا يمكن التراجع عن هذا الإجراء.',
    chatsCleared: 'تم حذف جميع المحادثات',
    confirmDeleteChat: 'هل تريد حذف هذه المحادثة؟',
    
    // Welcome Screen - Image Mode
    welcomeTitleImage: 'إنشاء صور مذهلة بالذكاء الاصطناعي',
    welcomeSubtitleImage: 'صف الصورة التي تريد إنشاءها',
    artDesign: 'فن وتصميم',
    artDesignDesc: 'رسومات إبداعية',
    artDesignPrompt: 'أنشئ صورة فنية إبداعية بأسلوب',
    landscapes: 'مناظر طبيعية',
    landscapesDesc: 'مشاهد جميلة',
    landscapesPrompt: 'منظر طبيعي خلاب مع',
    characters: 'شخصيات',
    charactersDesc: 'شخصيات فريدة',
    charactersPrompt: 'شخصية فريدة ومميزة',
    fantasy: 'خيال',
    fantasyDesc: 'عوالم سحرية',
    fantasyPrompt: 'عالم خيالي سحري مع',
    exampleImage1: 'أنشئ صورة لمدينة مستقبلية عند غروب الشمس مع سيارات طائرة',
    exampleImage1Sub: 'خيال علمي ومستقبل',
    exampleImage2: 'روبوت لطيف يقرأ كتاباً في مكتبة',
    exampleImage2Sub: 'شخصيات ومشاهد',
    exampleImage3: 'أنشئ صورة لغابة سحرية مع فطر متوهج في الليل',
    exampleImage3Sub: 'خيال وطبيعة',
    
    // Welcome Screen - Text Mode Features
    codeGeneration: 'توليد الأكواد',
    codeGenerationDesc: 'كتابة وتصحيح وتحسين الأكواد',
    codeGenerationPrompt: 'ساعدني في كتابة كود برمجي',
    contentWriting: 'كتابة المحتوى',
    contentWritingDesc: 'مقالات، رسائل بريد إلكتروني، والمزيد',
    contentWritingPrompt: 'ساعدني في كتابة مقال عن',
    analysis: 'التحليل',
    analysisDesc: 'رؤى البيانات والتفسيرات',
    analysisPrompt: 'قم بتحليل وشرح',
    learning: 'التعلم',
    learningDesc: 'دروس تعليمية وشروحات',
    learningPrompt: 'علمني عن',
    
    // Welcome Screen - Text Mode Examples
    exampleText1: 'اكتب دالة Python لترتيب قائمة',
    exampleText1Sub: 'توليد الأكواد',
    exampleText2: 'اشرح الحوسبة الكمومية بمصطلحات بسيطة',
    exampleText2Sub: 'التعلم والتعليم',
    exampleText3: 'أنشئ مكون React لزر',
    exampleText3Sub: 'تطوير الويب',
    
    // Model Selector
    selectModelTitle: 'اختر النموذج',
    veryFast: 'سريع جداً',
    fast: 'سريع',
    medium: 'متوسط',
    remaining: 'متبقي',
    daily: 'يومي',
    unlimited: 'غير محدود',
    limitReachedModel: 'انتهت الاستخدامات',
    limitAlert: 'انتهت حصة هذا النموذج. تُعاد الحصة بعد 30 يوماً من أول استخدام، ويمكنك الاستمرار بالنموذج المجاني بدون حدود.',

    // ---- v2: errors ----
    errOffline: 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة وحاول مرة أخرى.',
    backOnline: 'تم استعادة الاتصال بالإنترنت',
    errRateLimited: 'طلبات كثيرة في وقت قصير. انتظر لحظة ثم أعد المحاولة.',
    errNoProvider: 'لا يوجد مزوّد ذكاء اصطناعي مُهيّأ على الخادم. تواصل مع مسؤول الموقع.',
    errModelUnavailable: 'تعذر تشغيل النموذج المحدد. تأكد من تهيئة مفتاح المزوّد أو استخدم التشغيل الكامل على المنفذ 8888.',
    errProviderBlocked: 'حساب المزوّد يحجب كل المصادر لهذا النموذج. فعّل المزوّدين من إعدادات الخصوصية في OpenRouter (openrouter.ai/settings/privacy) ثم أعد المحاولة.',
    errTimeout: 'استغرق النموذج وقتاً طويلاً. حاول مرة أخرى أو اختر نموذجاً أسرع.',
    errEmpty: 'لم يرجع النموذج أي إجابة. أعد المحاولة، وإن تكرر الأمر اختر نموذجاً آخر.',
    errGeneric: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
    errGeneratingImage: 'تعذر توليد الصورة. يرجى المحاولة مرة أخرى.',
    errImageLoad: 'تعذر تحميل الصورة.',
    errRegenerateTarget: 'لا يمكن إعادة توليد هذه الرسالة.',
    copyFailed: 'فشل النسخ. حاول مرة أخرى.',
    downloadStarted: 'بدأ تحميل الصورة',
    downloadFailed: 'فشل تحميل الصورة.',
    fallbackUsed: 'تم التبديل تلقائياً إلى النموذج المجاني لضمان الرد.',

    // ---- v2: limits ----
    limitDeviceReached: 'انتهت حصتك من النماذج المتقدمة على هذا الجهاز.',
    limitModelReached: 'انتهت حصة هذا النموذج.',
    modelSwitched: 'تم تغيير النموذج',

    // ---- v2: model selector ----
    searchModels: 'ابحث عن نموذج...',
    noModelsFound: 'لا توجد نتائج مطابقة',
    refreshModels: 'تحديث القائمة',
    loadingModels: 'جاري تحميل النماذج...',
    liveModels: 'قائمة محدثة من المزوّدين',
    offlineModels: 'قائمة احتياطية (تعذر جلب القائمة الحيوية)',
    modelCount: 'نموذج',
    noKeyNeeded: 'بدون مفتاح',
    visionBadge: 'يقرأ الصور',
    codeBadge: 'برمجة',
    reasoningBadge: 'استنتاج',
    contextLabel: 'الذاكرة',
    tokens: 'رمز',

    // ---- v2: misc UI ----
    openMenu: 'فتح القائمة',
    stopGenerating: 'إيقاف التوليد',
    sendMessage: 'إرسال الرسالة',
    generateImage: 'توليد صورة',
    editMessage: 'تعديل',
    copyMessage: 'نسخ الرسالة',
    copyCode: 'نسخ الكود',
    runCode: 'تشغيل المعاينة',
    selectModelFromComposer: 'اختيار النموذج',
    about: 'حول التطبيق',
    version: 'الإصدار',
    shortcutNewChat: 'محادثة جديدة: Ctrl+K',
    textModels: 'نماذج نصية',
    imageModels: 'نماذج صور',

    // ---- v3: image inside the chat ----
    imageModeShort: 'صورة',
    imageModeOn: 'وضع الصورة مُفعّل — اضغط للعودة إلى النص',
    imageModeOff: 'تفعيل وضع الصورة لكل رسالة تالية',
    imageModeHint: 'وضع الصورة مُفعّل — صف الصورة واضغط Enter',
    imagePromptMissing: 'اكتب وصف الصورة بعد الأمر.',
    autoImageNote: 'فُهم طلبك كطلب صورة.',
    answerAsText: 'أجب كنص بدلاً من ذلك',
    copyPrompt: 'نسخ الوصف',
    viewFullSize: 'عرض بالحجم الكامل',

    // Workspace
    workspaceTitle: 'مساحة العمل',
    preview: 'المعاينة',
    files: 'ملفات',
    preparingProject: 'جاري بناء المشروع...',
    reloadPreview: 'إعادة تحميل المعاينة',
    closeWorkspace: 'إغلاق مساحة العمل',
    previewSize: 'حجم المعاينة',
    desktop: 'سطح المكتب',
    tablet: 'جهاز لوحي',
    mobile: 'هاتف',
    projectFiles: 'ملفات المشروع',
    editFile: 'تحرير الملف',
    previewFailed: 'تعذر تشغيل المعاينة بأمان.',
    openWorkspace: 'فتح المشروع والمعاينة',
    artifactReady: 'اكتمل بناء المشروع وأصبح جاهزاً للمعاينة والتعديل.',
    artifactBuilding: 'يبني المشروع وملفاته الآن...',
    artifactInvalid: 'لم يكتمل المشروع بصيغة قابلة للتشغيل. أعد التوليد للمحاولة مرة أخرى.',
    artifactSaveFailed: 'تعذر حفظ المشروع في هذا المتصفح.',
    artifactNotFound: 'لم يعد هذا المشروع متاحاً على الجهاز.',

    imageExpired: 'هذه الصورة لم تُحفظ لأن المزوّد أرجعها كبيانات مباشرة. أعد التوليد لعرضها.',
  },
  
  en: {
    // Sidebar
    newChat: 'New Chat',
    currentModel: 'Current Model',
    chatHistory: 'Chat History',
    noHistory: 'No chat history yet',
    settings: 'Settings',
    poweredBy: 'Powered by',
    
    // Chat
    you: 'You',
    thinking: 'Thinking...',
    generatingImage: 'Generating image...',
    
    // Input
    textChat: 'Text Chat',
    imageGenerator: 'Image Generator',
    messagePlaceholder: 'Ask anything or describe an image to create...',
    imagePlaceholder: 'Describe the image you want to create...',
    sendHint: 'Enter to send, Shift+Enter for a new line — just ask for an image, or start with /image',
    generateHint: 'Press Enter to generate image',
    
    // Welcome Screen
    welcomeTitle: 'Welcome to X Studio',
    welcomeSubtitle: 'Ask, create, analyze, or describe an image and X Studio will choose the right tool automatically',
    textMode: 'Text Mode',
    textModeDesc: 'Smart conversations with advanced AI models',
    imageMode: 'Image Mode',
    imageModeDesc: 'Create stunning images from text',
    examplesTitle: 'Examples to get started',
    
    // Messages
    loadingImage: 'Loading image...',
    prompt: 'Prompt',
    download: 'Download',
    copyUrl: 'Copy URL',
    copied: 'Copied',
    regenerate: 'Regenerate',
    copy: 'Copy',
    
    // Settings
    settingsTitle: 'Settings',
    language: 'Language',
    arabic: 'العربية',
    english: 'English',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    clearData: 'Clear Data',
    clearAllChats: 'Clear All Chats',
    close: 'Close',
    
    // Model Selector
    selectModel: 'Select Model',
    freeUnlimited: 'Free & Unlimited',
    professional: 'Professional',
    messagesPerMonth: 'messages per 30 days',
    select: 'Select',
    selected: 'Selected',
    
    // Limit Dialog
    limitReached: 'Free Limit Reached',
    limitMessage: 'You\'ve reached your free usage limit for professional models.',
    resetIn: 'Reset in',
    days: 'days',
    option1: 'Get Unlimited Access',
    option1Desc: 'Contact the developer for unlimited access to professional models',
    contactNow: 'Contact Now for Upgrade',
    option2: 'Continue with Base Model',
    option2Desc: 'Free model without limits - unlimited usage',
    switchToBase: 'Switch to Base Model',
    or: 'OR',
    
    // Errors
    errorGeneratingText: 'Error generating text. Please try again.',
    errorGeneratingImage: 'Error generating image. Please try again.',
    
    // Load More
    loadOlderMessages: 'Load older messages',
    more: 'more',
    
    // Alerts
    confirmClearChats: 'Delete all chats?\n\nThis removes the entire history, every message and every image.\nThis cannot be undone.',
    chatsCleared: 'All chats deleted',
    confirmDeleteChat: 'Delete this chat?',
    
    // Welcome Screen - Image Mode
    welcomeTitleImage: 'Create stunning images with AI',
    welcomeSubtitleImage: 'Describe the image you want to create',
    artDesign: 'Art & Design',
    artDesignDesc: 'Creative illustrations',
    artDesignPrompt: 'Create an image with a creative artistic style inspired by',
    landscapes: 'Landscapes',
    landscapesDesc: 'Beautiful scenery',
    landscapesPrompt: 'Beautiful landscape with',
    characters: 'Characters',
    charactersDesc: 'Unique personas',
    charactersPrompt: 'Unique and distinctive character',
    fantasy: 'Fantasy',
    fantasyDesc: 'Magical worlds',
    fantasyPrompt: 'Magical fantasy world with',
    exampleImage1: 'Create an image of a futuristic city at sunset with flying cars',
    exampleImage1Sub: 'Sci-Fi & Future',
    exampleImage2: 'Cute robot reading a book in a library',
    exampleImage2Sub: 'Characters & Scenes',
    exampleImage3: 'Create an image of a magical forest with glowing mushrooms at night',
    exampleImage3Sub: 'Fantasy & Nature',
    
    // Welcome Screen - Text Mode Features
    codeGeneration: 'Code Generation',
    codeGenerationDesc: 'Write, debug, and optimize code',
    codeGenerationPrompt: 'Help me write code for',
    contentWriting: 'Content Writing',
    contentWritingDesc: 'Articles, emails, and more',
    contentWritingPrompt: 'Help me write an article about',
    analysis: 'Analysis',
    analysisDesc: 'Data insights and explanations',
    analysisPrompt: 'Analyze and explain',
    learning: 'Learning',
    learningDesc: 'Tutorials and explanations',
    learningPrompt: 'Teach me about',
    
    // Welcome Screen - Text Mode Examples
    exampleText1: 'Write a Python function to sort a list',
    exampleText1Sub: 'Code Generation',
    exampleText2: 'Explain quantum computing in simple terms',
    exampleText2Sub: 'Learning & Education',
    exampleText3: 'Create a React component for a button',
    exampleText3Sub: 'Web Development',
    
    // Model Selector
    selectModelTitle: 'Select Model',
    veryFast: 'Very Fast',
    fast: 'Fast',
    medium: 'Medium',
    remaining: 'remaining',
    daily: 'Daily',
    unlimited: 'Unlimited',
    limitReachedModel: 'Limit Reached',
    limitAlert: 'This model has no quota left. It resets 30 days after first use; the free model stays available without limits.',

    // ---- v2: errors ----
    errOffline: 'No internet connection. Check your network and try again.',
    backOnline: 'Back online',
    errRateLimited: 'Too many requests. Wait a moment and try again.',
    errNoProvider: 'No AI provider is configured on the server. Contact the site administrator.',
    errModelUnavailable: 'The selected model could not run. Configure its provider key or use the full-stack server on port 8888.',
    errProviderBlocked: 'The provider account blocks every upstream for this model. Enable the providers in the OpenRouter privacy settings (openrouter.ai/settings/privacy), then retry.',
    errTimeout: 'The model took too long. Try again or pick a faster model.',
    errEmpty: 'The model returned nothing. Try again, and pick another model if it keeps happening.',
    errGeneric: 'Something went wrong. Please try again.',
    errGeneratingImage: 'Could not generate the image. Please try again.',
    errImageLoad: 'Could not load the image.',
    errRegenerateTarget: 'This message cannot be regenerated.',
    copyFailed: 'Copy failed. Please try again.',
    downloadStarted: 'Download started',
    downloadFailed: 'Download failed.',
    fallbackUsed: 'Switched to the free model automatically to keep the reply coming.',

    // ---- v2: limits ----
    limitDeviceReached: 'You have used your advanced-model quota on this device.',
    limitModelReached: 'This model has no quota left.',
    modelSwitched: 'Model switched',

    // ---- v2: model selector ----
    searchModels: 'Search models...',
    noModelsFound: 'No matching models',
    refreshModels: 'Refresh list',
    loadingModels: 'Loading models...',
    liveModels: 'Live list from providers',
    offlineModels: 'Fallback list (live catalogue unavailable)',
    modelCount: 'models',
    noKeyNeeded: 'No key needed',
    visionBadge: 'Vision',
    codeBadge: 'Code',
    reasoningBadge: 'Reasoning',
    contextLabel: 'Context',
    tokens: 'tokens',

    // ---- v2: misc UI ----
    openMenu: 'Open menu',
    stopGenerating: 'Stop generating',
    sendMessage: 'Send message',
    generateImage: 'Generate image',
    editMessage: 'Edit',
    copyMessage: 'Copy message',
    copyCode: 'Copy code',
    runCode: 'Run preview',
    selectModelFromComposer: 'Choose model',
    about: 'About',
    version: 'Version',
    shortcutNewChat: 'New chat: Ctrl+K',
    textModels: 'Text models',
    imageModels: 'Image models',

    // ---- v3: image inside the chat ----
    imageModeShort: 'Image',
    imageModeOn: 'Image mode is on — click to go back to text',
    imageModeOff: 'Turn on image mode for the next messages',
    imageModeHint: 'Image mode is on — describe the image and press Enter',
    imagePromptMissing: 'Add a description after the command.',
    autoImageNote: 'Read as an image request.',
    answerAsText: 'Answer as text instead',
    copyPrompt: 'Copy prompt',
    viewFullSize: 'View full size',

    // Workspace
    workspaceTitle: 'Workspace',
    preview: 'Preview',
    files: 'Files',
    preparingProject: 'Building the project...',
    reloadPreview: 'Reload preview',
    closeWorkspace: 'Close workspace',
    previewSize: 'Preview size',
    desktop: 'Desktop',
    tablet: 'Tablet',
    mobile: 'Mobile',
    projectFiles: 'Project files',
    editFile: 'Edit file',
    previewFailed: 'The preview could not run safely.',
    openWorkspace: 'Open project and preview',
    artifactReady: 'The project is built and ready to preview and edit.',
    artifactBuilding: 'Building the project and its files...',
    artifactInvalid: 'The project did not finish in a runnable format. Regenerate to try again.',
    artifactSaveFailed: 'The project could not be saved in this browser.',
    artifactNotFound: 'This project is no longer available on this device.',

    imageExpired: 'This image was returned inline and is not stored. Regenerate it to view.',
  }
};

export const useTranslation = (language = 'ar') => {
  const t = useCallback(
    (key) => translations[language]?.[key] || translations.ar[key] || key,
    [language]
  );

  return { t };
};
