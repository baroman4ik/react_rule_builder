import React, { useState, useMemo } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SegmentedControl, Button, TextInput, Collapse, Box, Tooltip } from '@mantine/core';
import { IconLock, IconLockOpen, IconEye, IconEyeOff, IconChevronDown, IconChevronUp, IconTrash, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import type { GroupComponentProps, LogicType, Group as GroupType, Filter as FilterType } from '../../types';
import FilterComponent from '../FilterComponent/FilterComponent';
import SortableItemWrapper from '../SortableItemWrapper/SortableItemWrapper';
import styles from './GroupComponent.module.css';

const GroupComponent: React.FC<GroupComponentProps> = React.memo(({
                                                                    group,
                                                                    path,
                                                                    onUpdateGroup,
                                                                    onAddFilter,
                                                                    onAddGroup,
                                                                    onDeleteGroup,
                                                                    onUpdateFilter,
                                                                    onDeleteFilter,
                                                                    parentIsLocked,
                                                                    parentIsDisabled,
                                                                    editingFilterId,
                                                                    setEditingFilterId,
                                                                    isOverlay = false,
                                                                  }) => {
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [tempName, setTempName] = useState(group.name);

  const isEffectivelyLocked = group.isLocked || parentIsLocked;
  const isEffectivelyDisabled = group.isDisabled || parentIsDisabled;
  const controlsDisabled = isEffectivelyLocked || isEffectivelyDisabled;

  const childIds = useMemo(() => (group.children ? group.children.map(child => child.id) : []), [group.children]);

  const { setNodeRef: setInnerDropZoneRef, isOver: isOverInnerZone } = useSortable({
    id: `${group.id}-dropzone`,
    data: { type: 'GROUP_INNER_DROP_ZONE', groupId: group.id },
    disabled: controlsDisabled || isOverlay,
  });

  const handleNameSave = () => {
    onUpdateGroup(path, (g) => ({ ...g, name: tempName || "Без названия" }));
    setIsNameEditing(false);
  };

  const handleLogicChange = (value: string) => {
    onUpdateGroup(path, (g) => ({ ...g, logic: value as LogicType }));
  };

  const toggleProperty = (propName: keyof Pick<GroupType, 'isCollapsed' | 'isLocked' | 'isDisabled'>) => {
    onUpdateGroup(path, g => ({...g, [propName]: !g[propName]}));
  }

  return (
    <Box className={`
      ${styles.groupContainer}
      ${group.logic === 'AND' ? styles.groupAnd : styles.groupOr}
      ${isOverlay ? styles.overlay : ''}
      ${isEffectivelyDisabled ? styles.disabledVisuals : ''}
      ${isEffectivelyLocked && !isEffectivelyDisabled ? styles.lockedVisuals : ''}
    `}>
      <div className={styles.header}>
        <div className={styles.nameSection}>
          {isNameEditing && !isOverlay ? (
            <>
              <TextInput
                className={styles.nameInput}
                value={tempName}
                onChange={(e) => setTempName(e.currentTarget.value)}
                disabled={controlsDisabled}
                autoFocus
                size="xs"
                aria-label="Редактировать имя группы"
              />
              <Tooltip label="Сохранить имя" position="top" withArrow>
                <Button variant="filled" size="xs" onClick={handleNameSave} disabled={controlsDisabled} leftSection={<IconDeviceFloppy size={14}/>} aria-label="Сохранить имя">Сохр.</Button>
              </Tooltip>
              <Tooltip label="Отменить редактирование имени" position="top" withArrow>
                <Button variant="default" size="xs" onClick={() => setIsNameEditing(false)} disabled={controlsDisabled} leftSection={<IconX size={14}/>} aria-label="Отменить редактирование имени">Отм.</Button>
              </Tooltip>
            </>
          ) : (
            <h3
              className={styles.groupName}
              onClick={() => !controlsDisabled && !isOverlay && setIsNameEditing(true)}
              title={!isOverlay ? "Нажмите для редактирования названия группы" : group.name}
            >
              {group.name}
            </h3>
          )}
        </div>
        {!isOverlay && (
          <div className={styles.controlsSection}>
            <SegmentedControl
              size="xs"
              value={group.logic}
              onChange={handleLogicChange}
              disabled={controlsDisabled}
              data={[
                { label: 'И', value: 'AND' },
                { label: 'ИЛИ', value: 'OR' },
              ]}
              color={group.logic === 'AND' ? 'blue' : 'green'}
              aria-label="Переключатель логики И/ИЛИ"
            />
            <Tooltip label={group.isCollapsed ? "Развернуть группу" : "Свернуть группу"} position="top" withArrow>
              <Button variant="default" size="xs" onClick={() => toggleProperty('isCollapsed')} disabled={parentIsLocked} leftSection={group.isCollapsed ? <IconChevronDown size={14}/> : <IconChevronUp size={14}/>} aria-label={group.isCollapsed ? "Развернуть группу" : "Свернуть группу"}>
                {group.isCollapsed ? 'Разв.' : 'Сверн.'}
              </Button>
            </Tooltip>
            <Tooltip label={group.isLocked ? "Разблокировать группу" : "Блокировать группу"} position="top" withArrow>
              <Button
                variant="default" size="xs"
                color={group.isLocked ? 'yellow' : 'gray'}
                onClick={() => toggleProperty('isLocked')}
                disabled={parentIsDisabled && group.isLocked}
                leftSection={group.isLocked ? <IconLockOpen size={14}/> : <IconLock size={14}/>}
                aria-label={group.isLocked ? "Разблокировать группу" : "Блокировать группу"}
              >
                {group.isLocked ? 'Разбл.' : 'Блок.'}
              </Button>
            </Tooltip>
            <Tooltip label={group.isDisabled ? "Включить группу (убрать из черновика)" : "Отключить группу (перевести в черновик)"} position="top" withArrow>
              <Button
                variant="default" size="xs"
                color={group.isDisabled ? 'gray' : 'teal'}
                onClick={() => toggleProperty('isDisabled')}
                disabled={isEffectivelyLocked && !group.isDisabled}
                leftSection={group.isDisabled ? <IconEye size={14}/> : <IconEyeOff size={14}/>}
                aria-label={group.isDisabled ? "Включить группу" : "Отключить группу"}
              >
                {group.isDisabled ? 'Вкл.' : 'Откл.'}
              </Button>
            </Tooltip>
            {path.length > 1 && (
              <Tooltip label="Удалить эту группу" position="top" withArrow>
                <Button variant="filled" color="red" size="xs" onClick={() => onDeleteGroup(path)} disabled={controlsDisabled} leftSection={<IconTrash size={14}/>} aria-label="Удалить группу">
                  Удалить
                </Button>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <Collapse in={!group.isCollapsed} transitionDuration={200}>
        <SortableContext items={childIds} strategy={verticalListSortingStrategy} disabled={controlsDisabled}>
          <div
            ref={!isOverlay ? setInnerDropZoneRef : null}
            className={`
              ${styles.childrenContainer}
              ${isOverInnerZone && !controlsDisabled && !isOverlay ? styles.childrenContainerOver : ''}
            `}
          >
            {group.children && group.children.map((item) => {
              const currentItemPath = [...path, item];
              return (
                <SortableItemWrapper key={item.id} id={item.id} disabled={controlsDisabled} isGroup={item.type === 'GROUP'}>
                  {item.type === 'GROUP' ? (
                    <GroupComponent
                      group={item as GroupType}
                      path={currentItemPath}
                      onUpdateGroup={onUpdateGroup}
                      onAddFilter={onAddFilter}
                      onAddGroup={onAddGroup}
                      onDeleteGroup={onDeleteGroup}
                      onUpdateFilter={onUpdateFilter}
                      onDeleteFilter={onDeleteFilter}
                      parentIsLocked={isEffectivelyLocked}
                      parentIsDisabled={isEffectivelyDisabled}
                      editingFilterId={editingFilterId}
                      setEditingFilterId={setEditingFilterId}
                      isOverlay={isOverlay}
                    />
                  ) : (
                    <FilterComponent
                      filter={item as FilterType}
                      path={currentItemPath}
                      onUpdateFilter={onUpdateFilter}
                      onDeleteFilter={onDeleteFilter}
                      isEffectivelyLockedOrDisabled={isEffectivelyLocked || isEffectivelyDisabled}
                      isEditingThis={editingFilterId === item.id}
                      onStartEdit={setEditingFilterId}
                      isOverlay={isOverlay}
                      editingFilterId={editingFilterId}
                      setEditingFilterId={setEditingFilterId}
                    />
                  )}
                </SortableItemWrapper>
              );
            })}
            {(!group.children || group.children.length === 0) && isOverInnerZone && !controlsDisabled && !isOverlay && (
              <div className={styles.dropPlaceholder}>
                Перетащите сюда
              </div>
            )}
          </div>
        </SortableContext>
      </Collapse>

      {!group.isCollapsed && !isOverlay && (
        <div className={styles.addButtonsContainer}>
          <Button variant="outline" color="green" size="xs" onClick={() => onAddFilter(path)} disabled={controlsDisabled} leftSection={'+'}> Фильтр</Button>
          <Button variant="outline" color="blue" size="xs" onClick={() => onAddGroup(path)} disabled={controlsDisabled} leftSection={'+'}> Подгруппа</Button>
        </div>
      )}
    </Box>
  );
});

export default GroupComponent;