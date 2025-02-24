import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  timeout: 30000, // Add timeout
});

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    console.log('Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
    });
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    console.log('Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/v1/login/', { email, password });
    return response.data;
  },
  logout: async () => {
    try {
      console.log('API: Making logout request');
      const response = await api.post('/api/v1/logout/');
      console.log('API: Logout request successful', response.data);
      localStorage.removeItem('token');
      return response.data;
    } catch (error) {
      console.error('API: Logout request failed', error);
      // Still remove token even if API call fails
      localStorage.removeItem('token');
      throw error;
    }
  },
  register: async (userData: {
    email: string;
    password: string;
    full_name: string;
    date_of_birth?: string;
    full_address: string;
    phone_number: string;
  }) => {
    const response = await api.post('/api/v1/create/', userData);
    return response.data;
  },
};

// User API calls
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/api/v1/me/');
    return response.data;
  },
  updateProfile: async (userData: {
    full_name?: string;
    date_of_birth?: string;
    full_address?: string;
    phone_number?: string;
  }) => {
    const response = await api.patch('/api/v1/me/', userData);
    return response.data;
  },
  deleteAccount: async () => {
    await api.delete('/api/v1/delete/');
  },
};

// Chat API calls
export interface Session {
  session_id: string;
  first_message: string;
  created_at: string;
}

export interface ChatMessage {
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  session_id: string;
}

export const chatAPI = {
  // Get all sessions
  getSessions: async (): Promise<Session[]> => {
    try {
      const response = await api.get('/api/v1/sessions/');
      console.log('Sessions response:', response.data);
      
      // Sort sessions by created_at, most recent first
      const sortedSessions = response.data.sort((a: Session, b: Session) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      return sortedSessions;
    } catch (error) {
      console.error('Failed to get sessions:', error);
      throw error;
    }
  },

  // Delete a session
  deleteSession: async (sessionId: string): Promise<void> => {
    try {
      console.log('Deleting session:', sessionId);
      await api.delete('/api/v1/sessions/', { 
        data: { session_id: sessionId }
      });
      console.log('Session deleted successfully');
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  },

  // Get chat history for a session
  getChatHistory: async (sessionId: string, page: number = 1, pageSize: number = 10): Promise<ChatMessage[]> => {
    try {
      const response = await api.get(`/api/v1/history/?session_id=${sessionId}&page=${page}&page_size=${pageSize}`);
      console.log('Raw chat history response:', response);
      console.log('Chat history data:', response.data);

      // Ensure response.data has the expected structure
      if (!response.data || !Array.isArray(response.data.results)) {
        console.error('Invalid chat history format:', response.data);
        throw new Error('Invalid chat history format from server');
      }

      // Transform the messages to match our ChatMessage interface
      const validatedMessages = response.data.results.map((message: any) => ({
        content: message.content || '',
        role: message.message_type === 'user' ? 'user' : 'assistant',
        timestamp: message.timestamp || new Date().toISOString(),
      }));

      return validatedMessages;
    } catch (error) {
      console.error('Failed to get chat history:', error);
      throw error;
    }
  },

  // Send a message to chat
  sendMessage: async (message: string, sessionId?: string, onChunk?: (chunk: string) => void) => {
    try {
      console.log('Sending chat message:', { 
        user_query: message,
        session_id: sessionId
      });
      
      const response = await fetch(`${API_BASE_URL}/api/v1/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          user_query: message,
          session_id: sessionId || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      // Get session ID from headers
      const newSessionId = response.headers.get('session-id');
      
      return {
        response: '', // Will be handled by streaming logic in component
        session_id: newSessionId || '',
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },
}; 