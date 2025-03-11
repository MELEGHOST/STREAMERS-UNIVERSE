import React from 'react';
import styles from './NeonCheckbox.module.css';

const NeonCheckbox = ({ label, checked, onChange, name, value }) => {
  return (
    <div className={styles.neonCheckboxContainer}>
      <label className={styles.neonCheckbox}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          name={name}
          value={value}
          className={styles.hiddenCheckbox}
        />
        <span className={styles.checkmark}></span>
        <span className={styles.label}>{label}</span>
      </label>
    </div>
  );
};

export default NeonCheckbox; 