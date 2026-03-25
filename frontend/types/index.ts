export interface PolicyUploadResponse {
  file_id: string;
  filename: string;
}

export interface PolicyProcessResponse {
  file_id: string;
  num_clauses: number;
  clauses: string[];
}
