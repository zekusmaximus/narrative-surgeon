import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  FileTextIcon,
  BookOpenIcon,
  GripVerticalIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  TargetIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { Scene } from '../types';

interface Chapter {
  id: string;
  title: string;
  scenes: Scene[];
  wordCount: number;
  isCollapsed: boolean;
  order: number;
}

interface DocumentOutlineProps {
  scenes: Scene[];
  activeSceneId?: string;
  onSceneSelect: (scene: Scene) => void;
  onScenesReorder: (newOrder: string[]) => void;
  onSceneCreate: (afterSceneId?: string) => void;
  onSceneDelete: (sceneId: string) => void;
  onSceneRename: (sceneId: string, newTitle: string) => void;
  manuscriptWordCount: number;
  targetWordCount?: number;
}

interface SortableSceneItemProps {
  scene: Scene;
  isActive: boolean;
  sceneIndex: number;
  onSelect: () => void;
  onRename: (newTitle: string) => void;
  onDelete: () => void;
  onCreateAfter: () => void;
}

interface SortableChapterProps {
  chapter: Chapter;
  chapterIndex: number;
  activeSceneId?: string;
  onSceneSelect: (scene: Scene) => void;
  onToggleCollapse: (chapterId: string) => void;
  onSceneRename: (sceneId: string, newTitle: string) => void;
  onSceneDelete: (sceneId: string) => void;
  onSceneCreate: (afterSceneId?: string) => void;
}

function SortableSceneItem({
  scene,
  isActive,
  sceneIndex,
  onSelect,
  onRename,
  onDelete,
  onCreateAfter,
}: SortableSceneItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(scene.title || `Scene ${sceneIndex + 1}`);
  const [showActions, setShowActions] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== scene.title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setEditTitle(scene.title || `Scene ${sceneIndex + 1}`);
      setIsEditing(false);
    }
  };

  const progressPercentage = scene.wordCount > 0 ? Math.min((scene.wordCount / 1000) * 100, 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-2 py-2 px-3 rounded-md transition-colors",
        isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/50",
        isDragging ? "opacity-50" : ""
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab hover:cursor-grabbing flex-shrink-0"
      >
        <GripVerticalIcon size={12} className="text-muted-foreground" />
      </div>

      <div
        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
        onClick={onSelect}
      >
        <FileTextIcon size={14} className="flex-shrink-0" />
        
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-b border-current outline-none text-sm"
            autoFocus
          />
        ) : (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {scene.title || `Scene ${sceneIndex + 1}`}
            </div>
            <div className="text-xs opacity-75">
              {scene.wordCount.toLocaleString()} words
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-12 flex-shrink-0">
        <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-current transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Actions menu */}
      {showActions && !isEditing && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onCreateAfter();
            }}
          >
            <PlusIcon size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            <EditIcon size={12} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this scene?')) {
                onDelete();
              }
            }}
          >
            <TrashIcon size={12} />
          </Button>
        </div>
      )}
    </div>
  );
}

