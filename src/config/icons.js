// ============================================================================
// X Studio - Icon registry (single source of truth)
// ----------------------------------------------------------------------------
// The UI uses vector icons only, never emoji: they inherit colour and size,
// render identically on every platform and stay crisp at any scale.
// ============================================================================

import {
  Bot,
  Brain,
  Braces,
  Building2,
  Code2,
  Cpu,
  Eye,
  FileCode2,
  FlaskConical,
  Gem,
  Github,
  GraduationCap,
  LineChart,
  Monitor,
  Mountain,
  Network,
  Palette,
  PenLine,
  RefreshCw,
  Server,
  Smartphone,
  Sparkles,
  Tablet,
  Terminal,
  Trees,
  UserRound,
  Users,
  Wand2,
  Wind,
  X,
  Zap,
} from 'lucide-react';

/** provider id -> icon component */
const PROVIDER_ICONS = {
  llm7: Sparkles,
  groq: Zap,
  gemini: Gem,
  cerebras: Brain,
  openrouter: Network,
  mistral: Wind,
  github: Github,
  nvidia: Cpu,
  together: Users,
};

export const getProviderIcon = (providerId) => PROVIDER_ICONS[providerId] || Server;

/** Assistant avatar falls back to a neutral mark when the provider is unknown */
export const getAssistantIcon = (providerId) => PROVIDER_ICONS[providerId] || Bot;

export const USER_ICON = UserRound;

/** Welcome screen: capability cards */
export const FEATURE_ICONS = {
  code: Code2,
  writing: PenLine,
  analysis: LineChart,
  learning: GraduationCap,
  art: Palette,
  landscape: Mountain,
  character: UserRound,
  fantasy: Wand2,
};

/** Welcome screen: example prompts */
export const EXAMPLE_ICONS = {
  terminal: Terminal,
  science: FlaskConical,
  component: Code2,
  city: Building2,
  robot: Bot,
  nature: Trees,
};

/** Artifact workspace controls */
export const WORKSPACE_ICONS = {
  workspace: Braces,
  preview: Eye,
  file: FileCode2,
  reload: RefreshCw,
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
  close: X,
};