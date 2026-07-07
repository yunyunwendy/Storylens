const baseUrl = import.meta.env.BASE_URL || "/";
const basePath = new URL(baseUrl, window.location.origin).pathname.replace(/\/$/, "");

export function assetPath(path) {
  if (!path || /^(blob:|data:|https?:)/.test(path)) {
    return path;
  }

  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${baseUrl}${cleanPath}`;
}

export function routePath(route = "/") {
  const cleanRoute = route.startsWith("/") ? route : `/${route}`;
  if (!basePath) {
    return cleanRoute;
  }

  return cleanRoute === "/" ? `${basePath}/` : `${basePath}${cleanRoute}`;
}

export function routeFromLocation(pathname) {
  if (basePath && pathname.startsWith(basePath)) {
    const route = pathname.slice(basePath.length) || "/";
    return route.startsWith("/") ? route : `/${route}`;
  }

  return pathname;
}
