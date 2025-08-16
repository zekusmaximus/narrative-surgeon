import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useKeyboardShortcuts, useMenuEvents, formatShortcut } from '../hooks/useKeyboardShortcuts';

export const ShortcutExample: React.FC = () => {
  const [lastAction, setLastAction] = useState<string>('');
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [currentScene, setCurrentScene] = useState(0);

  // Initialize keyboard shortcuts
  const { shortcuts, getAllShortcuts } = useKeyboardShortcuts({
    onSave: () => {
      setLastAction('Save triggered');
      // Add your save logic here
    },
    onUndo: () => {
      setLastAction('Undo triggered');
      // Add your undo logic here
    },
    onRedo: () => {
      setLastAction('Redo triggered');
      // Add your redo logic here
    },
    onFind: () => {
      setLastAction('Find triggered');
      // Add your find logic here
    },
    onReplace: () => {
      setLastAction('Replace triggered');
      // Add your replace logic here
    },
    onGlobalSearch: () => {
      setLastAction('Global search triggered');
      // Add your global search logic here
    },
    onBold: () => {
      setLastAction('Bold formatting triggered');
      // Add your bold formatting logic here
    },
    onItalic: () => {
      setLastAction('Italic formatting triggered');
      // Add your italic formatting logic here
    },
    onQuickAI: () => {
      setLastAction('Quick AI suggestion triggered');
      // Add your AI suggestion logic here
    },
    onDistractionFree: () => {
      setIsDistractionFree(!isDistractionFree);
      setLastAction('Distraction-free mode toggled');
    },
    onSceneNavigation: (sceneIndex: number) => {
      setCurrentScene(sceneIndex);
      setLastAction(`Navigated to scene ${sceneIndex + 1}`);
    },
    onZoomIn: () => {
      setZoom(prev => Math.min(200, prev + 10));
      setLastAction('Zoom in');
    },
    onZoomOut: () => {
      setZoom(prev => Math.max(50, prev - 10));
      setLastAction('Zoom out');
    },
    onZoomReset: () => {
      setZoom(100);
      setLastAction('Zoom reset');
    },
    onFloatingNotes: () => {
      setLastAction('Floating notes opened');
    },
  });

  // Listen for menu events
  useMenuEvents({
    onNewManuscript: () => setLastAction('New manuscript from menu'),
    onOpenManuscript: () => setLastAction('Open manuscript from menu'),
    onSave: () => setLastAction('Save from menu'),
    onUndo: () => setLastAction('Undo from menu'),
    onRedo: () => setLastAction('Redo from menu'),
    onFind: () => setLastAction('Find from menu'),
    onAnalyzeScene: () => setLastAction('Analyze scene from menu'),
    onPreferences: () => setLastAction('Preferences from menu'),
  });

  const openComparisonWindow = async () => {
    try {
      await invoke('open_comparison_window', {
        scene1Id: 'scene-1',
        scene2Id: 'scene-2'
      });
      setLastAction('Comparison window opened');
    } catch (error) {
      console.error('Failed to open comparison window:', error);
      setLastAction('Failed to open comparison window');
    }
  };

  const openFloatingNotes = async () => {
    try {
      await invoke('open_floating_notes');
      setLastAction('Floating notes opened');
    } catch (error) {
      console.error('Failed to open floating notes:', error);
      setLastAction('Failed to open floating notes');
    }
  };

  const openDistractionFreeMode = async () => {
    try {
      await invoke('open_distraction_free_mode');
      setLastAction('Distraction-free mode opened');
    } catch (error) {
      console.error('Failed to open distraction-free mode:', error);
      setLastAction('Failed to open distraction-free mode');
    }
  };

  const groupedShortcuts = getAllShortcuts().reduce((groups, shortcut) => {
    if (!groups[shortcut.category]) {
      groups[shortcut.category] = [];
    }
    groups[shortcut.category].push(shortcut);
    return groups;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui' }}>
      <h1>Desktop Features Demo</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
        <h3>Last Action: {lastAction || 'None'}</h3>
        <p>Current Scene: {currentScene + 1}</p>
        <p>Zoom Level: {zoom}%</p>
        <p>Distraction-Free: {isDistractionFree ? 'On' : 'Off'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Multi-Window Controls</h3>
        <button onClick={openComparisonWindow} style={{ margin: '5px', padding: '8px 16px' }}>
          Open Scene Comparison Window
        </button>
        <button onClick={openFloatingNotes} style={{ margin: '5px', padding: '8px 16px' }}>
          Open Floating Notes
        </button>
        <button onClick={openDistractionFreeMode} style={{ margin: '5px', padding: '8px 16px' }}>
          Open Distraction-Free Mode
        </button>
      </div>

      <div>
        <h3>Available Keyboard Shortcuts</h3>
        {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
          <div key={category} style={{ marginBottom: '20px' }}>
            <h4>{category}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {shortcuts.map((shortcut, index) => (
                <div key={index} style={{ padding: '4px', backgroundColor: '#f8f8f8', borderRadius: '4px' }}>
                  <strong>{formatShortcut(shortcut)}</strong> - {shortcut.description}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>💡 Try using the keyboard shortcuts above or accessing features through the menu bar!</p>
        <p>📝 The menu bar includes File, Edit, View, Manuscript, Tools, and Help menus with comprehensive options.</p>
        <p>🖥️ Multi-window support allows you to open comparison views, floating notes, and distraction-free writing modes.</p>
      </div>
    </div>
  );
};