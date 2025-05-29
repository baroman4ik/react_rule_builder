import React from 'react';
import { Button, Text } from '@mantine/core';
import type { FilterComponentProps, Filter as FilterType } from '../../types';
import FilterEditor from '../FilterEditor/FilterEditor';
import styles from './FilterComponent.module.css';

const FilterComponent: React.FC<FilterComponentProps> = React.memo(({
                                                                      filter,
                                                                      path,
                                                                      onUpdateFilter,
                                                                      onDeleteFilter,
                                                                      isEffectivelyLockedOrDisabled,
                                                                      isEditingThis,
                                                                      onStartEdit,
                                                                      isOverlay = false,
                                                                    }) => {
  const handleSave = (updatedFilter: FilterType) => {
    onUpdateFilter(path, () => updatedFilter);
  };

  if (isEditingThis && !isOverlay) {
    return (
      <FilterEditor
        filter={filter}
        onSave={handleSave}
        onCancel={() => onStartEdit(null)}
        parentLockedOrDisabled={isEffectivelyLockedOrDisabled}
      />
    );
  }

  return (
    <div className={`${styles.filterContainer} ${isOverlay ? styles.overlay : ''} ${isEffectivelyLockedOrDisabled ? styles.disabledVisuals : ''}`}>
      <Text size="sm" className={styles.filterText}>
        <strong>{filter.field}</strong> {filter.operator} <em>{filter.value || '""'}</em>
      </Text>
      {!isOverlay && (
        <div className={styles.actions}>
          <Button
            variant="default"
            size="xs"
            onClick={() => onStartEdit(filter.id)}
            disabled={isEffectivelyLockedOrDisabled}
          >
            Редакт.
          </Button>
          <Button
            variant="filled"
            color="red"
            size="xs"
            onClick={() => onDeleteFilter(path)}
            disabled={isEffectivelyLockedOrDisabled}
          >
            Удалить
          </Button>
        </div>
      )}
    </div>
  );
});

export default FilterComponent;