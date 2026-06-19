import { proxyBackendFileResponse } from "@/lib/file-proxy-response";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  return proxyBackendFileResponse(request, `/attachments/${params.id}/download?disposition=view`);
}
