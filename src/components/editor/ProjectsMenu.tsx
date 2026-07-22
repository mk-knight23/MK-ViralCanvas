import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  FileDown,
  FileUp,
  FolderOpen,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { useProjectStore } from '@/stores/projectStore';
import { useToastStore } from '@/stores/toastStore';
import { createProject, generateId, type ProjectMeta } from '@/types/project';
import {
  deleteProject,
  listProjects,
  loadProject,
  parseProjectJson,
  saveProject,
  serializeProject,
  setLastProjectId,
} from '@/utils/projectStorage';

const MAX_IMPORT_FILE_BYTES = 8 * 1024 * 1024;

interface ProjectsMenuProps {
  onProjectsChanged: () => void;
}

function fileNameForProject(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'project'}.viralcanvas.json`;
}

export function ProjectsMenu({ onProjectsChanged }: ProjectsMenuProps) {
  const project = useProjectStore(s => s.project);
  const setProject = useProjectStore(s => s.setProject);
  const renameProject = useProjectStore(s => s.renameProject);
  const { addToast } = useToastStore();

  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const refreshList = () => setProjects(listProjects());

  const persistCurrent = (): boolean => {
    const current = useProjectStore.getState().project;
    const ok = saveProject(current);
    if (ok) {
      setLastProjectId(current.id);
      onProjectsChanged();
    }
    return ok;
  };

  const handleSave = () => {
    if (persistCurrent()) {
      addToast('Project saved', 'success');
      refreshList();
    } else {
      addToast('Save failed — browser storage may be full', 'error');
    }
  };

  const handleNew = () => {
    persistCurrent();
    const fresh = createProject({ template: useProjectStore.getState().project.template });
    setProject(fresh);
    setLastProjectId(fresh.id);
    setIsOpen(false);
    addToast('New project created', 'success');
  };

  const handleOpen = (id: string) => {
    const loaded = loadProject(id);
    if (!loaded) {
      addToast('Could not open project', 'error');
      return;
    }
    persistCurrent();
    setProject(loaded);
    setLastProjectId(loaded.id);
    setIsOpen(false);
    addToast(`Opened "${loaded.name}"`, 'success');
  };

  const handleDuplicate = (id: string) => {
    const source = id === project.id ? useProjectStore.getState().project : loadProject(id);
    if (!source) {
      addToast('Could not duplicate project', 'error');
      return;
    }
    const copy = { ...source, id: generateId('proj'), name: `${source.name} copy` };
    if (saveProject(copy)) {
      refreshList();
      onProjectsChanged();
      addToast('Project duplicated', 'success');
    } else {
      addToast('Duplicate failed — storage may be full', 'error');
    }
  };

  const handleDelete = (id: string) => {
    deleteProject(id);
    refreshList();
    onProjectsChanged();
    addToast('Project deleted', 'info');
  };

  const startRename = (meta: ProjectMeta) => {
    setRenamingId(meta.id);
    setRenameDraft(meta.name);
  };

  const confirmRename = () => {
    if (renamingId === null) return;
    const name = renameDraft.trim();
    if (name.length === 0) {
      setRenamingId(null);
      return;
    }
    if (renamingId === project.id) {
      renameProject(name);
      persistCurrent();
    } else {
      const stored = loadProject(renamingId);
      if (stored) saveProject({ ...stored, name });
    }
    setRenamingId(null);
    refreshList();
    onProjectsChanged();
  };

  const handleExportJson = () => {
    const current = useProjectStore.getState().project;
    const blob = new Blob([serializeProject(current)], { type: 'application/json' });
    saveAs(blob, fileNameForProject(current.name));
    addToast('Project exported as JSON', 'success');
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      addToast('File too large to import', 'error');
      return;
    }
    try {
      const text = await file.text();
      const result = parseProjectJson(text);
      if (!result.ok) {
        addToast(`Import failed: ${result.error}`, 'error');
        return;
      }
      persistCurrent();
      const imported = { ...result.project, id: generateId('proj') };
      setProject(imported);
      saveProject(imported);
      setLastProjectId(imported.id);
      onProjectsChanged();
      addToast(`Imported "${imported.name}"`, 'success');
    } catch {
      addToast('Could not read the selected file', 'error');
    }
  };

  return (
    <div className="card-elevated p-3 flex flex-wrap items-center gap-2 relative">
      <input
        type="text"
        value={project.name}
        onChange={e => renameProject(e.target.value)}
        className="flex-1 min-w-[140px] bg-surface-secondary border border-border rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary outline-none transition-all"
        aria-label="Project name"
        placeholder="Project name"
      />
      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:border-brand-primary/30 text-xs font-semibold transition-all cursor-pointer"
      >
        <Save className="w-3.5 h-3.5" /> Save
      </button>
      <button
        onClick={handleNew}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:border-brand-primary/30 text-xs font-semibold transition-all cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" /> New
      </button>
      <button
        onClick={() => {
          refreshList();
          setIsOpen(open => !open);
        }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:border-brand-primary/30 text-xs font-semibold transition-all cursor-pointer"
        aria-expanded={isOpen}
      >
        <FolderOpen className="w-3.5 h-3.5" /> Open
      </button>
      <button
        onClick={handleExportJson}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:border-brand-primary/30 text-xs font-semibold transition-all cursor-pointer"
      >
        <FileDown className="w-3.5 h-3.5" /> Export JSON
      </button>
      <button
        onClick={() => importInputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:border-brand-primary/30 text-xs font-semibold transition-all cursor-pointer"
      >
        <FileUp className="w-3.5 h-3.5" /> Import
      </button>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportFile}
        className="hidden"
        aria-label="Import project JSON file"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 mt-2 card-elevated p-2 space-y-1 z-30 max-h-80 overflow-y-auto custom-scrollbar"
          >
            {projects.length === 0 && (
              <p className="text-xs text-text-muted text-center py-4">No saved projects yet</p>
            )}
            {projects.map(meta => (
              <div
                key={meta.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
              >
                {renamingId === meta.id ? (
                  <>
                    <input
                      type="text"
                      value={renameDraft}
                      onChange={e => setRenameDraft(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') confirmRename();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      className="flex-1 bg-surface-elevated border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-brand-primary"
                      aria-label="New project name"
                      autoFocus
                    />
                    <button
                      onClick={confirmRename}
                      className="p-1.5 rounded-md text-brand-primary hover:bg-surface-elevated cursor-pointer"
                      aria-label="Confirm rename"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpen(meta.id)}
                      className="flex-1 text-left cursor-pointer"
                    >
                      <span className="text-xs font-semibold block truncate">
                        {meta.name}
                        {meta.id === project.id && (
                          <span className="text-brand-primary ml-1">(current)</span>
                        )}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {meta.layerCount} layers · {new Date(meta.updatedAt).toLocaleString()}
                      </span>
                    </button>
                    <button
                      onClick={() => startRename(meta)}
                      className="p-1.5 rounded-md text-text-muted hover:text-text-primary cursor-pointer"
                      aria-label={`Rename ${meta.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDuplicate(meta.id)}
                      className="p-1.5 rounded-md text-text-muted hover:text-text-primary cursor-pointer"
                      aria-label={`Duplicate ${meta.name}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(meta.id)}
                      className="p-1.5 rounded-md text-text-muted hover:text-red-500 cursor-pointer"
                      aria-label={`Delete ${meta.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
