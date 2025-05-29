export type LogicType = 'AND' | 'OR';
export type OperatorType = 'equals' | 'not equals' | 'is after' | 'is before' | 'contains' | 'starts with' | 'ends with' | 'is empty' | 'is not empty';
export type FieldType = 'gender' | 'birth_date' | 'channel' | 'name' | 'email' | 'city' | 'country' | 'new_field';


export interface BaseRule {
  id: string;
  type: 'GROUP' | 'FILTER';
  isDisabled: boolean;
}

export interface Filter extends BaseRule {
  type: 'FILTER';
  field: FieldType;
  operator: OperatorType;
  value: string;
}

export interface Group extends BaseRule {
  type: 'GROUP';
  name: string;
  logic: LogicType;
  isLocked: boolean;
  isCollapsed: boolean;
  children: Rule[];
}

export type Rule = Group | Filter;
export type Path = Rule[];

export interface CommonRuleProps {
  path: Path;
  onUpdateGroup: (path: Path, updateFn: (group: Group) => Group) => void;
  onUpdateFilter: (path: Path, updateFn: (filter: Filter) => Filter) => void;
  onDeleteFilter: (path: Path) => void;
  onDeleteGroup: (path: Path) => void;
  parentIsLocked: boolean;
  parentIsDisabled: boolean;
  editingFilterId: string | null;
  setEditingFilterId: (id: string | null) => void;
  isOverlay?: boolean;
}

export interface GroupComponentProps extends CommonRuleProps {
  group: Group;
  onAddFilter: (parentPath: Path) => void;
  onAddGroup: (parentPath: Path) => void;
}

export interface FilterComponentProps extends Pick<CommonRuleProps, 'path' | 'onUpdateFilter' | 'onDeleteFilter' | 'editingFilterId' | 'setEditingFilterId' | 'isOverlay'> {
  filter: Filter;
  isEffectivelyLockedOrDisabled: boolean;
  isEditingThis: boolean;
  onStartEdit: (id: string | null) => void;
}

export interface FilterEditorProps {
  filter: Filter;
  onSave: (updatedFilter: Filter) => void;
  onCancel: () => void;
  parentLockedOrDisabled: boolean;
}

