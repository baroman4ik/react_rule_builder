import { v4 as uuidv4 } from 'uuid';
import type { Rule, Group, Filter, Path } from '../types';

export const findItemPath = (itemId: string, rootGroup: Rule, currentPath: Path = []): Path | null => {
  if (rootGroup.id === itemId) {
    return [...currentPath, rootGroup];
  }
  if (rootGroup.type === 'GROUP' && rootGroup.children) {
    for (let i = 0; i < rootGroup.children.length; i++) {
      const child: Rule = rootGroup.children[i];
      const foundPath = findItemPath(itemId, child, [...currentPath, rootGroup]);
      if (foundPath) {
        return foundPath;
      }
    }
  }
  return null;
};

export const updateNestedItem = (rootGroup: Rule, itemPath: Path, updateFn: (item: Rule) => Rule): Rule => {
  const newRoot = { ...rootGroup };
  let currentLevel: Rule = newRoot;
  const pathIds = itemPath.map(p => p.id);

  for (let i = 0; i < pathIds.length - 1; i++) {
    const parentIdInPath = pathIds[i];
    const childIdInPath = pathIds[i + 1];
    if (currentLevel.type === 'GROUP' && currentLevel.id === parentIdInPath && currentLevel.children) {
      const childIndex = currentLevel.children.findIndex(c => c.id === childIdInPath);
      if (childIndex !== -1) {
        const newChildren = [...currentLevel.children];
        newChildren[childIndex] = { ...newChildren[childIndex] };
        currentLevel.children = newChildren;
        currentLevel = currentLevel.children[childIndex];
      } else {
        console.error("updateNestedItem: Child not found in path:", childIdInPath, currentLevel.id);
        return rootGroup;
      }
    } else {
      console.error("updateNestedItem: Parent not found or not a group in path:", parentIdInPath, currentLevel);
      return rootGroup;
    }
  }

  const itemToUpdateId = pathIds[pathIds.length - 1];
  if (currentLevel.id === itemToUpdateId) {
    const updated = updateFn(currentLevel);
    Object.assign(currentLevel, updated);
  } else if (currentLevel.type === 'GROUP' && currentLevel.children) {
    const targetItemIndex = currentLevel.children.findIndex(c => c.id === itemToUpdateId);
    if (targetItemIndex !== -1) {
      currentLevel.children[targetItemIndex] = updateFn(currentLevel.children[targetItemIndex]);
    } else {
      console.error("updateNestedItem: Target item for update not found in parent's children.");
    }
  } else {
    console.error("updateNestedItem: Could not find item to update or path is incorrect:", itemToUpdateId, currentLevel);
    return rootGroup;
  }
  return newRoot;
};

export const removeItemByPath = (rootGroup: Rule, itemPath: Path): Rule => {
  if (itemPath.length === 1 && rootGroup.id === itemPath[0].id) {
    console.warn("Cannot remove the root group this way.");
    return rootGroup;
  }
  const newRoot = { ...rootGroup };
  let currentLevel: Rule = newRoot;
  const parentObjectPath = itemPath.slice(0, -1);
  const itemToRemove = itemPath[itemPath.length - 1];

  for (let i = 0; i < parentObjectPath.length; i++) {
    const pathSegment = parentObjectPath[i];
    if (currentLevel.id !== pathSegment.id || currentLevel.type !== 'GROUP') {
      console.error("removeItemByPath: Path mismatch or not a group.", currentLevel.id, pathSegment.id);
      return rootGroup;
    }
    if (i === parentObjectPath.length - 1) break;

    if (currentLevel.children) {
      const nextChildInFullPath = itemPath[i + 1];
      const childIndex = currentLevel.children.findIndex(c => c.id === nextChildInFullPath.id);
      if (childIndex !== -1) {
        const newChildren = [...currentLevel.children];
        newChildren[childIndex] = { ...newChildren[childIndex] };
        currentLevel.children = newChildren;
        currentLevel = currentLevel.children[childIndex];
      } else {
        console.error("removeItemByPath: Child segment not found:", nextChildInFullPath.id, currentLevel.id);
        return rootGroup;
      }
    } else {
      console.error("removeItemByPath: Invalid path, parent has no children:", currentLevel.id);
      return rootGroup;
    }
  }

  if (currentLevel.type === 'GROUP' && currentLevel.children) {
    currentLevel.children = currentLevel.children.filter(child => child.id !== itemToRemove.id);
  } else {
    console.warn("removeItemByPath: Target parent for removal has no children or is not a group.", currentLevel.id, currentLevel.type);
  }
  return newRoot;
};

