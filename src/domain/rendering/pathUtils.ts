export const escapeJsonPointerToken = (token: string): string =>
  token.replace(/~/g, "~0").replace(/\//g, "~1");

export const joinJsonPointerPath = (parentPath: string, token: string): string => {
  const escapedToken = escapeJsonPointerToken(token);
  return parentPath === "/" ? `/${escapedToken}` : `${parentPath}/${escapedToken}`;
};
