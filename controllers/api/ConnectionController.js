import BaseController from './BaseController.js';

/**
 * Controller for connection-related endpoints
 */
class ConnectionController extends BaseController {
  /**
   * Create ConnectionController instance
   * @param {ConnectionService} connectionService - Connection service
   */
  constructor(connectionService) {
    super();
    this._connectionService = connectionService;
  }
  
  /**
   * Send connection request
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  sendConnectionRequest = async (req, res) => {
    try {
      const senderId = req.user.uid;
      const { targetUserId } = req.params;
      const { note } = req.body;
      
      console.log(`[ConnectionController] Sending connection request from ${senderId} to ${targetUserId}`);
      
      if (!targetUserId) {
        console.error('[ConnectionController] Missing targetUserId');
        return this.sendError(res, 'Target user ID is required', 400);
      }
      
      await this._connectionService.sendConnectionRequest(senderId, targetUserId, note);
      console.log(`[ConnectionController] Connection request sent successfully`);
      return this.sendSuccess(res, { success: true });
    } catch (error) {
      console.error(`[ConnectionController] Error sending connection request: ${error.message}`);
      console.error(error.stack);
      return this.sendError(res, error.message, 500);
    }
  }
  
  /**
   * Accept connection request
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  acceptConnectionRequest = this.handleErrors(async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.uid;
    
    this.validateParams({ requestId }, ['requestId']);
    
    await this._connectionService.acceptConnectionRequest(requestId, userId);
    this.sendSuccess(res, { success: true });
  });
  
  /**
   * Reject connection request
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  rejectConnectionRequest = this.handleErrors(async (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.uid;
    const { reason } = req.body;
    
    this.validateParams({ requestId }, ['requestId']);
    
    await this._connectionService.rejectConnectionRequest(requestId, userId, reason);
    this.sendSuccess(res, { success: true });
  });
  
  /**
   * Get connection requests
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getConnectionRequests = this.handleErrors(async (req, res) => {
    const userId = req.user.uid;
    const { type = 'received' } = req.query;
    
    let requests = [];
    
    if (type === 'received') {
      requests = await this._connectionService.getPendingRequestsReceived(userId);
    } else if (type === 'sent') {
      requests = await this._connectionService.getPendingRequestsSent(userId);
    } else {
      return this.sendError(res, 'Invalid request type', 400);
    }
    
    // Format response
    const formattedRequests = requests.map(request => ({
      id: request.id,
      senderId: request.senderId,
      receiverId: request.receiverId,
      senderRole: request.senderRole,
      receiverRole: request.receiverRole,
      status: request.status,
      createdAt: request.createdAt,
      note: request.note
    }));
    
    this.sendSuccess(res, { requests: formattedRequests });
  });
  
  /**
   * Get user connections
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  getConnections = this.handleErrors(async (req, res) => {
    const userId = req.user.uid;
    
    const connections = await this._connectionService.getActiveConnections(userId);
    
    // Format response
    const formattedConnections = connections.map(connection => {
      // Determine the ID of the other party in the connection
      const otherPartyId = connection.senderId === userId ? 
        connection.receiverId : connection.senderId;
      
      // Determine the role of the other party
      const otherPartyRole = connection.senderId === userId ?
        connection.receiverRole : connection.senderRole;
        
      return {
        id: connection.id,
        userId: otherPartyId,
        userRole: otherPartyRole,
        status: connection.status,
        createdAt: connection.createdAt,
        acceptedAt: connection.acceptedAt
      };
    });
    
    this.sendSuccess(res, { connections: formattedConnections });
  });
  
  /**
   * Remove connection
   * @param {Express.Request} req - Express request
   * @param {Express.Response} res - Express response
   */
  removeConnection = this.handleErrors(async (req, res) => {
    const userId = req.user.uid;
    const { connectionUserId } = req.params;
    
    this.validateParams({ connectionUserId }, ['connectionUserId']);
    
    await this._connectionService.removeConnection(userId, connectionUserId);
    this.sendSuccess(res, { success: true });
  });
}

export default ConnectionController; 