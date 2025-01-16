/* eslint-disable @typescript-eslint/no-explicit-any */
// src/services/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// Add request interceptor for auth
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const githubApi = {
  getPullRequestFiles: async (
    owner: string,
    repo: string,
    pullNumber: number
  ) => {
    const { data } = await api.get(
      `/api/github/repos/${owner}/${repo}/pulls/${pullNumber}/files`
    );
    return data;
  },
  getRepos: async () => {
    const { data } = await api.get(`/api/github/repositories`);
    return data;
  },
  getPullRequests: async (owner: string, repo: string) => {
    const { data } = await api.get(`/api/github/repos/${owner}/${repo}/pulls`);
    return data;
  },
  getPullRequest: async (owner: string, repo: string, pullNumber: number) => {
    const { data } = await api.get(
      `/api/github/repos/${owner}/${repo}/pulls/${pullNumber}`
    );

    return data;
  },

  getPullRequestComments: async (
    owner: string,
    repo: string,
    pullNumber: number
  ) => {
    const { data } = await api.get(
      `/api/github/repos/${owner}/${repo}/pulls/${pullNumber}/comments`
    );
    return data;
  },

  createComment: async (
    owner: string,
    repo: string,
    pullNumber: string,
    commentData: any
  ) => {
    const { data } = await api.post(
      `/api/github/repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
      commentData
    );
    return data;
  },
  analyze: async (code: any, language: string) => {
    const { data } = await api.post(`/api/analysis/analyze`, {
      code,
      language,
    });
    return data;
  },

  submitReview: async (
    owner: string,
    repo: string,
    pullNumber: string,
    reviewData: any
  ) => {
    const { data } = await api.post(
      `/api/github/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
      reviewData
    );
    return data;
  },
};

export default api;