function SortableChapter({
  chapter,
  chapterIndex: _chapterIndex,
  activeSceneId,
  onSceneSelect,
  onToggleCollapse,
  onSceneRename,
  onSceneDelete,
  onSceneCreate,
}: SortableChapterProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ChevronIcon = chapter.isCollapsed ? ChevronRightIcon : ChevronDownIcon;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      {/* Chapter Header */}
      <div
        className="flex items-center gap-2 py-2 px-2 font-medium text-sm bg-muted/30 rounded-md mb-1 group"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon size={12} className="text-muted-foreground cursor-grab hover:cursor-grabbing" />
        
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={() => onToggleCollapse(chapter.id)}
        >
          <ChevronIcon size={14} />
        </Button>

        <BookOpenIcon size={14} className="text-muted-foreground" />
        
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{chapter.title}</div>
          <div className="text-xs text-muted-foreground">
            {chapter.scenes.length} scenes • {chapter.wordCount.toLocaleString()} words
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onSceneCreate(chapter.scenes[chapter.scenes.length - 1]?.id);
          }}
        >
          <PlusIcon size={12} />
        </Button>
      </div>

      {/* Scenes */}
      {!chapter.isCollapsed && (
        <div className="ml-4 space-y-1">
          <SortableContext
            items={chapter.scenes.map(scene => scene.id)}
            strategy={verticalListSortingStrategy}
          >
            {chapter.scenes.map((scene, sceneIndex) => (
              <SortableSceneItem
                key={scene.id}
                scene={scene}
                isActive={scene.id === activeSceneId}
                sceneIndex={sceneIndex}
                onSelect={() => onSceneSelect(scene)}
                onRename={(newTitle) => onSceneRename(scene.id, newTitle)}
                onDelete={() => onSceneDelete(scene.id)}
                onCreateAfter={() => onSceneCreate(scene.id)}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

export function DocumentOutline({
  scenes,
  activeSceneId,
  onSceneSelect,
  onScenesReorder,
  onSceneCreate,
  onSceneDelete,
  onSceneRename,
  manuscriptWordCount,
  targetWordCount = 80000,
}: DocumentOutlineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Group scenes into chapters
  const chapters = useMemo(() => {
    const chapterMap = new Map<number, Chapter>();
    
    scenes.forEach(scene => {
      const chapterNum = scene.chapterNumber || 1;
      
      if (!chapterMap.has(chapterNum)) {
        chapterMap.set(chapterNum, {
          id: `chapter-${chapterNum}`,
          title: `Chapter ${chapterNum}`,
          scenes: [],
          wordCount: 0,
          isCollapsed: collapsedChapters.has(`chapter-${chapterNum}`),
          order: chapterNum,
        });
      }
      
      const chapter = chapterMap.get(chapterNum)!;
      chapter.scenes.push(scene);
      chapter.wordCount += scene.wordCount;
    });

    return Array.from(chapterMap.values()).sort((a, b) => a.order - b.order);
  }, [scenes, collapsedChapters]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      // Find all scene IDs in order
      const allSceneIds = chapters.flatMap(chapter => 
        chapter.scenes.map(scene => scene.id)
      );

      const oldIndex = allSceneIds.indexOf(active.id as string);
      const newIndex = allSceneIds.indexOf(over?.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(allSceneIds, oldIndex, newIndex);
        onScenesReorder(newOrder);
      }
    }

    setActiveId(null);
  };

  const handleToggleCollapse = (chapterId: string) => {
    const newCollapsed = new Set(collapsedChapters);
    if (newCollapsed.has(chapterId)) {
      newCollapsed.delete(chapterId);
    } else {
      newCollapsed.add(chapterId);
    }
    setCollapsedChapters(newCollapsed);
  };

  const progressPercentage = targetWordCount > 0 
    ? Math.min((manuscriptWordCount / targetWordCount) * 100, 100) 
    : 0;

  const activeScene = activeId ? scenes.find(scene => scene.id === activeId) : null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileTextIcon size={18} />
            Document Outline
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSceneCreate()}
          >
            <PlusIcon size={16} />
          </Button>
        </CardTitle>
        
        {/* Manuscript Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {manuscriptWordCount.toLocaleString()} / {targetWordCount.toLocaleString()} words
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{Math.round(progressPercentage)}% complete</span>
            <div className="flex items-center gap-1">
              <TargetIcon size={10} />
              <span>Target: {targetWordCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={chapters.map(chapter => chapter.id)}
            strategy={verticalListSortingStrategy}
          >
            {chapters.map((chapter, index) => (
              <SortableChapter
                key={chapter.id}
                chapter={chapter}
                chapterIndex={index}
                activeSceneId={activeSceneId}
                onSceneSelect={onSceneSelect}
                onToggleCollapse={handleToggleCollapse}
                onSceneRename={onSceneRename}
                onSceneDelete={onSceneDelete}
                onSceneCreate={onSceneCreate}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeScene && (
              <div className="bg-background border border-border rounded-md p-3 shadow-lg">
                <div className="flex items-center gap-2">
                  <FileTextIcon size={14} />
                  <span className="text-sm font-medium">
                    {activeScene.title || `Scene ${activeScene.indexInManuscript + 1}`}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {activeScene.wordCount.toLocaleString()} words
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {scenes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileTextIcon className="mx-auto mb-2" size={32} />
            <p className="text-sm">No scenes yet</p>
            <p className="text-xs">Start writing to create your first scene</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}