export const addItemToGroupAtPath = (rootGroup: Rule, parentPath: Path, newItem: Rule): Rule => {
  const newRoot = { ...rootGroup };
  let currentLevel: Rule = newRoot;

  for (let i = 0; i < parentPath.length; i++) {
    const segmentInPath = parentPath[i];
    if (currentLevel.id !== segmentInPath.id || currentLevel.type !== 'GROUP') {
      console.error("addItemToGroupAtPath: Path mismatch or not a group.", currentLevel.id, segmentInPath.id);
      return rootGroup;
    }
    if (i === parentPath.length - 1) break;

    if (currentLevel.children) {
      const nextChildInParentPath = parentPath[i+1];
      const childIndex = currentLevel.children.findIndex(c => c.id === nextChildInParentPath.id);
      if (childIndex !== -1) {
        const newChildren = [...currentLevel.children];
        newChildren[childIndex] = { ...newChildren[childIndex] };
        currentLevel.children = newChildren;
        currentLevel = currentLevel.children[childIndex];
      } else {
        console.error("addItemToGroupAtPath: Child segment not found:", nextChildInParentPath.id);
        return rootGroup;
      }
    } else {
      console.error("addItemToGroupAtPath: Invalid path, parent has no children:", currentLevel.id);
      return rootGroup;
    }
  }

  if (currentLevel.type === 'GROUP') {
    currentLevel.children = [...(currentLevel.children || []), newItem];
  } else {
    console.error("addItemToGroupAtPath: Cannot add item to a non-group.", currentLevel.id, currentLevel.type);
  }
  return newRoot;
};


export const getLiveItemAndParentDetails = (itemId: string, rootNode: Rule): { item: Rule | null, parent: Group | null, itemIndex: number, path: Path } => {
  const path = findItemPath(itemId, rootNode);
  if (!path || path.length === 0) {
    return { item: null, parent: null, itemIndex: -1, path: [] };
  }

  const item = path[path.length - 1];
  if (path.length === 1) {
    return { item, parent: null, itemIndex: -1, path };
  }

  const parentNodeFromInitialPath = path[path.length - 2];
  let liveParent: Group | null = null;

  if (parentNodeFromInitialPath.type === 'GROUP') {
    const parentPathFromRoot = findItemPath(parentNodeFromInitialPath.id, rootNode);
    if (parentPathFromRoot) {
      const foundParentNode = parentPathFromRoot[parentPathFromRoot.length -1];
      if (foundParentNode.type === 'GROUP') {
        liveParent = foundParentNode;
      } else {
        console.error("getLiveItemAndParentDetails: Found parent node by ID, but it's not a Group", foundParentNode);
      }
    } else {
      console.error("getLiveItemAndParentDetails: Could not find live parent node by ID from rootNode", parentNodeFromInitialPath.id);
    }
  } else {
    console.error("getLiveItemAndParentDetails: Parent node in initial path is not a Group", parentNodeFromInitialPath);
  }

  let itemIndex = -1;
  if (liveParent && liveParent.children) {
    itemIndex = liveParent.children.findIndex(child => child.id === itemId);
  }

  return { item, parent: liveParent, itemIndex, path };
};

export const generateLogicalExpression = (node: Rule, isParentDisabled = false): string => {
  const nodeIsDisabled = 'isDisabled' in node ? node.isDisabled : false;
  const effectivelyDisabled = nodeIsDisabled || isParentDisabled;

  if (effectivelyDisabled && node.type === 'GROUP') {
    return "";
  }
  if (effectivelyDisabled && node.type === 'FILTER') {
    return "";
  }

  if (node.type === 'FILTER') {
    let valueStr = '';
    if (node.operator !== 'is empty' && node.operator !== 'is not empty') {
      valueStr = typeof node.value === 'string' ? `'${node.value}'` : String(node.value);
    }
    return `${node.field} ${node.operator} ${valueStr}`.trim();
  }

  if (node.type === 'GROUP') {
    if (!node.children || node.children.length === 0) {
      return "";
    }
    const childrenExpressions = node.children
      .map(child => generateLogicalExpression(child, effectivelyDisabled))
      .filter(expr => expr !== "");

    if (childrenExpressions.length === 0) {
      return "";
    }
    if (childrenExpressions.length === 1) {
      return childrenExpressions[0];
    }
    const operatorStr = ` ${node.logic} `;
    return `(${childrenExpressions.join(operatorStr)})`;
  }
  return "";
};

export const createNewFilter = (): Filter => ({
  id: uuidv4(),
  type: 'FILTER',
  field: 'new_field',
  operator: 'equals',
  value: '',
  isDisabled: false,
});

export const createNewGroup = (): Group => ({
  id: uuidv4(),
  type: 'GROUP',
  name: 'Новая группа',
  logic: 'AND',
  isLocked: false,
  isDisabled: false,
  isCollapsed: false,
  children: [],
});