import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  ActivityIndicator
} from 'react-native';
import { COLORS, SIZES } from '../../styles/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ChangePasswordModal = ({ visible, onClose, onSave, isLoading }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const validatePasswords = () => {
    setError('');
    
    if (!currentPassword.trim()) {
      setError('Current password is required');
      return false;
    }
    
    if (!newPassword.trim()) {
      setError('New password is required');
      return false;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSave = () => {
    if (validatePasswords()) {
      onSave(currentPassword, newPassword);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showCurrentPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#718096" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showNewPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#718096" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#718096" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: SIZES.base * 2,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: SIZES.radius,
    padding: SIZES.base * 3,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.base * 3,
  },
  modalTitle: {
    fontSize: SIZES.h2,
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    padding: SIZES.base,
  },
  inputContainer: {
    marginBottom: SIZES.base * 2,
  },
  inputLabel: {
    fontSize: SIZES.body,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: SIZES.radius,
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    padding: SIZES.base * 1.5,
    fontSize: SIZES.body,
    color: COLORS.text,
  },
  eyeIcon: {
    padding: SIZES.base * 1.5,
  },
  errorText: {
    color: COLORS.accent,
    fontSize: SIZES.small,
    marginBottom: SIZES.base * 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: SIZES.base * 1.5,
    marginRight: SIZES.base,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: SIZES.body,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SIZES.base * 1.5,
    paddingHorizontal: SIZES.base * 3,
    borderRadius: SIZES.radius,
  },
  saveButtonText: {
    color: 'white',
    fontSize: SIZES.body,
    fontWeight: '500',
  },
});

export default ChangePasswordModal; 