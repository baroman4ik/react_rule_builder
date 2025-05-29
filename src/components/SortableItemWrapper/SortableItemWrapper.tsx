import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemWrapperProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  isGroup?: boolean;
}

const SortableItemWrapper: React.FC<SortableItemWrapperProps> = ({ id, children, disabled, isGroup }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    data: { type: isGroup ? 'GROUP_ITEM' : 'FILTER_ITEM', itemId: id }
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
    position: 'relative',
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

export default SortableItemWrapper;