import { RevisionMode } from '../types';

export const revisionModes: Record<string, RevisionMode> = {
  opening_polish: {
    name: "Opening Pages Polish",
    description: "Perfect your first 5 pages for agents",
    checksEnabled: ["hook_strength", "voice_clarity", "character_appeal", "genre_fit"],
    aiPromptBias: "Focus on immediate engagement and voice. Be ruthless about cutting slow starts.",
    highlightPatterns: [/^.{0,300}/], // Highlight first 300 chars
    quickActions: ["strengthen_first_line", "add_sensory_detail", "clarify_character_want"]
  },
  
  dialogue_pass: {
    name: "Dialogue Enhancement",
    description: "Ensure distinct character voices",
    checksEnabled: ["voice_consistency", "attribution_tags", "dialect_accuracy", "subtext"],
    aiPromptBias: "Each character must sound unique. Remove unnecessary tags. Add subtext.",
    highlightPatterns: [/"[^"]+"/g],
    quickActions: ["remove_said_bookisms", "add_action_beat", "increase_subtext"]
  },
  
  tension_calibration: {
    name: "Tension Calibration", 
    description: "Adjust pacing and tension curves",
    checksEnabled: ["scene_tension", "chapter_hooks", "conflict_escalation", "breather_moments"],
    aiPromptBias: "Every scene needs tension. Vary intensity. End chapters with questions.",
    highlightPatterns: [/\b(but|however|suddenly|then)\b/gi],
    quickActions: ["add_time_pressure", "raise_stakes", "add_complication"]
  },
  
  comp_alignment: {
    name: "Comp Title Alignment",
    description: "Match market expectations", 
    checksEnabled: ["genre_conventions", "pacing_match", "voice_similarity", "theme_resonance"],
    aiPromptBias: "Reader expects {{comp_title}} meets {{comp_title2}}. Align without copying.",
    highlightPatterns: [], // Dynamically set based on comp analysis
    quickActions: ["match_opening_style", "adjust_pacing", "align_tone"]
  },

  line_editing: {
    name: "Line Editing",
    description: "Sentence-level refinement for clarity and flow",
    checksEnabled: ["sentence_variety", "word_choice", "rhythm", "clarity"],
    aiPromptBias: "Every sentence should be necessary and well-crafted. Eliminate weak verbs and filter words.",
    highlightPatterns: [/\b(very|really|quite|rather|just|simply)\b/gi], // Filter words
    quickActions: ["vary_sentence_length", "strengthen_verbs", "cut_redundancy"]
  },

  copy_editing: {
    name: "Copy Editing", 
    description: "Grammar, consistency, and technical cleanup",
    checksEnabled: ["grammar", "punctuation", "consistency", "formatting"],
    aiPromptBias: "Focus on technical correctness. Check for grammar errors, inconsistent formatting, and style guide violations.",
    highlightPatterns: [/\b(its|it's)\b/gi, /\b(your|you're)\b/gi], // Common errors
    quickActions: ["fix_common_errors", "standardize_formatting", "check_consistency"]
  },

  developmental: {
    name: "Developmental Editing",
    description: "Story structure, character arcs, and plot consistency", 
    checksEnabled: ["plot_holes", "character_consistency", "pacing", "structure"],
    aiPromptBias: "Focus on big picture story elements. Does the plot make sense? Are characters consistent? Is pacing appropriate?",
    highlightPatterns: [/\bChapter\b/gi], // Highlight chapter breaks
    quickActions: ["strengthen_character_arc", "fix_plot_hole", "improve_pacing"]
  }
};

export class RevisionModeService {
  getCurrentMode(): RevisionMode {
    // Default to line editing mode
    return revisionModes.line_editing;
  }

  setMode(modeKey: string): RevisionMode | null {
    return revisionModes[modeKey] || null;
  }

  getAllModes(): RevisionMode[] {
    return Object.values(revisionModes);
  }

  getModeByType(sessionType: string): RevisionMode {
    const modeMap = {
      'developmental': revisionModes.developmental,
      'line': revisionModes.line_editing,
      'copy': revisionModes.copy_editing,
      'proof': revisionModes.copy_editing // Proofreading uses copy editing mode
    };
    
    return modeMap[sessionType] || revisionModes.line_editing;
  }

  getQuickActionsForMode(modeKey: string): string[] {
    const mode = revisionModes[modeKey];
    return mode?.quickActions || [];
  }

  getHighlightPatternsForMode(modeKey: string): RegExp[] {
    const mode = revisionModes[modeKey];
    return mode?.highlightPatterns || [];
  }

  // Customize comp alignment mode with actual comp titles
  customizeCompAlignmentMode(compTitles: string[]): RevisionMode {
    const baseMode = { ...revisionModes.comp_alignment };
    
    if (compTitles.length >= 2) {
      baseMode.aiPromptBias = baseMode.aiPromptBias
        .replace('{{comp_title}}', compTitles[0])
        .replace('{{comp_title2}}', compTitles[1]);
    }
    
    return baseMode;
  }
}

export const revisionModeService = new RevisionModeService();