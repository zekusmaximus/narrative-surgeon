import { useState } from "react";
import { ManuscriptsList } from "./components/ManuscriptsList";
import { CreateManuscriptDialog } from "./components/CreateManuscriptDialog";
import { ManuscriptEditor } from "./components/ManuscriptEditor";
import type { Manuscript } from "./types";
import "./index.css";

function App() {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeManuscript, setActiveManuscript] = useState<Manuscript | null>(null);

  const handleManuscriptSelect = (manuscript: Manuscript) => {
    setActiveManuscript(manuscript);
    setView('editor');
  };

  const handleCreateNew = () => {
    setShowCreateDialog(true);
  };

  const handleManuscriptCreated = (manuscript: Manuscript) => {
    setShowCreateDialog(false);
    setActiveManuscript(manuscript);
    setView('editor');
  };

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
  };

  const handleBackToList = () => {
    setView('list');
    setActiveManuscript(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {view === 'list' && (
          <ManuscriptsList
            onManuscriptSelect={handleManuscriptSelect}
            onCreateNew={handleCreateNew}
          />
        )}

        {view === 'editor' && activeManuscript && (
          <ManuscriptEditor
            manuscript={activeManuscript}
            onBack={handleBackToList}
          />
        )}

        {showCreateDialog && (
          <CreateManuscriptDialog
            onClose={handleCloseCreateDialog}
            onManuscriptCreated={handleManuscriptCreated}
          />
        )}
      </div>
    </div>
  );
}

export default App;
