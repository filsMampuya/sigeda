function getForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function getRequestOrigin(request: Request) {
  const fallbackUrl = new URL(request.url);
  const protocol = getForwardedValue(request.headers.get("x-forwarded-proto")) ?? fallbackUrl.protocol.replace(":", "");
  const host =
    getForwardedValue(request.headers.get("x-forwarded-host")) ??
    getForwardedValue(request.headers.get("host")) ??
    fallbackUrl.host;

  return `${protocol}://${host}`;
}

export function getRequestUrl(request: Request, pathname: string) {
  return new URL(pathname, getRequestOrigin(request));
}
