import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Keyboard,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  keywords?: string[];
  shortcut?: string;
  icon?: string;
  action: () => void | Promise<void>;
  condition?: () => boolean;
}

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
  commands: Command[];
  placeholder?: string;
  maxResults?: number;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  visible,
  onClose,
  commands,
  placeholder = 'Type a command...',
  maxResults = 10,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);
  const { theme } = useTheme();

  // Filter and search commands
  const filteredCommands = useMemo(() => {
    const availableCommands = commands.filter(cmd => 
      cmd.condition ? cmd.condition() : true
    );

    if (!query.trim()) {
      // Show recent commands when no query
      const recents = availableCommands.filter(cmd => 
        recentCommands.includes(cmd.id)
      ).slice(0, maxResults);
      
      // Fill remaining slots with popular commands
      const remaining = maxResults - recents.length;
      const others = availableCommands
        .filter(cmd => !recentCommands.includes(cmd.id))
        .slice(0, remaining);
      
      return [...recents, ...others];
    }

    const queryLower = query.toLowerCase();
    const scored = availableCommands
      .map(cmd => {
        let score = 0;
        const titleLower = cmd.title.toLowerCase();
        const subtitleLower = cmd.subtitle?.toLowerCase() || '';
        const categoryLower = cmd.category.toLowerCase();
        const keywordsLower = cmd.keywords?.join(' ').toLowerCase() || '';
        
        // Exact matches get highest score
        if (titleLower === queryLower) score += 100;
        else if (titleLower.startsWith(queryLower)) score += 50;
        else if (titleLower.includes(queryLower)) score += 25;
        
        // Subtitle matches
        if (subtitleLower.includes(queryLower)) score += 15;
        
        // Category matches
        if (categoryLower.includes(queryLower)) score += 10;
        
        // Keyword matches
        if (keywordsLower.includes(queryLower)) score += 20;
        
        // Recent commands get bonus
        if (recentCommands.includes(cmd.id)) score += 5;
        
        // Fuzzy matching bonus
        if (fuzzyMatch(titleLower, queryLower)) score += 10;
        
        return { command: cmd, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ command }) => command);

    return scored;
  }, [query, commands, recentCommands, maxResults]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [visible]);

  // Update selected index when results change
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands, selectedIndex]);

  // Handle keyboard navigation
  const handleKeyPress = (key: string) => {
    switch (key) {
      case 'ArrowUp':
        setSelectedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        setSelectedIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
        break;
      case 'Enter':
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  const executeCommand = async (command: Command) => {
    try {
      // Add to recent commands
      const updatedRecent = [command.id, ...recentCommands.filter(id => id !== command.id)].slice(0, 10);
      setRecentCommands(updatedRecent);
      
      // Execute command
      await command.action();
      
      // Close palette
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
      // Could show an error toast here
    }
  };

  const renderCommand = (command: Command, index: number, isSelected: boolean) => (
    <TouchableOpacity
      key={command.id}
      style={[
        styles.commandItem,
        isSelected && [styles.commandItemSelected, { backgroundColor: theme.colors.selected }]
      ]}
      onPress={() => executeCommand(command)}
    >
      <View style={styles.commandContent}>
        <View style={styles.commandMain}>
          {command.icon && (
            <Text style={[styles.commandIcon, { color: theme.colors.text }]}>
              {command.icon}
            </Text>
          )}
          <View style={styles.commandText}>
            <Text style={[styles.commandTitle, { color: theme.colors.text }]}>
              {highlightMatch(command.title, query)}
            </Text>
            {command.subtitle && (
              <Text style={[styles.commandSubtitle, { color: theme.colors.textSecondary }]}>
                {highlightMatch(command.subtitle, query)}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.commandMeta}>
          <Text style={[styles.commandCategory, { color: theme.colors.textTertiary }]}>
            {command.category}
          </Text>
          {command.shortcut && (
            <Text style={[styles.commandShortcut, { color: theme.colors.textTertiary }]}>
              {command.shortcut}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGroupedCommands = () => {
    const groups = Object.entries(groupedCommands);
    let commandIndex = 0;
    
    return groups.map(([category, categoryCommands]) => (
      <View key={category}>
        {query.trim() && (
          <Text style={[styles.categoryHeader, { color: theme.colors.textSecondary }]}>
            {category}
          </Text>
        )}
        {categoryCommands.map(command => {
          const isSelected = commandIndex === selectedIndex;
          const element = renderCommand(command, commandIndex, isSelected);
          commandIndex++;
          return element;
        })}
      </View>
    ));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.palette, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.searchContainer, { borderBottomColor: theme.colors.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: theme.colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={theme.colors.textTertiary}
              onSubmitEditing={() => {
                if (filteredCommands[selectedIndex]) {
                  executeCommand(filteredCommands[selectedIndex]);
                }
              }}
              autoFocus
              blurOnSubmit={false}
            />
          </View>
          
          <ScrollView 
            style={styles.resultsContainer}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            {filteredCommands.length > 0 ? (
              renderGroupedCommands()
            ) : (
              <View style={styles.noResults}>
                <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                  {query.trim() ? 'No commands found' : 'Type to search commands'}
                </Text>
              </View>
            )}
          </ScrollView>

          {filteredCommands.length > 0 && (
            <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
              <Text style={[styles.footerText, { color: theme.colors.textTertiary }]}>
                ↑↓ to navigate • ⏎ to select • esc to close
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// Helper functions
function fuzzyMatch(text: string, query: string): boolean {
  let textIndex = 0;
  let queryIndex = 0;
  
  while (textIndex < text.length && queryIndex < query.length) {
    if (text[textIndex] === query[queryIndex]) {
      queryIndex++;
    }
    textIndex++;
  }
  
  return queryIndex === query.length;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }
  
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) {
    return text;
  }
  
  return (
    <Text>
      {text.substring(0, index)}
      <Text style={styles.highlight}>
        {text.substring(index, index + query.length)}
      </Text>
      {text.substring(index + query.length)}
    </Text>
  );
}

// Command categories
export const COMMAND_CATEGORIES = {
  FILE: 'File',
  EDIT: 'Edit',
  VIEW: 'View',
  MANUSCRIPT: 'Manuscript',
  ANALYSIS: 'Analysis',
  EXPORT: 'Export',
  TOOLS: 'Tools',
  NAVIGATION: 'Navigation',
  SEARCH: 'Search',
} as const;

// Common commands factory
export const createCommonCommands = (actions: {
  newManuscript: () => void;
  openManuscript: () => void;
  saveManuscript: () => void;
  exportManuscript: () => void;
  analyzeScene: () => void;
  analyzeManuscript: () => void;
  openSettings: () => void;
  toggleTheme: () => void;
  showVersionHistory: () => void;
  createSavePoint: () => void;
  openSearch: () => void;
  navigateToScene: (sceneNumber: number) => void;
  showWritingStats: () => void;
  openDistractionFree: () => void;
}): Command[] => [
  {
    id: 'new-manuscript',
    title: 'New Manuscript',
    subtitle: 'Create a new manuscript',
    category: COMMAND_CATEGORIES.FILE,
    keywords: ['create', 'new', 'manuscript', 'document'],
    shortcut: 'Ctrl+N',
    icon: '📄',
    action: actions.newManuscript,
  },
  {
    id: 'open-manuscript',
    title: 'Open Manuscript',
    subtitle: 'Open an existing manuscript',
    category: COMMAND_CATEGORIES.FILE,
    keywords: ['open', 'load', 'manuscript'],
    shortcut: 'Ctrl+O',
    icon: '📂',
    action: actions.openManuscript,
  },
  {
    id: 'save-manuscript',
    title: 'Save Manuscript',
    subtitle: 'Save the current manuscript',
    category: COMMAND_CATEGORIES.FILE,
    keywords: ['save', 'store'],
    shortcut: 'Ctrl+S',
    icon: '💾',
    action: actions.saveManuscript,
  },
  {
    id: 'export-manuscript',
    title: 'Export Manuscript',
    subtitle: 'Export to various formats',
    category: COMMAND_CATEGORIES.EXPORT,
    keywords: ['export', 'save as', 'pdf', 'docx', 'epub'],
    icon: '📤',
    action: actions.exportManuscript,
  },
  {
    id: 'analyze-scene',
    title: 'Analyze Current Scene',
    subtitle: 'AI analysis of the current scene',
    category: COMMAND_CATEGORIES.ANALYSIS,
    keywords: ['analyze', 'ai', 'scene', 'feedback'],
    shortcut: 'Ctrl+Shift+A',
    icon: '🔍',
    action: actions.analyzeScene,
  },
  {
    id: 'analyze-manuscript',
    title: 'Analyze Full Manuscript',
    subtitle: 'Complete manuscript analysis',
    category: COMMAND_CATEGORIES.ANALYSIS,
    keywords: ['analyze', 'ai', 'manuscript', 'full'],
    icon: '📊',
    action: actions.analyzeManuscript,
  },
  {
    id: 'create-save-point',
    title: 'Create Save Point',
    subtitle: 'Create a named version checkpoint',
    category: COMMAND_CATEGORIES.TOOLS,
    keywords: ['save point', 'version', 'checkpoint', 'backup'],
    icon: '🏷️',
    action: actions.createSavePoint,
  },
  {
    id: 'version-history',
    title: 'Version History',
    subtitle: 'View manuscript version history',
    category: COMMAND_CATEGORIES.TOOLS,
    keywords: ['history', 'versions', 'changes', 'diff'],
    icon: '📝',
    action: actions.showVersionHistory,
  },
  {
    id: 'global-search',
    title: 'Global Search',
    subtitle: 'Search across all manuscripts',
    category: COMMAND_CATEGORIES.SEARCH,
    keywords: ['search', 'find', 'global'],
    shortcut: 'Ctrl+Shift+F',
    icon: '🔎',
    action: actions.openSearch,
  },
  {
    id: 'writing-stats',
    title: 'Writing Statistics',
    subtitle: 'View writing progress and stats',
    category: COMMAND_CATEGORIES.VIEW,
    keywords: ['stats', 'statistics', 'progress', 'words'],
    shortcut: 'Ctrl+Shift+S',
    icon: '📈',
    action: actions.showWritingStats,
  },
  {
    id: 'distraction-free',
    title: 'Distraction-Free Mode',
    subtitle: 'Enter focused writing mode',
    category: COMMAND_CATEGORIES.VIEW,
    keywords: ['focus', 'distraction free', 'zen', 'fullscreen'],
    shortcut: 'Ctrl+Shift+D',
    icon: '🎯',
    action: actions.openDistractionFree,
  },
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Open application settings',
    category: COMMAND_CATEGORIES.TOOLS,
    keywords: ['settings', 'preferences', 'config'],
    shortcut: 'Ctrl+,',
    icon: '⚙️',
    action: actions.openSettings,
  },
  {
    id: 'toggle-theme',
    title: 'Toggle Theme',
    subtitle: 'Switch between light and dark themes',
    category: COMMAND_CATEGORIES.VIEW,
    keywords: ['theme', 'dark', 'light', 'appearance'],
    icon: '🌓',
    action: actions.toggleTheme,
  },
];

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  palette: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    fontSize: 18,
    fontWeight: '400',
    paddingVertical: 8,
  },
  resultsContainer: {
    maxHeight: 400,
  },
  commandItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  commandItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  commandContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commandMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commandIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  commandText: {
    flex: 1,
  },
  commandTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  commandSubtitle: {
    fontSize: 14,
  },
  commandMeta: {
    alignItems: 'flex-end',
  },
  commandCategory: {
    fontSize: 12,
    marginBottom: 2,
  },
  commandShortcut: {
    fontSize: 12,
    fontFamily: 'Courier New',
  },
  categoryHeader: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
  highlight: {
    backgroundColor: '#ffeb3b',
    fontWeight: '600',
  },
});