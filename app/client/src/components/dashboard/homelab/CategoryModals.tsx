import React from 'react';
import { Modal, Field } from '../common';

export interface CategoryModalsProps {
  categoryModal: boolean;
  onCloseCategoryModal: () => void;
  newCatName: string;
  onChangeNewCatName: (name: string) => void;
  onAddCategory: () => void;

  renameModal: { open: boolean; oldName: string; newName: string };
  onCloseRenameModal: () => void;
  onChangeRenameName: (name: string) => void;
  onRenameCategory: () => void;
}

export function CategoryModals({
  categoryModal,
  onCloseCategoryModal,
  newCatName,
  onChangeNewCatName,
  onAddCategory,
  renameModal,
  onCloseRenameModal,
  onChangeRenameName,
  onRenameCategory,
}: CategoryModalsProps) {
  return (
    <>
      {/* Add Custom Category Box Modal */}
      <Modal
        open={categoryModal}
        onClose={onCloseCategoryModal}
        title="Add Custom Category Box"
        footer={
          <>
            <button
              type="button"
              onClick={onCloseCategoryModal}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onAddCategory}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Create Category
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Create a custom category box on your board. You can drag and drop it anywhere and populate it with service cards.
          </p>
          <Field label="Category Name">
            <input
              className="input-field"
              placeholder="e.g. Smart Home, Databases, Automation..."
              value={newCatName}
              onChange={(e) => onChangeNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAddCategory();
              }}
              autoFocus
            />
          </Field>
        </div>
      </Modal>

      {/* Rename Category Modal */}
      <Modal
        open={renameModal.open}
        onClose={onCloseRenameModal}
        title={`Rename Category: ${renameModal.oldName}`}
        footer={
          <>
            <button
              type="button"
              onClick={onCloseRenameModal}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onRenameCategory}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Save Name
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <Field label="New Category Name">
            <input
              className="input-field"
              value={renameModal.newName}
              onChange={(e) => onChangeRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameCategory();
              }}
              autoFocus
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
