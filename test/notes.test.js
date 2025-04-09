const request = require('supertest');
const app = require('../app');
const db = require('../models');
const Notes = db.Notes;

// Mock the db module
jest.mock('../models', () => {
  const SequelizeMock = {
    sync: jest.fn().mockResolvedValue(),
  };

  return {
    sequelize: SequelizeMock,
    Notes: {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    },
  };
});

// Mock connect-session-sequelize
jest.mock('connect-session-sequelize', () => {
  return jest.fn(() => {
    return class SequelizeStoreMock {
      sync() {
        return Promise.resolve();
      }
      on() {
      }
    };
  });
});

// Mock express-session
jest.mock('express-session', () => {
  return jest.fn(() => (req, res, next) => {
    req.session = { user: { id: 8 } }; // Mock session user
    next();
  });
});

describe('Notes API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Test for creating a note
  describe('POST /note/save', () => {
    it('should create a new note', async () => {
      const noteData = { title: 'Test Note', note: 'This is a test note.' };

      // Mock Notes.create
      Notes.create.mockResolvedValue({ id: 999, ...noteData });

      const res = await request(app)
        .post('/note/save')
        .set('Cookie', 'connect.sid=r7e4duJWV74rA-oHyeV5mJD2fbtwAe32')
        .send(noteData);

      console.log('Response status:', res.status);
      console.log('Notes.create calls:', Notes.create.mock.calls);

      expect(res.status).toBe(302); // Expect redirect to /note/overview
      expect(Notes.create).toHaveBeenCalledTimes(1);
      expect(Notes.create).toHaveBeenCalledWith({
        ...noteData,
        user_id: 8,
      });
    });
  });

  // Test for updating a note
  describe('POST /note/edit/:id', () => {
    it('should update an existing note', async () => {
      const noteId = 999;
      const updatedData = { title: 'Updated Note', note: 'Updated content.' };
  
      // Mock Notes.findOne and Notes.update
      Notes.findOne.mockResolvedValue({ id: noteId, user_id: 8 });
      Notes.update.mockResolvedValue([1]);
  
      const res = await request(app)
        .post(`/note/edit/${noteId}`)
        .set('Cookie', 'connect.sid=r7e4duJWV74rA-oHyeV5mJD2fbtwAe32')
        .send(updatedData);
  
      console.log('Response status:', res.status);
      console.log('Notes.findOne calls:', Notes.findOne.mock.calls);
      console.log('Notes.update calls:', Notes.update.mock.calls);
  
      expect(res.status).toBe(302); // Expect redirect to /note/overview
      expect(Notes.findOne).toHaveBeenCalledTimes(1);
      expect(Notes.update).toHaveBeenCalledTimes(1);
      expect(Notes.update).toHaveBeenCalledWith(updatedData, {
        where: { id: noteId, user_id: 8 },
      });
    });
  });

  // Test for deleting a note
  describe('POST /note/delete/:id', () => {
    it('should delete an existing note', async () => {
      const noteId = 999;

      // Mock Notes.findOne and destroy
      const mockNote = { id: noteId, destroy: jest.fn().mockResolvedValue() };
      Notes.findOne.mockResolvedValue(mockNote);

      const res = await request(app)
        .post(`/note/delete/${noteId}`)
        .set('Cookie', 'connect.sid=r7e4duJWV74rA-oHyeV5mJD2fbtwAe32');

      console.log('Response status:', res.status);
      console.log('Notes.findOne calls:', Notes.findOne.mock.calls);
      console.log('mockNote.destroy calls:', mockNote.destroy.mock.calls);

      expect(res.status).toBe(302);
      expect(Notes.findOne).toHaveBeenCalledTimes(1);
      expect(mockNote.destroy).toHaveBeenCalledTimes(1);
    });
  });
});