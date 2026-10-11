import { useEffect, useState } from "react";

export interface Route {
  path: string;
  params: URLSearchParams;
}

function parse(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [path, query] = raw.split("?");
  return {
    path: path && path.startsWith("/") ? path : path ? `/${path}` : "/",
    params: new URLSearchParams(query ?? ""),
  };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parse(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return route;
}

export function navigate(path: string): void {
  if (window.location.hash === `#${path}`) return;
  window.location.hash = path;
}

/** 供二维码使用：当前页面地址 + 指定 hash 路由。 */
export function urlFor(path: string): string {
  const base = window.location.href.split("#")[0];
  return `${base}#${path}`;
}
