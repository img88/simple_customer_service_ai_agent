import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

const api = axios.create({
    baseURL: API_BASE,
});

export const chatApi = {
    createSession: (userId: string) =>
        api.post('/sessions', { user_id: userId }),

    sendMessage: (userId: string, sessionId: string, message: string) =>
        api.post('/chat', { user_id: userId, session_id: sessionId, message }),

    getHistory: (userId: string, sessionId: string) =>
        api.get(`/sessions/${sessionId}/history`, { params: { user_id: userId } }),

    getSessions: (userId: string) =>
        api.get('/sessions', { params: { user_id: userId } }),

    uploadKnowledge: (formData: FormData) =>
        api.post('/knowledge/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    previewKnowledge: (formData: FormData) =>
        api.post('/knowledge/preview', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }),

    getChunks: (limit = 20, offset = 0) =>
        api.get('/knowledge/chunks', { params: { limit, offset } }),

    deleteChunk: (chunkId: string) =>
        api.delete(`/knowledge/chunks/${chunkId}`),

    deleteSession: (userId: string, sessionId: string) =>
        api.delete(`/sessions/${sessionId}`, { params: { user_id: userId } }),

    getChunkDetail: (chunkId: string) =>
        api.get(`/knowledge/chunks/${chunkId}`)
};
