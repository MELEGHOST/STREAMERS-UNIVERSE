/**
 * Возвращает правильную форму слова для заданного числа.
 * @param {number} number - Число.
 * @param {string} nominativeSingular - Именительный падеж, единственное число (1 фолловер)
 * @param {string} genitiveSingular - Родительный падеж, единственное число (2 фолловера)
 * @param {string} genitivePlural - Родительный падеж, множественное число (5 фолловеров)
 * @returns {string} Правильная форма слова.
 */
export function pluralize(
  number,
  nominativeSingular,
  genitiveSingular,
  genitivePlural
) {
  if (number === null || number === undefined) {
    return genitivePlural; // Или пустую строку, если число не определено
  }

  const absNumber = Math.abs(number);

  // Проверка на исключения для 11-19
  if (absNumber % 100 >= 11 && absNumber % 100 <= 19) {
    return genitivePlural;
  }

  const lastDigit = absNumber % 10;

  if (lastDigit === 1) {
    return nominativeSingular;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return genitiveSingular;
  }

  return genitivePlural;
}
