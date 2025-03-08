import React, { useState } from 'react';
import styles from './TierList.module.css';
import MediaCard from './MediaCard';

const TierList = ({ tierlist, items, mediaData, editable = false, onSave }) => {
  const [editMode, setEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState(items || []);
  const [draggedItem, setDraggedItem] = useState(null);
  const [draggedTier, setDraggedTier] = useState(null);
  
  // Получаем уникальные тиры из тирлиста
  const tiers = tierlist?.tiers || ['S', 'A', 'B', 'C', 'D', 'F'];
  
  // Группируем элементы по тирам
  const getItemsByTier = (tier) => {
    return (editMode ? editedItems : items)
      .filter(item => item.tier === tier)
      .sort((a, b) => a.position - b.position);
  };
  
  // Обработчик начала перетаскивания
  const handleDragStart = (item, tier) => {
    setDraggedItem(item);
    setDraggedTier(tier);
  };
  
  // Обработчик перетаскивания над тиром
  const handleDragOver = (e, tier) => {
    e.preventDefault();
    if (draggedTier !== tier) {
      // Обновляем тир для перетаскиваемого элемента
      setEditedItems(prev => 
        prev.map(item => 
          item.id === draggedItem.id 
            ? { ...item, tier } 
            : item
        )
      );
      setDraggedTier(tier);
    }
  };
  
  // Обработчик сброса перетаскивания
  const handleDrop = (e, tier) => {
    e.preventDefault();
    
    // Обновляем позиции элементов в тире
    const itemsInTier = getItemsByTier(tier);
    const updatedItems = [...editedItems];
    
    itemsInTier.forEach((item, index) => {
      const itemIndex = updatedItems.findIndex(i => i.id === item.id);
      if (itemIndex !== -1) {
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], position: index };
      }
    });
    
    setEditedItems(updatedItems);
    setDraggedItem(null);
    setDraggedTier(null);
  };
  
  // Обработчик сохранения изменений
  const handleSave = () => {
    if (onSave) {
      onSave(editedItems);
    }
    setEditMode(false);
  };
  
  // Обработчик отмены изменений
  const handleCancel = () => {
    setEditedItems(items);
    setEditMode(false);
  };
  
  // Получаем данные о медиа по ID
  const getMediaById = (mediaId) => {
    return mediaData?.find(media => media.id === mediaId) || { title: 'Неизвестно', category: 'Неизвестно' };
  };
  
  return (
    <div className={styles.tierlistContainer}>
      <div className={styles.tierlistHeader}>
        <h2 className={styles.tierlistTitle}>{tierlist?.title}</h2>
        <div className={styles.tierlistCategory}>{tierlist?.category}</div>
        
        {editable && !editMode && (
          <button 
            className={styles.editButton}
            onClick={() => setEditMode(true)}
          >
            Редактировать
          </button>
        )}
        
        {editMode && (
          <div className={styles.editActions}>
            <button 
              className={styles.saveButton}
              onClick={handleSave}
            >
              Сохранить
            </button>
            <button 
              className={styles.cancelButton}
              onClick={handleCancel}
            >
              Отмена
            </button>
          </div>
        )}
      </div>
      
      {tierlist?.description && (
        <div className={styles.tierlistDescription}>
          {tierlist.description}
        </div>
      )}
      
      <div className={styles.tierlistContent}>
        {tiers.map(tier => (
          <div 
            key={tier}
            className={styles.tierRow}
            onDragOver={(e) => editMode && handleDragOver(e, tier)}
            onDrop={(e) => editMode && handleDrop(e, tier)}
          >
            <div className={`${styles.tierLabel} ${styles[`tier${tier}`]}`}>
              {tier}
            </div>
            <div className={styles.tierItems}>
              {getItemsByTier(tier).map(item => {
                const media = getMediaById(item.mediaId);
                return (
                  <div 
                    key={item.id}
                    className={styles.tierItem}
                    draggable={editMode}
                    onDragStart={() => editMode && handleDragStart(item, tier)}
                  >
                    <div className={styles.mediaCardWrapper}>
                      <MediaCard 
                        media={media}
                        showRating={false}
                      />
                    </div>
                  </div>
                );
              })}
              
              {editMode && getItemsByTier(tier).length === 0 && (
                <div className={styles.emptyTierPlaceholder}>
                  Перетащите сюда элементы
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TierList; 