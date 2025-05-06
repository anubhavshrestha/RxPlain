/**
 * BaseRepository class with common methods for data access
 */
class BaseRepository {
  constructor(db, collectionName) {
    this._db = db;
    this._collection = collectionName;
  }
  
  /**
   * Get collection reference
   * @returns {FirebaseFirestore.CollectionReference} - Collection reference
   */
  collection() {
    return this._db.collection(this._collection);
  }
  
  /**
   * Get document reference
   * @param {string} id - Document ID
   * @returns {FirebaseFirestore.DocumentReference} - Document reference
   */
  doc(id) {
    return this.collection().doc(id);
  }
  
  /**
   * Get document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} - Document data or null if not found
   */
  async findById(id) {
    const docSnapshot = await this.doc(id).get();
    if (!docSnapshot.exists) {
      return null;
    }
    return { id: docSnapshot.id, ...docSnapshot.data() };
  }
  
  /**
   * Create a document
   * @param {Object} data - Document data
   * @returns {Promise<Object>} - Created document data with ID
   */
  async create(data) {
    let documentId = data.id;
    let docRef;
    
    if (documentId) {
      // Use provided ID
      docRef = this.doc(documentId);
      await docRef.set(data);
    } else {
      // Auto-generate ID
      docRef = await this.collection().add(data);
      documentId = docRef.id;
    }
    
    return { id: documentId, ...data };
  }
  
  /**
   * Update a document
   * @param {string} id - Document ID
   * @param {Object} data - Document data to update
   * @returns {Promise<Object>} - Updated document data
   */
  async update(id, data) {
    await this.doc(id).update(data);
    return { id, ...data };
  }
  
  /**
   * Delete a document
   * @param {string} id - Document ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    await this.doc(id).delete();
  }
  
  /**
   * Find documents by matching fields
   * @param {Object} criteria - Fields to match
   * @param {number} [limit=20] - Maximum number of documents to return
   * @returns {Promise<Array<Object>>} - List of documents
   */
  async findBy(criteria, limit = 20) {
    let query = this.collection();
    
    // Add filters for each criterion
    Object.entries(criteria).forEach(([field, value]) => {
      query = query.where(field, '==', value);
    });
    
    // Apply limit
    query = query.limit(limit);
    
    // Execute query
    const snapshot = await query.get();
    const results = [];
    
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return results;
  }
  
  /**
   * Get all documents in the collection
   * @param {number} [limit=100] - Maximum number of documents to return
   * @returns {Promise<Array<Object>>} - List of documents
   */
  async findAll(limit = 100) {
    const snapshot = await this.collection().limit(limit).get();
    const results = [];
    
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return results;
  }
}

export default BaseRepository; 