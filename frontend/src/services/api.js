import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Добавляем перехватчик для добавления токена к запросам
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const auth = {
    register: (userData) => api.post('/auth/register', userData),
    login: (credentials) => api.post('/auth/token', new URLSearchParams(credentials)),
};

export const images = {
    upload: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/images/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    getAll: () => api.get('/images'),
    delete: (id) => api.delete(`/images/${id}`),
};

export const photobooks = {
    create: (photobookData) => api.post('/photobooks', photobookData),
    getAll: () => api.get('/photobooks'),
    getOne: (id) => api.get(`/photobooks/${id}`),
    update: (id, data) => api.put(`/photobooks/${id}`, data),
    delete: (id) => api.delete(`/photobooks/${id}`),
    updateLayout: (id, layoutData) => api.put(`/photobooks/${id}/layout`, { layout_data: layoutData }),
    createOrder: (id) => api.post(`/photobooks/${id}/order`),
    getPages: (id) => api.get(`/photobooks/${id}/pages`),
    updatePage: (id, pageNumber, pageData) => 
        api.put(`/photobooks/${id}/pages/${pageNumber}`, { page_data: pageData }),
    previewPage: (id, pageNumber) => 
        api.get(`/photobooks/${id}/pages/${pageNumber}/preview`),
};

// Методы для работы с шаблонами
export const templatesApi = {
    getTemplates: async () => {
        const response = await api.get('/templates');
        return response.data;
    },

    createTemplate: async (template) => {
        const response = await api.post('/templates', template);
        return response.data;
    },

    updateTemplate: async (id, template) => {
        const response = await api.put(`/templates/${id}`, template);
        return response.data;
    },

    deleteTemplate: async (id) => {
        const response = await api.delete(`/templates/${id}`);
        return response.data;
    },

    shareTemplate: async (templateId, userId) => {
        const response = await api.post('/templates/share', {
            template_id: templateId,
            user_id: userId
        });
        return response.data;
    },

    removeShare: async (templateId, userId) => {
        const response = await api.delete(`/templates/share/${templateId}/${userId}`);
        return response.data;
    }
};
