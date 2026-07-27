// Translation system for X Studio

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
    messagePlaceholder: 'اكتب رسالتك هنا...',
    imagePlaceholder: 'صف الصورة التي تريد إنشاءها...',
    sendHint: 'اضغط Enter للإرسال، Shift+Enter لسطر جديد',
    generateHint: 'اضغط Enter لتوليد الصورة',
    
    // Welcome Screen
    welcomeTitle: 'مرحباً بك في X Studio',
    welcomeSubtitle: 'ذكاء اصطناعي متقدم للمحادثات وتوليد الصور',
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
    artDesignPrompt: 'لوحة فنية إبداعية بأسلوب',
    landscapes: 'مناظر طبيعية',
    landscapesDesc: 'مشاهد جميلة',
    landscapesPrompt: 'منظر طبيعي خلاب مع',
    characters: 'شخصيات',
    charactersDesc: 'شخصيات فريدة',
    charactersPrompt: 'شخصية فريدة ومميزة',
    fantasy: 'خيال',
    fantasyDesc: 'عوالم سحرية',
    fantasyPrompt: 'عالم خيالي سحري مع',
    exampleImage1: 'مدينة مستقبلية عند غروب الشمس مع سيارات طائرة',
    exampleImage1Sub: 'خيال علمي ومستقبل',
    exampleImage2: 'روبوت لطيف يقرأ كتاباً في مكتبة',
    exampleImage2Sub: 'شخصيات ومشاهد',
    exampleImage3: 'غابة سحرية مع فطر متوهج في الليل',
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
    errNoProvider: 'لا يوجد مزوّد ذكاء اصطناعي مُهيّأ على السيرفر. أضف مفتاح API من الإعدادات.',
    errTimeout: 'استغرق النموذج وقتاً طويلاً. حاول مرة أخرى أو اختر نموذجاً أسرع.',
    errEmpty: 'لم يرجع النموذج أي إجابة. أعد المحاولة.',
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
    offlineModels: 'قائمة احتياطية (تعذر الاتصال بالسيرفر)',
    modelCount: 'نموذج',
    noKeyNeeded: 'بدون مفتاح',
    visionBadge: 'يقرأ الصور',
    codeBadge: 'برمجة',
    reasoningBadge: 'استنتاج',
    contextLabel: 'الذاكرة',
    tokens: 'رمز',

    // ---- v2: providers / keys ----
    providersTitle: 'مزوّدو النماذج المجانية',
    providersHint:
      'أضف أي مفتاح مجاني كمتغير بيئة في Netlify ثم أعد النشر، وستظهر نماذجه تلقائياً في قائمة النماذج.',
    getFreeKey: 'احصل على مفتاح مجاني',
    envVariable: 'متغير البيئة',
    active: 'مُفعّل',
    notConfigured: 'غير مُهيّأ',
    pasteKey: 'الصق المفتاح هنا',
    keySaved: 'محفوظ في هذا المتصفح',
    save: 'حفظ',
    removeKey: 'حذف المفتاح',
    keyStorageWarning:
      'المفتاح يُحفظ في متصفحك فقط ويُستخدم لطلباتك أنت. للنشر العام استخدم متغيرات البيئة في Netlify.',

    // ---- v2: misc UI ----
    openMenu: 'فتح القائمة',
    stopGenerating: 'إيقاف التوليد',
    sendMessage: 'إرسال الرسالة',
    generateImage: 'توليد صورة',
    editMessage: 'تعديل',
    copyMessage: 'نسخ الرسالة',
    copyCode: 'نسخ الكود',
    about: 'حول التطبيق',
    version: 'الإصدار',
    shortcutNewChat: 'محادثة جديدة: Ctrl+K',
    textModels: 'نماذج نصية',
    imageModels: 'نماذج صور',
    imageProvidersTitle: 'مزوّدو توليد الصور',
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
    messagePlaceholder: 'Message X Studio...',
    imagePlaceholder: 'Describe the image you want to create...',
    sendHint: 'Press Enter to send, Shift+Enter for new line',
    generateHint: 'Press Enter to generate image',
    
    // Welcome Screen
    welcomeTitle: 'Welcome to X Studio',
    welcomeSubtitle: 'Advanced AI for conversations and image generation',
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
    artDesignPrompt: 'Creative artistic illustration in the style of',
    landscapes: 'Landscapes',
    landscapesDesc: 'Beautiful scenery',
    landscapesPrompt: 'Beautiful landscape with',
    characters: 'Characters',
    charactersDesc: 'Unique personas',
    charactersPrompt: 'Unique and distinctive character',
    fantasy: 'Fantasy',
    fantasyDesc: 'Magical worlds',
    fantasyPrompt: 'Magical fantasy world with',
    exampleImage1: 'Futuristic city at sunset with flying cars',
    exampleImage1Sub: 'Sci-Fi & Future',
    exampleImage2: 'Cute robot reading a book in a library',
    exampleImage2Sub: 'Characters & Scenes',
    exampleImage3: 'Magical forest with glowing mushrooms at night',
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
    errNoProvider: 'No AI provider is configured on the server. Add an API key from Settings.',
    errTimeout: 'The model took too long. Try again or pick a faster model.',
    errEmpty: 'The model returned nothing. Please try again.',
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
    offlineModels: 'Fallback list (server unreachable)',
    modelCount: 'models',
    noKeyNeeded: 'No key needed',
    visionBadge: 'Vision',
    codeBadge: 'Code',
    reasoningBadge: 'Reasoning',
    contextLabel: 'Context',
    tokens: 'tokens',

    // ---- v2: providers / keys ----
    providersTitle: 'Free model providers',
    providersHint:
      'Add any free key as a Netlify environment variable and redeploy - its models appear in the picker automatically.',
    getFreeKey: 'Get a free key',
    envVariable: 'Env variable',
    active: 'Active',
    notConfigured: 'Not configured',
    pasteKey: 'Paste your key here',
    keySaved: 'Saved in this browser',
    save: 'Save',
    removeKey: 'Remove key',
    keyStorageWarning:
      'Keys are stored in your browser only and used for your own requests. For a public deployment use Netlify environment variables.',

    // ---- v2: misc UI ----
    openMenu: 'Open menu',
    stopGenerating: 'Stop generating',
    sendMessage: 'Send message',
    generateImage: 'Generate image',
    editMessage: 'Edit',
    copyMessage: 'Copy message',
    copyCode: 'Copy code',
    about: 'About',
    version: 'Version',
    shortcutNewChat: 'New chat: Ctrl+K',
    textModels: 'Text models',
    imageModels: 'Image models',
    imageProvidersTitle: 'Image providers',
    imageExpired: 'This image was returned inline and is not stored. Regenerate it to view.',
  }
};

export const useTranslation = (language = 'ar') => {
  const t = (key) => {
    return translations[language]?.[key] || translations['ar'][key] || key;
  };
  
  return { t };
};
