import React, { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  MeasuringStrategy,
  rectIntersection,
} from '@dnd-kit/core';
import type {
  DragStartEvent,
  DragEndEvent,
  //TODO:Определить тип Collision из dnd
  CollisionDetectionArgs,
  Collision,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';
import { MantineProvider, Title, Paper, Divider, Box } from '@mantine/core';
import '@mantine/core/styles.css';

import GroupComponent from '../GroupComponent/GroupComponent';
import FilterComponent from '../FilterComponent/FilterComponent';
import type { Rule, Path, Group as GroupType, Filter as FilterType } from '../../types';
import {
  findItemPath,
  updateNestedItem,
  removeItemByPath,
  addItemToGroupAtPath,
  getLiveItemAndParentDetails,
  generateLogicalExpression,
  createNewFilter,
  createNewGroup,
} from '../../helpers/utils';
import styles from './RuleBuilder.module.css';


const initialData: GroupType = {
  id: uuidv4(),
  type: "GROUP",
  name: "Корневая группа",
  logic: "AND",
  isLocked: false,
  isDisabled: false,
  isCollapsed: false,
  children: [],
};
initialData.children.push(
  {
    id: uuidv4(),
    type: "GROUP",
    name: "Подгруппа 1",
    logic: "OR",
    isLocked: false,
    isDisabled: false,
    isCollapsed: false,
    children: [
      {
        ...createNewFilter(),
        field: "birth_date",
        operator: "is after",
        value: "2077-01-01",
      },
      {
        ...createNewFilter(),
        field: "channel",
        operator: "equals",
        value: "email",
      },
    ],
  } as GroupType,
  {
    id: uuidv4(),
    type: "GROUP",
    name: "Подгруппа 2 (отключена)",
    logic: "AND",
    isLocked: false,
    isDisabled: true,
    isCollapsed: false,
    children: [
      {
        ...createNewFilter(),
        field: "city",
        operator: "equals",
        value: "MOSKVA",
      },
    ],
  } as GroupType,
  { ...createNewFilter(), field: "name", operator: "contains", value: "Roma" }
);


const RuleBuilderContent: React.FC = () => {
  const [rules, setRules] = useState<GroupType>(initialData);
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const [activeDraggedItemData, setActiveDraggedItemData] = useState<Rule | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findItemDataById = useCallback((itemId: string, rootNode: Rule = rules): Rule | null => {
    const path = findItemPath(itemId, rootNode);
    return path ? path[path.length - 1] : null;
  }, [rules]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const itemData = findItemDataById(String(event.active.id));
    setActiveDraggedItemData(itemData);
  }, [findItemDataById]);

  const customCollisionDetection = useCallback(
    (args: CollisionDetectionArgs): Collision[] => {
      const innerDropZoneCollisions = rectIntersection(args).filter(
        (collision: Collision) => collision.data?.droppableContainer?.data?.current?.type === 'GROUP_INNER_DROP_ZONE'
      );
      if (innerDropZoneCollisions.length > 0) return innerDropZoneCollisions;

      const itemCollisions = rectIntersection(args).filter(
        (collision: Collision) => collision.data?.droppableContainer?.data?.current?.type === 'FILTER_ITEM' ||
          collision.data?.droppableContainer?.data?.current?.type === 'GROUP_ITEM'
      );
      if (itemCollisions.length > 0) return itemCollisions;

      const rootCollision = rectIntersection(args).find((collision: Collision) => collision.id === rules.id);
      if (rootCollision) return [rootCollision];

      return [];
    },[rules.id]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDraggedItemData(null);
    const { active, over } = event;

    if (!over || !active) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId && over.data.current?.type !== 'GROUP_INNER_DROP_ZONE') {
      return;
    }

    setRules(prevRules => {
      const newRulesTree = JSON.parse(JSON.stringify(prevRules)) as GroupType;
      const { item: activeItem, parent: activeItemParent, itemIndex: oldItemIndex } = getLiveItemAndParentDetails(activeId, newRulesTree);

      if (!activeItem) {
        console.error("Перетаскиваемый элемент не найден:", activeId);
        return prevRules;
      }

      let targetParentNode: GroupType | null = null;
      let targetIndex = 0;
      const overData = over.data.current as { type: string, groupId?: string, itemId?: string } | undefined;


      if (overData?.type === 'GROUP_INNER_DROP_ZONE' && overData.groupId) {
        const { item: parentGroup } = getLiveItemAndParentDetails(overData.groupId, newRulesTree);
        if (parentGroup && parentGroup.type === 'GROUP') {
          targetParentNode = parentGroup;
          targetIndex = parentGroup.children ? parentGroup.children.length : 0;
        }
      } else if (overData?.type === 'GROUP_ITEM' || overData?.type === 'FILTER_ITEM') {
        const { parent: overItemParent, itemIndex: overItemIndexInItsParent } = getLiveItemAndParentDetails(overId, newRulesTree);
        const overActualItem = findItemDataById(overId, newRulesTree);

        if(overActualItem && overActualItem.type === 'GROUP' && overId === over.id) {
          targetParentNode = overActualItem as GroupType;
          targetIndex = targetParentNode.children ? targetParentNode.children.length : 0;
        } else if (overItemParent && overItemParent.type === 'GROUP') {
          targetParentNode = overItemParent;
          targetIndex = overItemIndexInItsParent >= 0 ? overItemIndexInItsParent : 0;
        }
      } else if (overId === newRulesTree.id && newRulesTree.type === 'GROUP') {
        targetParentNode = newRulesTree;
        targetIndex = newRulesTree.children ? newRulesTree.children.length : 0;
      }

      if (!targetParentNode) {
        console.warn("Не удалось определить целевого родителя для drop:", overId, overData);
        return prevRules;
      }

      if (activeItem.type === 'GROUP') {
        let checkParent: GroupType | null = targetParentNode;
        while(checkParent) {
          if (checkParent.id === activeItem.id) {
            console.warn("Попытка вложить группу в саму себя или в своего потомка. Отмена.");
            return prevRules;
          }
          const parentDetails = getLiveItemAndParentDetails(checkParent.id, newRulesTree);
          checkParent = parentDetails.parent;
        }
      }

      if (activeItemParent && activeItemParent.children && oldItemIndex > -1) {
        activeItemParent.children.splice(oldItemIndex, 1);
      }

      if (!targetParentNode.children) {
        targetParentNode.children = [];
      }

      if(activeItemParent && activeItemParent.id === targetParentNode.id && oldItemIndex < targetIndex && oldItemIndex !== -1) {
        targetIndex--;
      }

      targetParentNode.children.splice(targetIndex, 0, activeItem);
      return newRulesTree;
    });
  }, [rules, findItemDataById]);

  const handleDragCancel = useCallback(() => {
    setActiveDraggedItemData(null);
  }, []);

  const memoizedUpdateGroup = useCallback((path: Path, updateFnFromCaller: (group: GroupType) => GroupType) => {
    const wrapperUpdateFn = (item: Rule): Rule => {
      if (item.type === 'GROUP') {
        return updateFnFromCaller(item as GroupType);
      }
      console.warn('memoizedUpdateGroup: updateFn вызвана для не-группы по пути к группе', item);
      return item;
    };
    setRules(prev => updateNestedItem(prev, path, wrapperUpdateFn) as GroupType);
  }, []);

  const memoizedAddFilter = useCallback((parentPath: Path) => {
    const newFilter = createNewFilter();
    setRules(prev => addItemToGroupAtPath(prev, parentPath, newFilter) as GroupType);
    setEditingFilterId(newFilter.id);
  }, []);

  const memoizedAddGroup = useCallback((parentPath: Path) => {
    const newGroup = createNewGroup();
    setRules(prev => addItemToGroupAtPath(prev, parentPath, newGroup) as GroupType);
  }, []);

  const memoizedDeleteItem = useCallback((itemPath: Path) => {
    if (itemPath.length > 0 && itemPath[itemPath.length - 1].id === editingFilterId) {
      setEditingFilterId(null);
    }
    setRules(prev => removeItemByPath(prev, itemPath) as GroupType);
  }, [editingFilterId]);

  const memoizedUpdateFilter = useCallback((filterPath: Path, updateFnFromCaller: (filter: FilterType) => FilterType) => {
    const wrapperUpdateFn = (item: Rule): Rule => {
      if (item.type === 'FILTER') {
        return updateFnFromCaller(item as FilterType);
      }
      console.warn('memoizedUpdateFilter: updateFn вызвана для не-фильтра по пути к фильтру', item);
      return item;
    };
    setRules(prev => updateNestedItem(prev, filterPath, wrapperUpdateFn) as GroupType);
    setEditingFilterId(null);
  }, []);

  const logicalExpressionString = useMemo(() => {
    const expr = generateLogicalExpression(rules);
    return expr || "Нет активных правил для построения выражения.";
  }, [rules]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
    >
      <Box className={styles.ruleBuilderContainer}>
        <Title order={1} className={styles.mainTitle}>Rule Builder</Title>
        <Paper shadow="xs" p="md" withBorder>
          <GroupComponent
            group={rules}
            path={[rules]}
            onUpdateGroup={memoizedUpdateGroup}
            onAddFilter={memoizedAddFilter}
            onAddGroup={memoizedAddGroup}
            onDeleteGroup={memoizedDeleteItem}
            onUpdateFilter={memoizedUpdateFilter}
            onDeleteFilter={memoizedDeleteItem}
            parentIsLocked={false}
            parentIsDisabled={false}
            editingFilterId={editingFilterId}
            setEditingFilterId={setEditingFilterId}
          />
        </Paper>
        <DragOverlay dropAnimation={null}>
          {activeDraggedItemData ? (
            activeDraggedItemData.type === 'GROUP' ? (
              <GroupComponent
                group={activeDraggedItemData as GroupType}
                path={[]} isOverlay={true}
                onUpdateGroup={()=>{}} onAddFilter={()=>{}} onAddGroup={()=>{}}
                onDeleteGroup={()=>{}} onUpdateFilter={()=>{}} onDeleteFilter={()=>{}}
                parentIsLocked={false} parentIsDisabled={false}
                editingFilterId={null} setEditingFilterId={()=>{}}
              />
            ) : activeDraggedItemData.type === 'FILTER' ? (
              <FilterComponent
                filter={activeDraggedItemData as FilterType}
                path={[]} isOverlay={true}
                onUpdateFilter={()=>{}} onDeleteFilter={()=>{}}
                isEffectivelyLockedOrDisabled={false}
                isEditingThis={false} onStartEdit={()=>{}}
                editingFilterId={null}
                setEditingFilterId={()=>{}}
              />
            ) : null
          ) : null}
        </DragOverlay>

        <Divider my="xl" />
        <Title order={3} className={styles.sectionTitle}>Итоговое логическое выражение:</Title>
        <Paper component="pre" p="md" radius="md" withBorder className={styles.expressionOutput}>
          {logicalExpressionString}
        </Paper>

        <Title order={3} className={`${styles.sectionTitle} ${styles.marginTop}`}>Текущее состояние правил (JSON):</Title>
        <Paper component="pre" p="md" radius="md" withBorder className={styles.jsonOutput}>
          {JSON.stringify(rules, null, 2)}
        </Paper>
      </Box>
    </DndContext>
  );
};

const RuleBuilder: React.FC = () => {
  return (
    <MantineProvider defaultColorScheme="light"> {/* или dark */}
      <RuleBuilderContent />
    </MantineProvider>
  );
}

export default RuleBuilder;