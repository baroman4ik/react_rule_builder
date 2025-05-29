import React, { useState } from 'react';
import styles from './FilterEditor.module.css';
import type {FieldType, FilterEditorProps, OperatorType} from "../../types.ts";

const FilterEditor: React.FC<FilterEditorProps> = ({ filter, onSave, onCancel, parentLockedOrDisabled }) => {
  const [field, setField] = useState<FieldType>(filter.field);
  const [operator, setOperator] = useState<OperatorType>(filter.operator);
  const [value, setValue] = useState<string>(filter.value);

  const operators: OperatorType[] = ['equals', 'not equals', 'is after', 'is before', 'contains', 'starts with', 'ends with', 'is empty', 'is not empty'];
  const fields: FieldType[] = ['gender', 'birth_date', 'channel', 'name', 'email', 'city', 'country', 'new_field'];

  const handleSave = () => {
    onSave({ ...filter, field, operator, value });
  };

  return (
    <div className={styles.editorContainer}>
      <select className={styles.select} value={field} onChange={(e) => setField(e.target.value as FieldType)} disabled={parentLockedOrDisabled}>
        {fields.map(f => <option key={f} value={f}>{f}</option>)}
      </select>
      <select className={styles.select} value={operator} onChange={(e) => setOperator(e.target.value as OperatorType)} disabled={parentLockedOrDisabled}>
        {operators.map(op => <option key={op} value={op}>{op}</option>)}
      </select>
      <input
        type="text"
        className={styles.input}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Значение"
        disabled={parentLockedOrDisabled || operator === 'is empty' || operator === 'is not empty'}
      />
      <button className={`${styles.button} ${styles.saveButton}`} onClick={handleSave} disabled={parentLockedOrDisabled}>Сохранить</button>
      <button className={`${styles.button} ${styles.cancelButton}`} onClick={onCancel} disabled={parentLockedOrDisabled}>Отмена</button>
    </div>
  );
};

export default FilterEditor;