import { proxyBackendFileResponse } from "@/lib/file-proxy-response";

type RouteContext = {
  params: {
    id: string;
    annotationId: string;
  };
};

export async function GET(request: Request, { params }: RouteContext) {
  return proxyBackendFileResponse(
    request,
    `/documents/${params.id}/annotations/${params.annotationId}/download?disposition=download`
  );
}
