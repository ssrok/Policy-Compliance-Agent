import { PolicyUploadResponse, PolicyProcessResponse } from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = {
  uploadPolicy: async (file: File): Promise<PolicyUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${BASE_URL}/policy/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to upload policy");
    }

    return response.json();
  },

  processPolicy: async (fileId: string): Promise<PolicyProcessResponse> => {
    const response = await fetch(`${BASE_URL}/policy/process/${fileId}`, {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Failed to process policy");
    }

    return response.json();
  },
};
