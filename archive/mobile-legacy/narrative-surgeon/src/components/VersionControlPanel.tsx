import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import {
  VersionSnapshot,
  VersionBranch,
  versionControlService,
  MergeResult,
} from '../services/versionControl';
import { VersionDiffViewer } from './VersionDiffViewer';
import { Scene } from '../types';

interface VersionControlPanelProps {
  manuscriptId: string;
  currentScenes: Scene[];
  onScenesRestore: (scenes: Scene[]) => void;
  onCreateSavePoint?: () => void;
}

export const VersionControlPanel: React.FC<VersionControlPanelProps> = ({
  manuscriptId,
  currentScenes,
  onScenesRestore,
  onCreateSavePoint,
}) => {
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [branches, setBranches] = useState<VersionBranch[]>([]);
  const [activeBranch, setActiveBranch] = useState<VersionBranch | null>(null);
  
  const [showSavePointDialog, setShowSavePointDialog] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  
  const [savePointDescription, setSavePointDescription] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchDescription, setBranchDescription] = useState('');
  
  const [selectedVersion1, setSelectedVersion1] = useState<string | null>(null);
  const [selectedVersion2, setSelectedVersion2] = useState<string | null>(null);
  
  const [currentTab, setCurrentTab] = useState<'versions' | 'branches'>('versions');

  // Load version data
  useEffect(() => {
    loadVersionData();
    
    // Initialize auto-save
    versionControlService.initializeAutoSave(manuscriptId, () => currentScenes);
    
    return () => {
      versionControlService.stopAutoSave();
    };
  }, [manuscriptId, currentScenes]);

  const loadVersionData = () => {
    const versionHistory = versionControlService.getVersionHistory(manuscriptId);
    const branchList = versionControlService.getBranches(manuscriptId);
    const currentActiveBranch = versionControlService.getActiveBranch(manuscriptId);
    
    setVersions(versionHistory);
    setBranches(branchList);
    setActiveBranch(currentActiveBranch);
  };

  // Group versions by type
  const groupedVersions = useMemo(() => {
    return {
      manual: versions.filter(v => v.type === 'manual'),
      auto: versions.filter(v => v.type === 'auto'),
      branch: versions.filter(v => v.type === 'branch'),
      merge: versions.filter(v => v.type === 'merge'),
    };
  }, [versions]);

  const handleCreateSavePoint = async () => {
    if (!savePointDescription.trim()) {
      Alert.alert('Error', 'Please enter a description for the save point');
      return;
    }

    try {
      const versionId = await versionControlService.createSavePoint(
        manuscriptId,
        currentScenes,
        savePointDescription.trim()
      );
      
      setSavePointDescription('');
      setShowSavePointDialog(false);
      loadVersionData();
      onCreateSavePoint?.();
      
      Alert.alert('Success', 'Save point created successfully');
    } catch (error) {
      console.error('Failed to create save point:', error);
      Alert.alert('Error', 'Failed to create save point');
    }
  };

  const handleCreateBranch = async () => {
    if (!branchName.trim()) {
      Alert.alert('Error', 'Please enter a branch name');
      return;
    }

    try {
      const branchId = await versionControlService.createBranch(
        manuscriptId,
        currentScenes,
        branchName.trim(),
        branchDescription.trim() || `Branch: ${branchName}`
      );
      
      setBranchName('');
      setBranchDescription('');
      setShowBranchDialog(false);
      loadVersionData();
      
      Alert.alert('Success', 'Branch created successfully');
    } catch (error) {
      console.error('Failed to create branch:', error);
      Alert.alert('Error', 'Failed to create branch');
    }
  };

  const handleSwitchBranch = async (branchId: string) => {
    try {
      const scenes = versionControlService.switchToBranch(manuscriptId, branchId);
      if (scenes) {
        onScenesRestore(scenes);
        loadVersionData();
        Alert.alert('Success', 'Switched to branch successfully');
      } else {
        Alert.alert('Error', 'Failed to switch branch');
      }
    } catch (error) {
      console.error('Failed to switch branch:', error);
      Alert.alert('Error', 'Failed to switch branch');
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    Alert.alert(
      'Restore Version',
      'This will replace your current manuscript with the selected version. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          style: 'destructive',
          onPress: async () => {
            try {
              const scenes = versionControlService.restoreToVersion(versionId);
              if (scenes) {
                onScenesRestore(scenes);
                Alert.alert('Success', 'Version restored successfully');
              } else {
                Alert.alert('Error', 'Failed to restore version');
              }
            } catch (error) {
              console.error('Failed to restore version:', error);
              Alert.alert('Error', 'Failed to restore version');
            }
          }
        }
      ]
    );
  };

  const handleMergeVersions = async (versionId1: string, versionId2: string) => {
    try {
      // For this demo, we'll merge branches if both versions belong to branches
      const version1 = versions.find(v => v.id === versionId1);
      const version2 = versions.find(v => v.id === versionId2);
      
      if (version1?.branchName && version2?.branchName) {
        const branch1 = branches.find(b => b.name === version1.branchName);
        const branch2 = branches.find(b => b.name === version2.branchName);
        
        if (branch1 && branch2) {
          const result: MergeResult = await versionControlService.mergeBranches(
            manuscriptId,
            branch1.id,
            branch2.id,
            'Manual merge from version comparison'
          );
          
          if (result.success) {
            loadVersionData();
            setShowDiffViewer(false);
            Alert.alert('Success', 'Branches merged successfully');
          } else {
            Alert.alert('Merge Conflicts', `Found ${result.conflicts.length} conflicts that need manual resolution`);
          }
          return;
        }
      }
      
      // Fallback: just restore the newer version
      const newerVersion = version2 && version1 && version2.timestamp > version1.timestamp ? version2 : version1;
      if (newerVersion) {
        handleRestoreVersion(newerVersion.id);
      }
    } catch (error) {
      console.error('Merge failed:', error);
      Alert.alert('Error', 'Failed to merge versions');
    }
  };

  const handleVersionSelect = (versionId: string) => {
    if (!selectedVersion1) {
      setSelectedVersion1(versionId);
    } else if (!selectedVersion2) {
      if (versionId === selectedVersion1) {
        return; // Same version selected
      }
      setSelectedVersion2(versionId);
      setShowDiffViewer(true);
    } else {
      // Reset selection
      setSelectedVersion1(versionId);
      setSelectedVersion2(null);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatVersionType = (type: string) => {
    switch (type) {
      case 'auto': return '🔄 Auto';
      case 'manual': return '📌 Manual';
      case 'branch': return '🌿 Branch';
      case 'merge': return '🔀 Merge';
      default: return type;
    }
  };

  const renderVersionItem = (version: VersionSnapshot) => {
    const isSelected = selectedVersion1 === version.id || selectedVersion2 === version.id;
    const selectionNumber = selectedVersion1 === version.id ? 1 : selectedVersion2 === version.id ? 2 : null;
    
    return (
      <TouchableOpacity
        key={version.id}
        style={[styles.versionItem, isSelected && styles.versionItemSelected]}
        onPress={() => handleVersionSelect(version.id)}
        onLongPress={() => handleRestoreVersion(version.id)}
      >
        <View style={styles.versionHeader}>
          <Text style={styles.versionType}>{formatVersionType(version.type)}</Text>
          <Text style={styles.versionDate}>{formatTimestamp(version.timestamp)}</Text>
          {selectionNumber && (
            <View style={[styles.selectionBadge, { backgroundColor: selectionNumber === 1 ? '#007bff' : '#28a745' }]}>
              <Text style={styles.selectionBadgeText}>{selectionNumber}</Text>
            </View>
          )}
        </View>
        
        {version.description && (
          <Text style={styles.versionDescription}>{version.description}</Text>
        )}
        
        <View style={styles.versionStats}>
          <Text style={styles.versionStat}>
            {version.metadata.wordCount} words
          </Text>
          <Text style={styles.versionStat}>
            {version.metadata.sceneCount} scenes
          </Text>
          {version.branchName && (
            <Text style={styles.versionBranch}>Branch: {version.branchName}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderBranchItem = (branch: VersionBranch) => (
    <TouchableOpacity
      key={branch.id}
      style={[styles.branchItem, branch.isActive && styles.branchItemActive]}
      onPress={() => handleSwitchBranch(branch.id)}
    >
      <View style={styles.branchHeader}>
        <Text style={styles.branchName}>
          {branch.isActive ? '🌟 ' : '🌿 '}{branch.name}
        </Text>
        <Text style={styles.branchDate}>{formatTimestamp(branch.createdAt)}</Text>
      </View>
      
      <Text style={styles.branchDescription}>{branch.description}</Text>
      
      {branch.isActive && (
        <Text style={styles.activeBranchLabel}>Current Branch</Text>
      )}
    </TouchableOpacity>
  );

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabButton, currentTab === 'versions' && styles.tabButtonActive]}
        onPress={() => setCurrentTab('versions')}
      >
        <Text style={[styles.tabButtonText, currentTab === 'versions' && styles.tabButtonTextActive]}>
          Versions
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tabButton, currentTab === 'branches' && styles.tabButtonActive]}
        onPress={() => setCurrentTab('branches')}
      >
        <Text style={[styles.tabButtonText, currentTab === 'branches' && styles.tabButtonTextActive]}>
          Branches
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setShowSavePointDialog(true)}
      >
        <Text style={styles.actionButtonText}>Create Save Point</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => setShowBranchDialog(true)}
      >
        <Text style={styles.actionButtonText}>Create Branch</Text>
      </TouchableOpacity>
      
      {selectedVersion1 && selectedVersion2 && (
        <TouchableOpacity
          style={[styles.actionButton, styles.compareButton]}
          onPress={() => setShowDiffViewer(true)}
        >
          <Text style={[styles.actionButtonText, styles.compareButtonText]}>
            Compare Selected
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {renderTabBar()}
      {renderActionButtons()}
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentTab === 'versions' ? (
          <>
            {groupedVersions.manual.length > 0 && (
              <View style={styles.versionGroup}>
                <Text style={styles.groupTitle}>Manual Save Points</Text>
                {groupedVersions.manual.map(renderVersionItem)}
              </View>
            )}
            
            {groupedVersions.merge.length > 0 && (
              <View style={styles.versionGroup}>
                <Text style={styles.groupTitle}>Merge Points</Text>
                {groupedVersions.merge.map(renderVersionItem)}
              </View>
            )}
            
            {groupedVersions.branch.length > 0 && (
              <View style={styles.versionGroup}>
                <Text style={styles.groupTitle}>Branch Points</Text>
                {groupedVersions.branch.map(renderVersionItem)}
              </View>
            )}
            
            {groupedVersions.auto.length > 0 && (
              <View style={styles.versionGroup}>
                <Text style={styles.groupTitle}>Auto Saves (Recent)</Text>
                {groupedVersions.auto.slice(0, 5).map(renderVersionItem)}
              </View>
            )}
          </>
        ) : (
          <View style={styles.branchesContainer}>
            {branches.length > 0 ? (
              branches.map(renderBranchItem)
            ) : (
              <Text style={styles.noBranchesText}>
                No branches created yet. Create a branch to experiment with different versions.
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Save Point Dialog */}
      <Modal
        visible={showSavePointDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSavePointDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Save Point</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Enter description for this save point..."
              value={savePointDescription}
              onChangeText={setSavePointDescription}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSavePointDialog(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCreateSavePoint}
              >
                <Text style={styles.modalConfirmButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Branch Dialog */}
      <Modal
        visible={showBranchDialog}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBranchDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Branch</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Branch name..."
              value={branchName}
              onChangeText={setBranchName}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Branch description (optional)..."
              value={branchDescription}
              onChangeText={setBranchDescription}
              multiline
              numberOfLines={2}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowBranchDialog(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleCreateBranch}
              >
                <Text style={styles.modalConfirmButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Diff Viewer Modal */}
      <Modal
        visible={showDiffViewer}
        animationType="slide"
        onRequestClose={() => setShowDiffViewer(false)}
      >
        <View style={styles.diffModalContainer}>
          <View style={styles.diffModalHeader}>
            <Text style={styles.diffModalTitle}>Version Comparison</Text>
            <TouchableOpacity
              style={styles.diffCloseButton}
              onPress={() => setShowDiffViewer(false)}
            >
              <Text style={styles.diffCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {selectedVersion1 && selectedVersion2 && (
            <VersionDiffViewer
              versionId1={selectedVersion1}
              versionId2={selectedVersion2}
              onVersionSelect={handleRestoreVersion}
              onMergeRequest={handleMergeVersions}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabButtonText: {
    fontSize: 16,
    color: '#6c757d',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#007bff',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6c757d',
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  compareButton: {
    backgroundColor: '#007bff',
  },
  compareButtonText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  versionGroup: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  versionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    backgroundColor: '#ffffff',
  },
  versionItemSelected: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  versionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  versionDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  selectionBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  versionDescription: {
    fontSize: 14,
    color: '#212529',
    marginBottom: 8,
  },
  versionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionStat: {
    fontSize: 12,
    color: '#6c757d',
    marginRight: 12,
  },
  versionBranch: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '500',
  },
  branchesContainer: {
    padding: 16,
  },
  branchItem: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6c757d',
  },
  branchItemActive: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#28a745',
  },
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  branchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  branchDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  branchDescription: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
  },
  activeBranchLabel: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  noBranchesText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#6c757d',
    borderRadius: 6,
  },
  modalCancelButtonText: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#007bff',
    borderRadius: 6,
  },
  modalConfirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  diffModalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  diffModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  diffModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  diffCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diffCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VersionControlPanel;