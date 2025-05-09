import { jest } from '@jest/globals';
import { isAuthenticated, redirectIfAuthenticated } from '../../middleware/auth.js';

// Mock Express request and response
const mockRequest = (cookies = {}, path = '/', query = {}) => ({
  cookies,
  path,
  query,
  originalUrl: path,
  params: {},
  headers: {
    authorization: cookies.session ? 'Bearer token' : undefined
  }
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
};

// Mock Firebase Admin SDK
jest.mock('../../config/firebase-admin.js', () => {
  return {
    auth: {
      verifySessionCookie: jest.fn()
    },
    db: {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn()
    }
  };
});

import { auth, db } from '../../config/firebase-admin.js';

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('isAuthenticated', () => {
    test('should redirect to login if no session cookie', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      
      await isAuthenticated(req, res, next);
      
      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should redirect to register if user is authenticated but has no profile', async () => {
      const req = mockRequest({ session: 'valid-session' });
      const res = mockResponse();
      const next = jest.fn();
      
      auth.verifySessionCookie.mockResolvedValueOnce({ uid: 'user123' });
      
      db.get.mockResolvedValueOnce({
        exists: false
      });
      
      await isAuthenticated(req, res, next);
      
      expect(auth.verifySessionCookie).toHaveBeenCalledWith('valid-session', true);
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(db.doc).toHaveBeenCalledWith('user123');
      expect(res.redirect).toHaveBeenCalledWith('/register');
      expect(res.clearCookie).toHaveBeenCalledWith('session');
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should call next if user is authenticated and has profile', async () => {
      const req = mockRequest({ session: 'valid-session' });
      const res = mockResponse();
      const next = jest.fn();
      
      const userData = {
        displayName: 'Test User',
        role: 'patient'
      };
      
      auth.verifySessionCookie.mockResolvedValueOnce({ uid: 'user123' });
      
      db.get.mockResolvedValueOnce({
        exists: true,
        data: () => userData
      });
      
      await isAuthenticated(req, res, next);
      
      expect(auth.verifySessionCookie).toHaveBeenCalledWith('valid-session', true);
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(db.doc).toHaveBeenCalledWith('user123');
      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({
        uid: 'user123',
        ...userData
      });
    });
    
    test('should redirect to login if session verification fails', async () => {
      const req = mockRequest({ session: 'invalid-session' });
      const res = mockResponse();
      const next = jest.fn();
      
      auth.verifySessionCookie.mockRejectedValueOnce(new Error('Invalid session'));
      
      await isAuthenticated(req, res, next);
      
      expect(auth.verifySessionCookie).toHaveBeenCalledWith('invalid-session', true);
      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(res.clearCookie).toHaveBeenCalledWith('session');
      expect(next).not.toHaveBeenCalled();
    });
  });
  
  describe('redirectIfAuthenticated', () => {
    test('should call next if no session cookie', async () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = jest.fn();
      
      await redirectIfAuthenticated(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
    
    test('should redirect to dashboard if session is valid and user has profile', async () => {
      const req = mockRequest({ session: 'valid-session' });
      const res = mockResponse();
      const next = jest.fn();
      
      auth.verifySessionCookie.mockResolvedValueOnce({ uid: 'user123' });
      
      db.get.mockResolvedValueOnce({
        exists: true
      });
      
      await redirectIfAuthenticated(req, res, next);
      
      expect(auth.verifySessionCookie).toHaveBeenCalledWith('valid-session', true);
      expect(db.collection).toHaveBeenCalledWith('users');
      expect(db.doc).toHaveBeenCalledWith('user123');
      expect(res.redirect).toHaveBeenCalledWith('/dashboard');
      expect(next).not.toHaveBeenCalled();
    });
    
    test('should allow access to registration if authenticated but no profile', async () => {
      const req = mockRequest({ session: 'valid-session' }, '/register');
      const res = mockResponse();
      const next = jest.fn();
      
      auth.verifySessionCookie.mockResolvedValueOnce({ uid: 'user123' });
      
      db.get.mockResolvedValueOnce({
        exists: false
      });
      
      await redirectIfAuthenticated(req, res, next);
      
      expect(auth.verifySessionCookie).toHaveBeenCalledWith('valid-session', true);
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });
    
    test('should call next if session verification fails', async () => {
      const req = mockRequest({ session: 'invalid-session' });
      const res = mockResponse();
      const next = jest.fn();
      
      auth.verifySessionCookie.mockRejectedValueOnce(new Error('Invalid session'));
      
      await redirectIfAuthenticated(req, res, next);
      
      expect(auth.verifySessionCookie).toHaveBeenCalledWith('invalid-session', true);
      expect(next).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith('session');
    });
    
    test('should clear session and proceed on potential redirect loop', async () => {
      const req = mockRequest({ session: 'valid-session' }, '/login', { redirect_attempt: '3' });
      const res = mockResponse();
      const next = jest.fn();
      
      await redirectIfAuthenticated(req, res, next);
      
      expect(res.clearCookie).toHaveBeenCalledWith('session');
      expect(next).toHaveBeenCalled();
      expect(auth.verifySessionCookie).not.toHaveBeenCalled();
    });
  });
}); 