const STORAGE_KEY = 'phone-simulator-data';

export function saveData(data: unknown): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
  }
}

export function loadData<T>(): T | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('Failed to load data:', e);
    return null;
  }
}

export function exportData(): string {
  const data = localStorage.getItem(STORAGE_KEY);
  return data || '{}';
}

export function importData(jsonString: string): boolean {
  try {
    JSON.parse(jsonString); // validate
    localStorage.setItem(STORAGE_KEY, jsonString);
    return true;
  } catch {
    return false;
  }
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
