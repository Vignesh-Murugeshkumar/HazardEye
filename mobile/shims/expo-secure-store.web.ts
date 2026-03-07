// Web shim for expo-secure-store using localStorage
export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(key, value);
  } catch {
    // silently fail
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch {
    // silently fail
  }
}

export default { getItemAsync, setItemAsync, deleteItemAsync };
