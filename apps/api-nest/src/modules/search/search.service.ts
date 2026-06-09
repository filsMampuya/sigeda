import { Injectable } from "@nestjs/common";

@Injectable()
export class SearchService {
  indexPlan() {
    return {
      engine: "OpenSearch",
      node: process.env.OPENSEARCH_NODE ?? "http://localhost:9200",
      index: process.env.OPENSEARCH_INDEX_DOCUMENTS ?? "documents",
      fields: ["title", "reference", "summary", "ocrText", "keywords", "type", "status", "year", "departmentScopes"]
    };
  }
}
