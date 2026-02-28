export const pickDisplayTitle = (fallback: string, preferredTitle?: string): string => {
  if (preferredTitle && preferredTitle.trim().length > 0) {
    return preferredTitle;
  }

  return fallback;
};
